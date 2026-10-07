// Package server wires the khatru relay: BoltDB eventstore, policy
// hooks, NIP-42 auth challenge, health endpoint, SPA statics.
package server

import (
	"context"
	"net/http"
	"time"

	"fiatjaf.com/nostr"
	"fiatjaf.com/nostr/eventstore/boltdb"
	"fiatjaf.com/nostr/khatru"
	"fyi.klk/relay/internal/lookup"
	"fyi.klk/relay/internal/policy"
)

// New returns an http.Handler for the relay + app endpoints, plus a
// cleanup func. dbPath is the BoltDB file; staticDir serves the PWA
// dist (empty = relay only).
func New(dbPath, staticDir string) (http.Handler, func(), error) {
	db := &boltdb.BoltBackend{Path: dbPath, MapSize: 1 << 30}
	if err := db.Init(); err != nil {
		return nil, nil, err
	}

	store := &lookup.Store{ES: db}
	rl := khatru.NewRelay()
	rl.Info.Name = "klk"
	rl.Info.Description = "klk application relay"
	rl.Info.Software = "fyi.klk/relay"
	rl.UseEventstore(db, 500)

	// delegated (agent) writes get a per-agent quota on top of the ACL
	agentWrites := policy.NewRateLimiter(60, time.Hour)
	rl.OnEvent = func(ctx context.Context, ev nostr.Event) (bool, string) {
		if reject, msg := policy.CheckStore(ctx, ev, store); reject {
			return reject, msg
		}
		if policy.IsDelegated(ev) && !agentWrites.Allow(ev.PubKey) {
			return true, "rate-limited: delegated write quota exceeded"
		}
		return false, ""
	}
	rl.OnRequest = func(ctx context.Context, f nostr.Filter) (bool, string) {
		return policy.CheckRequest(ctx, f, store)
	}
	// reads need auth → trigger the NIP-42 challenge on connect
	rl.OnConnect = func(ctx context.Context) { khatru.RequestAuth(ctx) }

	mux := rl.Router()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	if staticDir != "" {
		mux.Handle("/", spaHandler(staticDir))
	}

	return rl, func() { db.Close() }, nil
}
