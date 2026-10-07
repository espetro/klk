// klk-seed: publishes a demo circle + event + RSVP to a running relay so
// `docker compose up` lands on a populated app. Deterministic demo
// identity; safe to re-run (addressable events just replace).
package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"fiatjaf.com/nostr"
	"fyi.klk/relay/internal/policy"
)

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func main() {
	url := envOr("RELAY_URL", "ws://localhost:3334")

	// deterministic demo identity — fine for seed data
	sk := nostr.MustSecretKeyFromHex("1111111111111111111111111111111111111111111111111111111111111111")
	pk := nostr.GetPublicKey(sk)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	rl, err := nostr.RelayConnect(ctx, url, nostr.RelayOptions{
		AuthHandler: func(_ context.Context, _ *nostr.Relay, ev *nostr.Event) error {
			return ev.Sign(sk)
		},
	})
	if err != nil {
		log.Fatalf("connect %s: %v", url, err)
	}
	defer rl.Close()

	coord := "31950:" + pk.Hex() + ":demo"
	pub := func(ev nostr.Event) {
		if err := ev.Sign(sk); err != nil {
			log.Fatalf("sign: %v", err)
		}
		if err := rl.Publish(ctx, ev); err != nil {
			log.Fatalf("publish kind %d: %v", ev.Kind, err)
		}
	}

	pub(nostr.Event{
		Kind:      policy.KindCircle,
		CreatedAt: nostr.Now(),
		Content:   `{"name":"Demo Circle","tier":"hosted"}`,
		Tags: nostr.Tags{
			{"d", "demo"},
			{"invite", "demo-invite-secret"},
			{"tier", "hosted"},
		},
	})
	pub(nostr.Event{
		Kind:      policy.KindCircleMember,
		CreatedAt: nostr.Now(),
		Tags:      nostr.Tags{{"a", coord}},
	})
	// give the store a beat to index the claim before scoped writes
	time.Sleep(200 * time.Millisecond)

	starts := time.Now().Add(24 * time.Hour).Unix()
	ends := starts + 2*3600
	ev := nostr.Event{
		Kind:      policy.KindCalendarEvent,
		CreatedAt: nostr.Now(),
		Content:   `{"summary":"Seeded by klk-seed — delete me when you're real."}`,
		Tags: nostr.Tags{
			{"d", "demo-picnic"},
			{"a", coord},
			{"title", "Demo picnic"},
			{"start", strconv.FormatInt(starts, 10)},
			{"end", strconv.FormatInt(ends, 10)},
			{"location", "Parc de la Ciutadella"},
			{"g", "41.3874,2.1686"},
		},
	}
	pub(ev)
	pub(nostr.Event{
		Kind:      policy.KindRSVP,
		CreatedAt: nostr.Now(),
		Tags: nostr.Tags{
			{"e", ev.ID.Hex()},
			{"a", coord},
			{"status", "yes"},
		},
	})

	join := base64.RawURLEncoding.EncodeToString(
		[]byte(fmt.Sprintf(`{"c":%q,"i":%q}`, coord, "demo-invite-secret")),
	)
	log.Printf("seeded circle %s", coord)
	log.Printf("join link: <app-base>/join#%s", join)
}
