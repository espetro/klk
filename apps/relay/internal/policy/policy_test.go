package policy

import (
	"context"
	"testing"

	"fiatjaf.com/nostr"
	"fiatjaf.com/nostr/khatru"
)

type fakeStore struct {
	defs   map[string]nostr.Event
	claims map[string]bool
	scopes map[string]nostr.Event
}

func (f *fakeStore) CircleDef(_ context.Context, c nostr.EntityPointer) (nostr.Event, bool) {
	e, ok := f.defs[coordKey(c)]
	return e, ok
}
func (f *fakeStore) HasMemberClaim(_ context.Context, c nostr.EntityPointer, pk nostr.PubKey) bool {
	return f.claims[coordKey(c)+"|"+pk.Hex()]
}
func (f *fakeStore) AgentScope(_ context.Context, c nostr.EntityPointer) (nostr.Event, bool) {
	e, ok := f.scopes[coordKey(c)]
	return e, ok
}
func (f *fakeStore) AgentScopesFor(_ context.Context, agent nostr.PubKey) []nostr.Event {
	var out []nostr.Event
	for _, ev := range f.scopes {
		for _, tag := range ev.Tags {
			if len(tag) >= 2 && tag[0] == "p" && tag[1] == agent.Hex() {
				out = append(out, ev)
			}
		}
	}
	return out
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
		scopes: map[string]nostr.Event{},
	}
}

