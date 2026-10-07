// Package policy holds the relay's application rules: which kinds it
// stores, who may write what, and who may read what. Pure functions over
// events + a store lookup, so it is unit-testable without a live relay.
package policy

import (
	"context"
	"slices"
	"strings"

	"fiatjaf.com/nostr"
	"fiatjaf.com/nostr/khatru"
)

// klk's kinds on the Nostr contract. The contract of record is
// packages/proto/src/taxonomy.ts (TAXONOMY table) — edit there, then
// mirror here. Verified in sync at v0: same kind set both sides.
const (
	KindCalendarEvent nostr.Kind = 31923 // taxonomy.calendarEvent — NIP-52
	KindRSVP          nostr.Kind = 31925 // taxonomy.rsvp — NIP-52
	KindSuggestion    nostr.Kind = 31926 // taxonomy.suggestion — member-proposed event change
	KindCircle        nostr.Kind = 31950 // taxonomy.circle — addressable circle definition
	KindCircleMember  nostr.Kind = 31951 // taxonomy.circleMember — membership claim by a member
	KindAgentScope    nostr.Kind = 34134 // taxonomy.agentScope — addressable agent delegation scope
)

// storable are the kinds the relay will store at all. Anything else is
// rejected: this is an application relay, not a public one.
var storable = map[nostr.Kind]bool{
	0:                 true, // taxonomy.profile — metadata
	3:                 true, // taxonomy.contacts
	KindCalendarEvent: true,
	KindRSVP:          true,
	KindSuggestion:    true,
	KindCircle:        true,
	KindCircleMember:  true,
	KindAgentScope:    true,
}

// Store abstracts what the policy needs from the event database.
type Store interface {
	// CircleDef returns the latest circle definition event at coord.
	CircleDef(ctx context.Context, coord nostr.EntityPointer) (nostr.Event, bool)
	// HasMemberClaim reports whether pubkey has an accepted member-claim
	// event for the circle at coord.
	HasMemberClaim(ctx context.Context, coord nostr.EntityPointer, pubkey nostr.PubKey) bool
	// AgentScope returns the delegation scope event at coord (kind 34134).
	AgentScope(ctx context.Context, coord nostr.EntityPointer) (nostr.Event, bool)
	// AgentScopesFor lists scope events naming pubkey as the agent.
	AgentScopesFor(ctx context.Context, agent nostr.PubKey) []nostr.Event
}

// IsMember reports whether pubkey is a member of the circle at coord:
// the owner, or anyone with an accepted member-claim.
func IsMember(ctx context.Context, st Store, coord nostr.EntityPointer, pubkey nostr.PubKey) bool {
	if coord.PublicKey == pubkey {
		return true
	}
	return st.HasMemberClaim(ctx, coord, pubkey)
}

// CircleCoords returns the circle `a` tags on an event.
func CircleCoords(ev nostr.Event) []nostr.EntityPointer {
	out := make([]nostr.EntityPointer, 0, 2)
	for _, tag := range ev.Tags {
		if len(tag) < 2 || tag[0] != "a" {
			continue
		}
		if ptr, err := nostr.ParseAddrString(tag[1]); err == nil && ptr.Kind == KindCircle {
			out = append(out, ptr)
		}
	}
	return out
}

