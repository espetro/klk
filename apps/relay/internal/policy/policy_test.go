package policy

import (
	"context"
	"testing"

	"fiatjaf.com/nostr"
)

type fakeStore struct {
	defs   map[string]nostr.Event
	claims map[string]bool
}

func (f *fakeStore) CircleDef(_ context.Context, c nostr.EntityPointer) (nostr.Event, bool) {
	e, ok := f.defs[coordKey(c)]
	return e, ok
}
func (f *fakeStore) HasMemberClaim(_ context.Context, c nostr.EntityPointer, pk nostr.PubKey) bool {
	return f.claims[coordKey(c)+"|"+pk.Hex()]
}

func coordKey(c nostr.EntityPointer) string {
	return c.PublicKey.Hex() + ":" + c.Identifier
}

var (
	owner  = nostr.MustPubKeyFromHex("0000000000000000000000000000000000000000000000000000000000000001")
	member = nostr.MustPubKeyFromHex("0000000000000000000000000000000000000000000000000000000000000002")
	stray  = nostr.MustPubKeyFromHex("0000000000000000000000000000000000000000000000000000000000000003")
)

func circleDefEv() nostr.Event {
	return nostr.Event{
		Kind:   KindCircle,
		PubKey: owner,
		Tags: nostr.Tags{
			{"d", "abc"},
			{"invite", "sekret"},
		},
	}
}

func circleCoord() nostr.EntityPointer {
	return nostr.EntityPointer{Kind: KindCircle, PublicKey: owner, Identifier: "abc"}
}

func st() *fakeStore {
	return &fakeStore{
		defs:   map[string]nostr.Event{coordKey(circleCoord()): circleDefEv()},
		claims: map[string]bool{coordKey(circleCoord()) + "|" + member.Hex(): true},
	}
}

func eventBy(pk nostr.PubKey, kind nostr.Kind, withCircleTag bool) nostr.Event {
	ev := nostr.Event{Kind: kind, PubKey: pk}
	if withCircleTag {
		ev.Tags = nostr.Tags{{"a", "31950:" + owner.Hex() + ":abc"}}
	}
	return ev
}

func TestRejectsForeignKinds(t *testing.T) {
	if reject, _ := CheckStore(context.Background(), nostr.Event{Kind: 1, PubKey: owner}, st()); !reject {
		t.Fatal("kind 1 should be rejected on an application relay")
	}
}

func TestCircleDefNeedsDTag(t *testing.T) {
	ev := nostr.Event{Kind: KindCircle, PubKey: owner}
	if reject, _ := CheckStore(context.Background(), ev, st()); !reject {
		t.Fatal("circle def without d tag should be rejected")
	}
}

func TestMemberClaims(t *testing.T) {
	ctx := context.Background()
	s := st()

	// owner can self-claim
	ev := nostr.Event{Kind: KindCircleMember, PubKey: owner, Tags: nostr.Tags{{"a", "31950:" + owner.Hex() + ":abc"}}}
	if reject, msg := CheckStore(ctx, ev, s); reject {
		t.Fatalf("owner claim rejected: %s", msg)
	}

	// joiner with valid invite
	ev = nostr.Event{Kind: KindCircleMember, PubKey: stray, Tags: nostr.Tags{
		{"a", "31950:" + owner.Hex() + ":abc"},
		{"invite", "sekret"},
	}}
	if reject, msg := CheckStore(ctx, ev, s); reject {
		t.Fatalf("invite claim rejected: %s", msg)
	}

	// joiner with wrong invite
	ev = nostr.Event{Kind: KindCircleMember, PubKey: stray, Tags: nostr.Tags{
		{"a", "31950:" + owner.Hex() + ":abc"},
		{"invite", "wrong"},
	}}
	if reject, _ := CheckStore(ctx, ev, s); !reject {
		t.Fatal("wrong invite should be rejected")
	}

	// joiner with no invite
	ev = nostr.Event{Kind: KindCircleMember, PubKey: stray, Tags: nostr.Tags{
		{"a", "31950:" + owner.Hex() + ":abc"},
	}}
	if reject, _ := CheckStore(ctx, ev, s); !reject {
		t.Fatal("missing invite should be rejected")
	}

	// claim for a circle that doesn't exist
	ev = nostr.Event{Kind: KindCircleMember, PubKey: stray, Tags: nostr.Tags{
		{"a", "31950:" + owner.Hex() + ":nope"},
		{"invite", "sekret"},
	}}
	if reject, _ := CheckStore(ctx, ev, s); !reject {
		t.Fatal("claim for missing circle should be rejected")
	}
}

func TestCircleScopedWritesNeedMembership(t *testing.T) {
	ctx := context.Background()
	s := st()

	// member posts a calendar event into the circle
	if reject, msg := CheckStore(ctx, eventBy(member, KindCalendarEvent, true), s); reject {
		t.Fatalf("member event rejected: %s", msg)
	}
	// owner posts
	if reject, msg := CheckStore(ctx, eventBy(owner, KindCalendarEvent, true), s); reject {
		t.Fatalf("owner event rejected: %s", msg)
	}
	// stray posts → rejected
	if reject, _ := CheckStore(ctx, eventBy(stray, KindCalendarEvent, true), s); !reject {
		t.Fatal("stray event should be rejected")
	}
	// untagged event (no circle scope) is fine — e.g. profile
	if reject, _ := CheckStore(ctx, eventBy(stray, 0, false), s); reject {
		t.Fatal("profile event should be accepted")
	}
	// RSVP follows the same rule
	if reject, _ := CheckStore(ctx, eventBy(stray, KindRSVP, true), s); !reject {
		t.Fatal("stray RSVP should be rejected")
	}
}

func TestClosedCircleRejectsClaims(t *testing.T) {
	def := circleDefEv()
	// remove the invite tag → circle closed to joins
	def.Tags = nostr.Tags{{"d", "abc"}}
	s := &fakeStore{defs: map[string]nostr.Event{coordKey(circleCoord()): def}, claims: map[string]bool{}}
	ev := nostr.Event{Kind: KindCircleMember, PubKey: stray, Tags: nostr.Tags{
		{"a", "31950:" + owner.Hex() + ":abc"},
	}}
	if reject, _ := CheckStore(context.Background(), ev, s); !reject {
		t.Fatal("claim into invite-less circle should be rejected")
	}
}
