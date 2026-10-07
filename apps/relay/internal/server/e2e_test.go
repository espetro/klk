// E2E: boot the real relay on httptest and walk the v0 loop —
// create circle → join via invite → post event → RSVP — checking the
// ACLs hold for members and strays.
package server_test

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"fiatjaf.com/nostr"
	"fyi.klk/relay/internal/policy"
	"fyi.klk/relay/internal/server"
)

func connect(t *testing.T, url string, sk nostr.SecretKey) *nostr.Relay {
	t.Helper()
	rl, err := nostr.RelayConnect(context.Background(), url, nostr.RelayOptions{
		AuthHandler: func(ctx context.Context, _ *nostr.Relay, evt *nostr.Event) error {
			return evt.Sign(sk)
		},
	})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(func() { rl.Close() })
	return rl
}

func sign(sk nostr.SecretKey, ev nostr.Event) nostr.Event {
	if err := ev.Sign(sk); err != nil {
		panic(err)
	}
	return ev
}

func TestV0Loop(t *testing.T) {
	handler, cleanup, err := server.New(t.TempDir()+"/events.bolt", "")
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	ts := httptest.NewServer(handler)
	defer ts.Close()
	url := "ws" + strings.TrimPrefix(ts.URL, "http")

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	ownerSK := nostr.Generate()
	ownerPK := nostr.GetPublicKey(ownerSK)
	memberSK := nostr.Generate()
	memberPK := nostr.GetPublicKey(memberSK)
	straySK := nostr.Generate()

	owner := connect(t, url, ownerSK)
	member := connect(t, url, memberSK)
	stray := connect(t, url, straySK)

	circleCoord := "31950:" + ownerPK.Hex() + ":weekend-crew"

	// 1. owner creates the circle
	circleDef := sign(ownerSK, nostr.Event{
		Kind:      policy.KindCircle,
		CreatedAt: nostr.Now(),
		Content:   `{"name":"Weekend Crew","tier":"hosted"}`,
		Tags:      nostr.Tags{{"d", "weekend-crew"}, {"invite", "open-sesame"}},
	})
	if err := owner.Publish(ctx, circleDef); err != nil {
		t.Fatalf("circle def publish: %v", err)
	}

	// 2. member joins via invite secret; stray tries with a wrong one
	claim := sign(memberSK, nostr.Event{
		Kind:      policy.KindCircleMember,
		CreatedAt: nostr.Now(),
		Tags:      nostr.Tags{{"a", circleCoord}, {"invite", "open-sesame"}},
	})
	if err := member.Publish(ctx, claim); err != nil {
		t.Fatalf("member claim publish: %v", err)
	}
	bad := sign(straySK, nostr.Event{
		Kind:      policy.KindCircleMember,
		CreatedAt: nostr.Now(),
		Tags:      nostr.Tags{{"a", circleCoord}, {"invite", "nope"}},
	})
	if err := stray.Publish(ctx, bad); err == nil {
		t.Fatal("stray claim with wrong invite should be rejected")
	}

	// 3. member posts a calendar event into the circle
	event := sign(memberSK, nostr.Event{
		Kind:      policy.KindCalendarEvent,
		CreatedAt: nostr.Now(),
		Content:   `{"title":"Park picnic","starts":1790000000}`,
		Tags:      nostr.Tags{{"d", "picnic-1"}, {"a", circleCoord}},
	})
	if err := member.Publish(ctx, event); err != nil {
		t.Fatalf("event publish: %v", err)
	}
	if err := stray.Publish(ctx, sign(straySK, nostr.Event{
		Kind:      policy.KindCalendarEvent,
		CreatedAt: nostr.Now(),
		Content:   `{"title":"bogus"}`,
		Tags:      nostr.Tags{{"d", "bogus"}, {"a", circleCoord}},
	})); err == nil {
		t.Fatal("stray event should be rejected")
	}

	// 4. member RSVPs
	rsvp := sign(memberSK, nostr.Event{
		Kind:      policy.KindRSVP,
		CreatedAt: nostr.Now(),
		Content:   `{"status":"yes"}`,
		Tags:      nostr.Tags{{"e", event.ID.Hex()}, {"a", circleCoord}},
	})
	if err := member.Publish(ctx, rsvp); err != nil {
		t.Fatalf("rsvp publish: %v", err)
	}

	// 5. member can read the circle's events; stray cannot
	sub, err := member.Subscribe(ctx, nostr.Filter{
		Kinds: []nostr.Kind{policy.KindCalendarEvent},
		Tags:  nostr.TagMap{"a": []string{circleCoord}},
	}, nostr.SubscriptionOptions{})
	if err != nil {
		t.Fatalf("member subscribe: %v", err)
	}
	got := false
	for {
		select {
		case ev := <-sub.Events:
			if ev.ID == event.ID {
				got = true
			}
		case <-sub.EndOfStoredEvents:
			if !got {
				t.Fatal("member did not receive the circle event")
			}
			goto memberReadDone
		}
	}
memberReadDone:
	straySub, err := stray.Subscribe(ctx, nostr.Filter{
		Kinds: []nostr.Kind{policy.KindCalendarEvent},
		Tags:  nostr.TagMap{"a": []string{circleCoord}},
	}, nostr.SubscriptionOptions{})
	if err != nil {
		t.Fatalf("stray subscribe call failed: %v", err)
	}
	select {
	case reason := <-straySub.ClosedReason:
		if !strings.Contains(reason, "restricted") {
			t.Fatalf("stray sub closed for wrong reason: %s", reason)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("stray subscribe to circle should be closed as restricted")
	}

	// unauthed reads are rejected outright (connect with no signer)
	anon := connect(t, url, nostr.SecretKey{})
	// overwrite the handler so it can't sign — AuthHandler with a zero
	// key still signs, so use a relay without AuthHandler instead
	_ = anon.Close()
	raw, err := nostr.RelayConnect(ctx, url, nostr.RelayOptions{})
	if err != nil {
		t.Fatalf("anon connect: %v", err)
	}
	defer raw.Close()
	anonSub, err := raw.Subscribe(ctx, nostr.Filter{Kinds: []nostr.Kind{policy.KindCalendarEvent}}, nostr.SubscriptionOptions{})
	if err != nil {
		t.Fatalf("anon subscribe call failed: %v", err)
	}
	select {
	case reason := <-anonSub.ClosedReason:
		if !strings.Contains(reason, "auth-required") {
			t.Fatalf("anon sub closed for wrong reason: %s", reason)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("anonymous subscribe should be auth-required")
	}

	// owner sees the member in the circle
	sub2, err := owner.Subscribe(ctx, nostr.Filter{
		Kinds: []nostr.Kind{policy.KindCircleMember},
		Tags:  nostr.TagMap{"a": []string{circleCoord}},
	}, nostr.SubscriptionOptions{})
	if err != nil {
		t.Fatalf("owner member-list subscribe: %v", err)
	}
	sawMember := false
	for {
		select {
		case ev := <-sub2.Events:
			if ev.PubKey == memberPK {
				sawMember = true
			}
		case <-sub2.EndOfStoredEvents:
			if !sawMember {
				t.Fatal("owner did not see member claim")
			}
			return
		}
	}
}
