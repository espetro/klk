// Assistant proxy (spec docs/spec/2026-10-08-ai-integration.md §3.1/§6):
// POST /api/ai/chat — NIP-98 authed, members of hosted circles only,
// per-member budgets in BoltDB, pass-through proxy to an
// OpenAI-compatible upstream. The relay is the policy point: tier gate,
// rate/token budget, request clamps, one in-flight per member.
package server

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"fiatjaf.com/nostr"
	"fyi.klk/relay/internal/policy"
	"go.etcd.io/bbolt"
)

// AIConfig wires the managed assistant path. UpstreamURL is an
// OpenAI-compatible chat-completions endpoint; UpstreamKey is the
// server-held client key. Enabled=false is the kill switch (503).
type AIConfig struct {
	Enabled     bool
	UpstreamURL string
	UpstreamKey string
}

const (
	aiMaxBodyBytes     = 32 << 10 // envelope ceiling; messages clamp is tighter
	aiMaxMessagesBytes = 8 << 10  // spec §6: serialized messages ≤ 8 KB
	aiMaxTokens        = 1024     // spec §6 request clamp
	aiUpstreamTimeout  = 30 * time.Second
	aiRequestsPerHour  = 20
	aiTokensPerDay     = 50000
	nip98Window        = 15 * time.Minute
)

// aiBudget persists per-member token counters (bucket "tokens", key
// "<day>|<pubkeyhex>") and holds the sliding-window request limiter
// plus the one-in-flight-per-member lock in memory.
type aiBudget struct {
	db *bbolt.DB
	rl *policy.RateLimiter

	mu       sync.Mutex
	inflight map[nostr.PubKey]bool
}

func openAIBudget(path string) (*aiBudget, error) {
	db, err := bbolt.Open(path, 0o600, &bbolt.Options{Timeout: 2 * time.Second})
	if err != nil {
		return nil, err
	}
	if err := db.Update(func(tx *bbolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists([]byte("tokens"))
		return err
	}); err != nil {
		db.Close()
		return nil, err
	}
	return &aiBudget{
		db:       db,
		rl:       policy.NewRateLimiter(aiRequestsPerHour, time.Hour),
		inflight: map[nostr.PubKey]bool{},
	}, nil
}

func (b *aiBudget) Close() { _ = b.db.Close() }

func dayKey(pk nostr.PubKey) []byte {
	return []byte(time.Now().UTC().Format("2006-01-02") + "|" + pk.Hex())
}

func (b *aiBudget) tokensToday(pk nostr.PubKey) uint64 {
	var n uint64
	_ = b.db.View(func(tx *bbolt.Tx) error {
		v := tx.Bucket([]byte("tokens")).Get(dayKey(pk))
		if len(v) > 0 {
			n, _ = strconv.ParseUint(string(v), 10, 64)
		}
		return nil
	})
	return n
}

func (b *aiBudget) addTokens(pk nostr.PubKey, n uint64) {
	if n == 0 {
		return
	}
	key := dayKey(pk)
	_ = b.db.Update(func(tx *bbolt.Tx) error {
		bkt := tx.Bucket([]byte("tokens"))
		var cur uint64
		if v := bkt.Get(key); len(v) > 0 {
			cur, _ = strconv.ParseUint(string(v), 10, 64)
		}
		return bkt.Put(key, []byte(strconv.FormatUint(cur+n, 10)))
	})
}

// tryAcquire enforces a single in-flight managed request per member.
func (b *aiBudget) tryAcquire(pk nostr.PubKey) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.inflight[pk] {
		return false
	}
	b.inflight[pk] = true
	return true
}

func (b *aiBudget) release(pk nostr.PubKey) {
	b.mu.Lock()
	defer b.mu.Unlock()
	delete(b.inflight, pk)
}

// aiRequest is the client envelope: an OpenAI-compatible chat request
// plus the circle coordinate the call is scoped to (policy input,
// stripped before proxying upstream).
type aiRequest struct {
	Circle    string          `json:"circle"`
	Messages  json.RawMessage `json:"messages"`
	MaxTokens int             `json:"max_tokens"`
}

func aiErr(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"error": map[string]any{"message": msg, "type": "pinya_ai_error"},
	})
}