// CheckStore decides whether an incoming event may be stored.
func CheckStore(ctx context.Context, ev nostr.Event, st Store) (reject bool, msg string) {
	if !storable[ev.Kind] {
		return true, "blocked: kind not stored by this relay"
	}

	switch ev.Kind {
	case KindCircle:
		if ev.Tags.GetD() == "" {
			return true, "invalid: circle definition missing d tag"
		}
	case KindAgentScope:
		// stored as-is; validity (membership, caps, expiry) is checked
		// when an agent tries to use it — a delegator can revoke by
		// re-publishing an empty/capped scope at the same coordinate
		if ev.Tags.GetD() == "" {
			return true, "invalid: scope missing d tag"
		}
		if _, ok := ParseScope(ev); !ok {
			return true, "invalid: scope needs p, a and cap tags"
		}
	case KindCircleMember:
		coords := CircleCoords(ev)
		if len(coords) == 0 {
			return true, "invalid: member claim must tag a circle"
		}
		for _, c := range coords {
			def, ok := st.CircleDef(ctx, c)
			if !ok {
				return true, "restricted: circle does not exist"
			}
			if def.PubKey == ev.PubKey {
				continue // owner asserting membership
			}
			// joiners must present the circle's invite secret (carried in
			// the invite link); a circle with no invite tag is closed
			if inv := inviteTagValue(def); inv == "" || inv != inviteTagValue(ev) {
				return true, "restricted: claim needs a valid invite"
			}
		}
	default:
		// circle-scoped content (events, RSVPs): the author must be a
		// member of every circle they post to, or carry a live
		// delegation scope granting the capability for that circle
		for _, c := range CircleCoords(ev) {
			if !IsMember(ctx, st, c, ev.PubKey) && !delegationCovers(ctx, st, ev, c) {
				return true, "restricted: not a member of that circle"
			}
		}
	}
	return false, ""
}

func inviteTagValue(ev nostr.Event) string {
	for _, tag := range ev.Tags {
		if len(tag) >= 2 && tag[0] == "invite" {
			return tag[1]
		}
	}
	return ""
}

// CheckRequest decides whether a filter may run for this connection.
// All reads require NIP-42 auth; filters referencing circles require
// membership in every tagged circle (or a live read scope for agents).
// Filters touching no circle are allowed only for benign self-lookups —
// profile/contacts by author, single events by id, or anything the
// caller themselves authored (self-discovery; you can't leak what you
// wrote) — anything else is rejected so there is no bulk-scan surface
// (the moat rule).
func CheckRequest(ctx context.Context, filter nostr.Filter, st Store) (reject bool, msg string) {
	authed, ok := khatru.GetAuthed(ctx)
	if !ok {
		return true, "auth-required: subscribe requires NIP-42 authentication"
	}

	for _, ref := range requestCircles(filter) {
		if !IsMember(ctx, st, ref, authed) && !readScopeCovers(ctx, st, authed, ref, CapRead) {
			return true, "restricted: not a member of that circle"
		}
	}

	if !requestTouchesCircle(filter) {
		if len(filter.IDs) > 0 {
			return false, "" // single-item fetch by event id
		}
		if len(filter.Authors) == 1 && filter.Authors[0] == authed && len(filter.Kinds) > 0 {
			return false, "" // self-authored lookup: your own events can't leak
		}
		for _, k := range filter.Kinds {
			if k != 0 && k != 3 {
				return true, "restricted: filter needs a circle scope"
			}
		}
		if len(filter.Kinds) == 0 {
			return true, "restricted: filter needs a circle scope"
		}
	}
	return false, ""
}

// requestCircles resolves every circle a filter can touch: explicit `a`
// refs plus `d`+`authors` combos when the filter can return circle defs.
func requestCircles(filter nostr.Filter) []nostr.EntityPointer {
	out := make([]nostr.EntityPointer, 0, 4)
	for _, coord := range filter.Tags["a"] {
		if ptr, err := nostr.ParseAddrString(coord); err == nil && ptr.Kind == KindCircle {
			out = append(out, ptr)
		}
	}
	if kindAllows(filter, KindCircle) {
		for _, d := range filter.Tags["d"] {
			for _, author := range filter.Authors {
				out = append(out, nostr.EntityPointer{
					Kind:       KindCircle,
					PublicKey:  author,
					Identifier: d,
				})
			}
		}
	}
	return out
}

func requestTouchesCircle(filter nostr.Filter) bool {
	return len(filter.Tags["a"]) > 0 || (len(filter.Tags["d"]) > 0 && len(filter.Authors) > 0 && kindAllows(filter, KindCircle))
}

func kindAllows(filter nostr.Filter, kind nostr.Kind) bool {
	return len(filter.Kinds) == 0 || slices.Contains(filter.Kinds, kind)
}

// IsCircleCoordString reports whether an `a`-tag string points at a circle.
func IsCircleCoordString(v string) bool {
	return strings.HasPrefix(v, "31950:")
}
