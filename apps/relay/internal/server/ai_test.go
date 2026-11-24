// E2E for the managed assistant proxy: NIP-98 auth, tier + membership
// gates, budget enforcement, upstream forwarding.
package server_test

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"fiatjaf.com/nostr"
	"fyi.klk/relay/internal/policy"
	"fyi.klk/relay/internal/server"
)

// upstreamStub is a canned OpenAI-compatible endpoint that echoes a
// fixed completion and records the last auth metadata it saw.
type upstreamStub struct {
	srv         *httptest.Server
	lastMeta    string
	lastAuth    string
	lastMaxToks int
	sawCircle   bool
}

func newUpstreamStub(t *testing.T) *upstreamStub {
	t.Helper()
	u := &upstreamStub{}
	u.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u.lastMeta = r.Header.Get("cf-aig-metadata")
		u.lastAuth = r.Header.Get("Authorization")
		var body map[string]json.RawMessage
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &body)
		if _, ok := body["circle"]; ok {
			u.sawCircle = true
		}
		if mt, ok := body["max_tokens"]; ok {
			_ = json.Unmarshal(mt, &u.lastMaxToks)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"hi there"}}],"usage":{"total_tokens":123,"prompt_tokens":100,"completion_tokens":23}}`))
	}))
	t.Cleanup(u.srv.Close)
	return u
}

func nip98Header(t *testing.T, sk nostr.SecretKey, url string, body []byte) string {
	t.Helper()
	sum := sha256.Sum256(body)
	ev := nostr.Event{
		Kind:      nostr.KindHTTPAuth,
		CreatedAt: nostr.Now(),
		Content:   "",
		Tags: nostr.Tags{
			{"u", url},
			{"payload", hex.EncodeToString(sum[:])},
		},
	}
	if err := ev.Sign(sk); err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(ev)
	if err != nil {
		t.Fatal(err)
	}
	return "Nostr " + base64.StdEncoding.EncodeToString(raw)
}

func postAI(t *testing.T, url string, header string, body string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodPost, url+"/api/ai/chat", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	if header != "" {
		req.Header.Set("Authorization", header)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	return resp
}

func aiChatBody(coord string, maxTokens int) string {
	return `{"circle":"` + coord + `","model":"whatever","max_tokens":` +
		jsonNumber(maxTokens) +
		`,"messages":[{"role":"user","content":"hello"}]}`
}

func jsonNumber(n int) string {
	out, _ := json.Marshal(n)
	return string(out)
}

// setupAICircle boots a relay with the AI proxy pointed at the stub
// upstream and publishes a hosted circle owned by ownerSK.
func setupAICircle(t *testing.T, upstreamURL string) (ts *httptest.Server, coord string, ownerSK, memberSK nostr.SecretKey) {
	t.Helper()
	handler, cleanup, err := server.New(t.TempDir()+"/events.bolt", "", server.AIConfig{
		Enabled:     true,
		UpstreamURL: upstreamURL,
		UpstreamKey: "server-key",
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(cleanup)
	ts = httptest.NewServer(handler)
	t.Cleanup(ts.Close)
	wsURL := "ws" + strings.TrimPrefix(ts.URL, "http")

	ownerSK = nostr.Generate()
	memberSK = nostr.Generate()
	ownerPK := nostr.GetPublicKey(ownerSK)
	coord = "31950:" + ownerPK.Hex() + ":ai-crew"

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	owner := connect(t, wsURL, ownerSK)
	member := connect(t, wsURL, memberSK)

	def := sign(ownerSK, nostr.Event{
		Kind:      policy.KindCircle,
		CreatedAt: nostr.Now(),
		Content:   `{"name":"AI Crew","tier":"hosted"}`,
		Tags:      nostr.Tags{{"d", "ai-crew"}, {"invite", "sesame"}, {"tier", "hosted"}},
	})
	if err := owner.Publish(ctx, def); err != nil {
		t.Fatalf("circle def: %v", err)
	}
	claim := sign(memberSK, nostr.Event{
		Kind:      policy.KindCircleMember,
		CreatedAt: nostr.Now(),
		Tags:      nostr.Tags{{"a", coord}, {"invite", "sesame"}},
	})
	if err := member.Publish(ctx, claim); err != nil {
		t.Fatalf("member claim: %v", err)
	}
	return ts, coord, ownerSK, memberSK
}

func TestAIChatManaged(t *testing.T) {
	upstream := newUpstreamStub(t)
	ts, coord, _, memberSK := setupAICircle(t, upstream.srv.URL)

	body := aiChatBody(coord, 2000) // over the clamp — must be rewritten to 1024
	header := nip98Header(t, memberSK, ts.URL+"/api/ai/chat", []byte(body))
	resp := postAI(t, ts.URL, header, body)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(resp.Body)
		t.Fatalf("status %d: %s", resp.StatusCode, raw)
	}
	payload, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(payload), "hi there") {
		t.Fatalf("upstream response not forwarded: %s", payload)
	}
	if upstream.lastAuth != "Bearer server-key" {
		t.Fatalf("upstream auth missing: %q", upstream.lastAuth)
	}
	if upstream.sawCircle {
		t.Fatal("circle scope leaked upstream")
	}
	if upstream.lastMaxToks != 1024 {
		t.Fatalf("max_tokens clamp not applied: %d", upstream.lastMaxToks)
	}
	if !strings.Contains(upstream.lastMeta, `"client":"klk"`) {
		t.Fatalf("cf-aig-metadata missing client tag: %q", upstream.lastMeta)
	}
}

func TestAIChatGates(t *testing.T) {
	upstream := newUpstreamStub(t)
	ts, coord, _, memberSK := setupAICircle(t, upstream.srv.URL)
	straySK := nostr.Generate()

	cases := []struct {
		name   string
		sk     nostr.SecretKey
		body   string
		header bool
		want   int
	}{
		{"no auth header", memberSK, aiChatBody(coord, 100), false, http.StatusUnauthorized},
		{"non-member", straySK, aiChatBody(coord, 100), true, http.StatusForbidden},
		{"missing circle", memberSK, `{"messages":[{"role":"user","content":"x"}]}`, true, http.StatusBadRequest},
		{"bad circle coord", memberSK, aiChatBody("31950:deadbeef:x", 100), true, http.StatusBadRequest},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			header := ""
			if tc.header {
				header = nip98Header(t, tc.sk, ts.URL+"/api/ai/chat", []byte(tc.body))
			}
			resp := postAI(t, ts.URL, header, tc.body)
			defer resp.Body.Close()
			if resp.StatusCode != tc.want {
				raw, _ := io.ReadAll(resp.Body)
				t.Fatalf("want %d got %d: %s", tc.want, resp.StatusCode, raw)
			}
		})
	}
}

func TestAIChatSealedCircleRejected(t *testing.T) {
	upstream := newUpstreamStub(t)
	ts, coord, ownerSK, _ := setupAICircle(t, upstream.srv.URL)
	// re-publish the same circle as sealed — addressable replace
	ownerPK := nostr.GetPublicKey(ownerSK)
	_ = ownerPK
	wsURL := "ws" + strings.TrimPrefix(ts.URL, "http")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	owner := connect(t, wsURL, ownerSK)
	sealed := sign(ownerSK, nostr.Event{
		Kind:      policy.KindCircle,
		CreatedAt: nostr.Now() + 1,
		Content:   "sealed-blob",
		Tags:      nostr.Tags{{"d", "ai-crew"}, {"invite", "sesame"}, {"tier", "sealed"}},
	})
	if err := owner.Publish(ctx, sealed); err != nil {
		t.Fatalf("sealed def: %v", err)
	}

	body := aiChatBody(coord, 100)
	header := nip98Header(t, ownerSK, ts.URL+"/api/ai/chat", []byte(body))
	resp := postAI(t, ts.URL, header, body)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		raw, _ := io.ReadAll(resp.Body)
		t.Fatalf("sealed circle must reject managed AI, got %d: %s", resp.StatusCode, raw)
	}
}

func TestAIChatDisabled(t *testing.T) {
	handler, cleanup, err := server.New(t.TempDir()+"/events.bolt", "", server.AIConfig{Enabled: false})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(cleanup)
	ts := httptest.NewServer(handler)
	defer ts.Close()

	body := aiChatBody("31950:aa:x", 100)
	sk := nostr.Generate()
	header := nip98Header(t, sk, ts.URL+"/api/ai/chat", []byte(body))
	resp := postAI(t, ts.URL, header, body)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("disabled AI must 503, got %d", resp.StatusCode)
	}
}

func TestAIChatBadPayloadHash(t *testing.T) {
	upstream := newUpstreamStub(t)
	ts, coord, _, memberSK := setupAICircle(t, upstream.srv.URL)

	body := aiChatBody(coord, 100)
	header := nip98Header(t, memberSK, ts.URL+"/api/ai/chat", []byte(body))
	// send a different body than the one the payload hash covers
	resp := postAI(t, ts.URL, header, aiChatBody(coord, 200))
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("payload mismatch must 401, got %d", resp.StatusCode)
	}
}