// verifyNIP98 validates the Authorization: Nostr <base64-event> header
// against the request: kind 27235, fresh, valid signature, `u` tag
// matching this endpoint (scheme-insensitive) and `payload` tag matching
// the sha256 of the raw body.
func verifyNIP98(r *http.Request, body []byte) (nostr.PubKey, error) {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Nostr ") {
		return nostr.PubKey{}, fmt.Errorf("missing Nostr authorization")
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(h, "Nostr "))
	if err != nil {
		return nostr.PubKey{}, fmt.Errorf("bad authorization encoding")
	}
	var ev nostr.Event
	if err := json.Unmarshal(raw, &ev); err != nil {
		return nostr.PubKey{}, fmt.Errorf("bad authorization event")
	}
	if ev.Kind != nostr.KindHTTPAuth {
		return nostr.PubKey{}, fmt.Errorf("authorization event must be kind 27235")
	}
	if !ev.VerifySignature() {
		return nostr.PubKey{}, fmt.Errorf("bad event signature")
	}
	now := time.Now()
	signedAt := ev.CreatedAt.Time()
	if signedAt.Before(now.Add(-nip98Window)) || signedAt.After(now.Add(nip98Window)) {
		return nostr.PubKey{}, fmt.Errorf("stale authorization event")
	}

	uTag := ""
	payloadTag := ""
	for _, tag := range ev.Tags {
		if len(tag) < 2 {
			continue
		}
		switch tag[0] {
		case "u":
			uTag = tag[1]
		case "payload":
			payloadTag = tag[1]
		}
	}
	if uTag == "" {
		return nostr.PubKey{}, fmt.Errorf("authorization event missing u tag")
	}
	signed, err := url.Parse(uTag)
	if err != nil {
		return nostr.PubKey{}, fmt.Errorf("bad u tag")
	}
	// scheme-insensitive compare: TLS terminates at the tunnel edge, so
	// the relay may see http while the client signed https.
	if signed.Host != r.Host || signed.Path != r.URL.Path {
		return nostr.PubKey{}, fmt.Errorf("u tag does not match this endpoint")
	}
	sum := sha256.Sum256(body)
	if payloadTag == "" || !strings.EqualFold(payloadTag, hex.EncodeToString(sum[:])) {
		return nostr.PubKey{}, fmt.Errorf("payload tag mismatch")
	}
	return ev.PubKey, nil
}

func tierOf(def nostr.Event) string {
	for _, tag := range def.Tags {
		if len(tag) >= 2 && tag[0] == "tier" {
			return tag[1]
		}
	}
	return ""
}

