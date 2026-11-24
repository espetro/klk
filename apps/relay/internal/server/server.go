// Package server wires the khatru relay: BoltDB eventstore, policy
// hooks, NIP-42 auth challenge, health endpoint, SPA statics.
package server

import (
	"context"
	"net/http"
	"path/filepath"
	"time"

	"fiatjaf.com/nostr"
	"fiatjaf.com/nostr/eventstore/boltdb"
	"fiatjaf.com/nostr/khatru"
	"fyi.klk/relay/internal/lookup"
	"fyi.klk/relay/internal/policy"
)

// New returns an http.Handler for the relay + app endpoints, plus a
// cleanup func. dbPath is the BoltDB file; staticDir serves the PWA
// dist (empty = relay only). aiCfg wires the managed assistant proxy
// (POST /api/ai/chat); the per-member budget lives in ai.bolt beside
// the event store.
func New(dbPath, staticDir string, aiCfg AIConfig) (http.Handler, func(), error) {
	db := &boltdb.BoltBackend{Path: dbPath, MapSize: 1 << 30}
	if err := db.Init(); err != nil {
		return nil, nil, err
	}

	budget, err := openAIBudget(filepath.Join(filepath.Dir(dbPath), "ai.bolt"))
	if err != nil {
		db.Close()
		return nil, nil, err
	}
	store := &lookup.Store{ES: db}
	rl := khatru.NewRelay()
	rl.Info.Name = "pinya"
	rl.Info.Description = "pinya application relay"
	rl.Info.Software = "fyi.klk/relay"
	rl.UseEventstore(db, 500)

	// delegated (agent) writes get per-capability quotas on top of the
	// ACL — buckets keyed (cap, agent) so a chatty rsvp agent can't
	// starve its own postEvent quota; reads get their own heavier bucket
	// that doesn't share the delegated-write window (spec §5)
	agentWrites := policy.NewCapLimiter(map[string]int{
		policy.CapPostEvent: 60,
		policy.CapSetRsvp:   120,
	}, time.Hour)
	agentReads := policy.NewRateLimiter(240, time.Hour)
	rl.OnEvent = func(ctx context.Context, ev nostr.Event) (bool, string) {
		if reject, msg := policy.CheckStore(ctx, ev, store); reject {
			return reject, msg
		}
		if policy.IsDelegated(ev) && !agentWrites.Allow(ev.PubKey, policy.WriteCap(ev.Kind)) {
			return true, "rate-limited: delegated write quota exceeded"
		}
		return false, ""
	}
	rl.OnRequest = func(ctx context.Context, f nostr.Filter) (bool, string) {
		if reject, msg := policy.CheckRequest(ctx, f, store); reject {
			return reject, msg
		}
		// any circle the requester reads without being a member is a
		// delegated read — quota it separately (and heavily)
		if authed, ok := khatru.GetAuthed(ctx); ok {
			for _, ref := range policy.RequestCircles(f) {
				if !policy.IsMember(ctx, store, ref, authed) {
					if !agentReads.Allow(authed) {
						return true, "rate-limited: delegated read quota exceeded"
					}
					break
				}
			}
		}
		return false, ""
	}
	// reads need auth → trigger the NIP-42 challenge on connect
	rl.OnConnect = func(ctx context.Context) { khatru.RequestAuth(ctx) }

	mux := rl.Router()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("GET /ics/{owner}/{slug}", icsFeed(store))
	mux.HandleFunc("POST /api/cohort", cohortHandler(filepath.Dir(dbPath)))
	mux.HandleFunc("POST /api/ai/chat", aiHandler(store, aiCfg, budget))
	if staticDir != "" {
		mux.Handle("/", spaHandler(staticDir))
	}

	return rl, func() {
		db.Close()
		budget.Close()
	}, nil
}