// scopeEv builds a valid kind-34134 delegation event from delegator to agent.
func scopeEv(delegator, agent nostr.PubKey, scopeID string, caps ...string) nostr.Event {
	tags := nostr.Tags{
		{"d", scopeID},
		{"p", agent.Hex()},
		{"a", "31950:" + owner.Hex() + ":abc"},
	}
	for _, c := range caps {
		tags = append(tags, nostr.Tag{"cap", c})
	}
	return nostr.Event{Kind: KindAgentScope, PubKey: delegator, Tags: tags}
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

func TestDelegatedWrites(t *testing.T) {
	ctx := context.Background()
	agent := nostr.MustPubKeyFromHex("000000000000000000000000000000000000000000000000000000000000000a")
	s := st()
	scopeCoord := "34134:" + member.Hex() + ":scope1"
	s.scopes[member.Hex()+":scope1"] = scopeEv(member, agent, "scope1", CapPostEvent, CapRead)

	delegated := func() nostr.Event {
		return nostr.Event{
			Kind:   KindCalendarEvent,
			PubKey: agent,
			Tags: nostr.Tags{
				{"a", "31950:" + owner.Hex() + ":abc"},
				{"delegation", scopeCoord},
			},
		}
	}

	// agent with a valid scope+delegation tag writes
	if reject, msg := CheckStore(ctx, delegated(), s); reject {
		t.Fatalf("scoped agent write rejected: %s", msg)
	}

	// no delegation tag → rejected (agent isn't a member)
	ev := nostr.Event{Kind: KindCalendarEvent, PubKey: agent, Tags: nostr.Tags{{"a", "31950:" + owner.Hex() + ":abc"}}}
	if reject, _ := CheckStore(ctx, ev, s); !reject {
		t.Fatal("unscoped agent write should be rejected")
	}

	// delegation tag pointing at a nonexistent scope → rejected
	ev = delegated()
	ev.Tags[1] = nostr.Tag{"delegation", "34134:" + member.Hex() + ":nope"}
	if reject, _ := CheckStore(ctx, ev, s); !reject {
		t.Fatal("dangling delegation should be rejected")
	}

	// wrong cap (scope grants postEvent only) → RSVP rejected
	ev = nostr.Event{
		Kind:   KindRSVP,
		PubKey: agent,
		Tags:   nostr.Tags{{"a", "31950:" + owner.Hex() + ":abc"}, {"delegation", scopeCoord}},
	}
	if reject, _ := CheckStore(ctx, ev, s); !reject {
		t.Fatal("write outside granted caps should be rejected")
	}

	// expired scope → rejected
	expired := scopeEv(member, agent, "scope1", CapPostEvent)
	expired.Tags = append(expired.Tags, nostr.Tag{"expiration", "1"})
	s.scopes[member.Hex()+":scope1"] = expired
	if reject, _ := CheckStore(ctx, delegated(), s); !reject {
		t.Fatal("expired scope should be rejected")
	}
	s.scopes[member.Hex()+":scope1"] = scopeEv(member, agent, "scope1", CapPostEvent, CapRead)

	// delegator leaving the circle revokes the agent
	delete(s.claims, coordKey(circleCoord())+"|"+member.Hex())
	if reject, _ := CheckStore(ctx, delegated(), s); !reject {
		t.Fatal("scope from a non-member delegator should be rejected")
	}
	s.claims[coordKey(circleCoord())+"|"+member.Hex()] = true
}

func TestCheckRequestScoping(t *testing.T) {
	s := st()
	agent := nostr.MustPubKeyFromHex("000000000000000000000000000000000000000000000000000000000000000a")
	s.scopes[member.Hex()+":scope1"] = scopeEv(member, agent, "scope1", CapRead)

	circleFilter := nostr.Filter{
		Kinds: []nostr.Kind{KindCalendarEvent},
		Tags:  nostr.TagMap{"a": []string{"31950:" + owner.Hex() + ":abc"}},
	}

	// member reads their circle
	if reject, msg := CheckRequest(khatru.ForceSetAuthed(context.Background(), member), circleFilter, s); reject {
		t.Fatalf("member read rejected: %s", msg)
	}
	// scoped agent reads with `read` cap
	if reject, msg := CheckRequest(khatru.ForceSetAuthed(context.Background(), agent), circleFilter, s); reject {
		t.Fatalf("scoped agent read rejected: %s", msg)
	}
	// stray reads nothing
	if reject, _ := CheckRequest(khatru.ForceSetAuthed(context.Background(), stray), circleFilter, s); !reject {
		t.Fatal("stray circle read should be rejected")
	}
	// agent without a read cap is rejected
	s.scopes[member.Hex()+":scope1"] = scopeEv(member, agent, "scope1", CapPostEvent)
	if reject, _ := CheckRequest(khatru.ForceSetAuthed(context.Background(), agent), circleFilter, s); !reject {
		t.Fatal("agent without read cap should be rejected")
	}

	// unscoped bulk filter is rejected even for a member
	bulk := nostr.Filter{Kinds: []nostr.Kind{KindCalendarEvent}}
	if reject, _ := CheckRequest(khatru.ForceSetAuthed(context.Background(), member), bulk, s); !reject {
		t.Fatal("unscoped kind filter should be rejected (no bulk surface)")
	}
	// circle def lookup by d+author counts as a circle-scoped filter
	defFilter := nostr.Filter{
		Kinds:   []nostr.Kind{KindCircle},
		Authors: []nostr.PubKey{owner},
		Tags:    nostr.TagMap{"d": []string{"abc"}},
	}
	if reject, msg := CheckRequest(khatru.ForceSetAuthed(context.Background(), member), defFilter, s); reject {
		t.Fatalf("member def lookup rejected: %s", msg)
	}
	if reject, _ := CheckRequest(khatru.ForceSetAuthed(context.Background(), stray), defFilter, s); !reject {
		t.Fatal("stray def lookup should be rejected")
	}
	// profile metadata stays open to any authed connection
	if reject, _ := CheckRequest(khatru.ForceSetAuthed(context.Background(), stray), nostr.Filter{Kinds: []nostr.Kind{0}}, s); reject {
		t.Fatal("kind-0 filter should stay open")
	}
	// id lookups allowed (single-item reads)
	if reject, _ := CheckRequest(khatru.ForceSetAuthed(context.Background(), stray), nostr.Filter{IDs: []nostr.ID{nostr.ID{}}}, s); reject {
		t.Fatal("id lookup should be allowed")
	}
	// self-authored lookup allowed — client boot discovery (own defs+claims)
	self := nostr.Filter{Kinds: []nostr.Kind{KindCircle, KindCircleMember}, Authors: []nostr.PubKey{member}}
	if reject, msg := CheckRequest(khatru.ForceSetAuthed(context.Background(), member), self, s); reject {
		t.Fatalf("self-authored filter rejected: %s", msg)
	}
	// but you can't enumerate someone else's authorship
	other := nostr.Filter{Kinds: []nostr.Kind{KindCircleMember}, Authors: []nostr.PubKey{member}}
	if reject, _ := CheckRequest(khatru.ForceSetAuthed(context.Background(), stray), other, s); !reject {
		t.Fatal("other-authored kind filter should be rejected")
	}
	// self-authored without kinds is still a wildcard — rejected
	wild := nostr.Filter{Authors: []nostr.PubKey{member}}
	if reject, _ := CheckRequest(khatru.ForceSetAuthed(context.Background(), member), wild, s); !reject {
		t.Fatal("kindless self filter should be rejected")
	}
}