// aiHandler serves POST /api/ai/chat per spec §3.1.
func aiHandler(store policy.Store, cfg AIConfig, budget *aiBudget) http.HandlerFunc {
	client := &http.Client{Timeout: aiUpstreamTimeout}
	upstreamURL := cfg.UpstreamURL
	if upstreamURL == "" {
		upstreamURL = "https://api.illo.fyi/v1/chat/completions"
	}

	return func(w http.ResponseWriter, r *http.Request) {
		if !cfg.Enabled {
			aiErr(w, http.StatusServiceUnavailable, "AI is disabled on this server")
			return
		}

		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, aiMaxBodyBytes))
		if err != nil {
			aiErr(w, http.StatusBadRequest, "request too large")
			return
		}

		pk, err := verifyNIP98(r, body)
		if err != nil {
			aiErr(w, http.StatusUnauthorized, err.Error())
			return
		}

		var in aiRequest
		if err := json.Unmarshal(body, &in); err != nil || len(in.Messages) == 0 {
			aiErr(w, http.StatusBadRequest, "bad chat request")
			return
		}
		if in.Circle == "" {
			aiErr(w, http.StatusBadRequest, "missing circle scope")
			return
		}
		coord, err := nostr.ParseAddrString(in.Circle)
		if err != nil || coord.Kind != policy.KindCircle {
			aiErr(w, http.StatusBadRequest, "bad circle coordinate")
			return
		}

		def, ok := store.CircleDef(r.Context(), coord)
		if !ok {
			aiErr(w, http.StatusForbidden, "circle does not exist")
			return
		}
		if tierOf(def) != "hosted" {
			aiErr(w, http.StatusForbidden, "managed AI is only available on hosted circles")
			return
		}
		if !policy.IsMember(r.Context(), store, coord, pk) {
			aiErr(w, http.StatusForbidden, "not a member of that circle")
			return
		}

		if !budget.rl.Allow(pk) {
			aiErr(w, http.StatusTooManyRequests, "too many AI requests — try again later")
			return
		}
		if budget.tokensToday(pk) >= aiTokensPerDay {
			aiErr(w, http.StatusTooManyRequests, "daily AI budget reached — try again tomorrow")
			return
		}
		if !budget.tryAcquire(pk) {
			aiErr(w, http.StatusTooManyRequests, "finish your current AI request first")
			return
		}
		defer budget.release(pk)

		// rebuild the upstream payload: drop the circle scope, enforce
		// the messages-size and max_tokens clamps
		if len(in.Messages) > aiMaxMessagesBytes {
			aiErr(w, http.StatusBadRequest, "messages too large")
			return
		}
		var raw map[string]json.RawMessage
		if err := json.Unmarshal(body, &raw); err != nil {
			aiErr(w, http.StatusBadRequest, "bad chat request")
			return
		}
		delete(raw, "circle")
		maxTokens := in.MaxTokens
		if maxTokens <= 0 || maxTokens > aiMaxTokens {
			maxTokens = aiMaxTokens
		}
		mt, _ := json.Marshal(maxTokens)
		raw["max_tokens"] = mt
		upstreamBody, err := json.Marshal(raw)
		if err != nil {
			aiErr(w, http.StatusBadRequest, "bad chat request")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), aiUpstreamTimeout)
		defer cancel()
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, upstreamURL, bytes.NewReader(upstreamBody))
		if err != nil {
			aiErr(w, http.StatusBadGateway, "upstream unavailable")
			return
		}
		req.Header.Set("Content-Type", "application/json")
		if cfg.UpstreamKey != "" {
			req.Header.Set("Authorization", "Bearer "+cfg.UpstreamKey)
		}
		// per-user cost attribution without identity: hash of the member
		// pubkey, per spec §3.1
		fp := sha256.Sum256(pk[:])
		meta, _ := json.Marshal(map[string]string{"client": "klk", "u": hex.EncodeToString(fp[:8])})
		req.Header.Set("cf-aig-metadata", string(meta))

		resp, err := client.Do(req)
		if err != nil {
			aiErr(w, http.StatusBadGateway, "upstream request failed")
			return
		}
		defer resp.Body.Close()

		streaming := strings.Contains(resp.Header.Get("Content-Type"), "text/event-stream")
		for _, h := range []string{"Content-Type", "Cache-Control"} {
			if v := resp.Header.Get(h); v != "" {
				w.Header().Set(h, v)
			}
		}
		w.WriteHeader(resp.StatusCode)

		if resp.StatusCode != http.StatusOK {
			_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<20))
			return
		}

		if streaming {
			// SSE pass-through; usage rarely present on streams — estimate
			// chars/4 over everything we forward (spec §6)
			var counted int64
			tee := io.TeeReader(resp.Body, countWriter{&counted})
			_, _ = io.Copy(flushWriter{w}, tee)
			budget.addTokens(pk, uint64(counted/4))
			return
		}

		payload, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
		if err != nil {
			return
		}
		_, _ = w.Write(payload)
		var usage struct {
			Usage struct {
				TotalTokens      uint64 `json:"total_tokens"`
				PromptTokens     uint64 `json:"prompt_tokens"`
				CompletionTokens uint64 `json:"completion_tokens"`
			} `json:"usage"`
		}
		if json.Unmarshal(payload, &usage) == nil {
			n := usage.Usage.TotalTokens
			if n == 0 {
				n = usage.Usage.PromptTokens + usage.Usage.CompletionTokens
			}
			budget.addTokens(pk, n)
		}
	}
}

type countWriter struct{ n *int64 }

func (c countWriter) Write(p []byte) (int, error) {
	*c.n += int64(len(p))
	return len(p), nil
}

// flushWriter flushes after every write so SSE reaches the client
// incrementally instead of at close.
type flushWriter struct{ w http.ResponseWriter }

func (f flushWriter) Write(p []byte) (int, error) {
	n, err := f.w.Write(p)
	if fl, ok := f.w.(http.Flusher); ok {
		fl.Flush()
	}
	return n, err
}
