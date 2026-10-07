// Package policy holds the relay's application rules: which kinds it
// stores, who may write what, and who may read what. Pure functions over
// events + a store lookup, so it is unit-testable without a live relay.
package policy

import (
	"context"
	"strings"

	"fiatjaf.com/nostr"
	"fiatjaf.com/nostr/khatru"
)

// klk's kinds on the Nostr contract.
const (
	KindCalendarEvent nostr.Kind = 31923 // NIP-52
	KindRSVP          nostr.Kind = 31925 // NIP-52
	KindCircle        nostr.Kind = 31950 // addressable circle definition
	KindCircleMember  nostr.Kind = 31951 // membership claim by a member
	KindAgentScope    nostr.Kind = 24134 // agent delegation token
)

// storable are the kinds the relay will store at all. Anything else is
// rejected: this is an application relay, not a public one.
var storable = map[nostr.Kind]bool{
	0:                 true, // profile metadata
	3:                 true, // contacts
	KindCalendarEvent: true,
	KindRSVP:          true,
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
		// member of every circle they post to
		for _, c := range CircleCoords(ev) {
			if !IsMember(ctx, st, c, ev.PubKey) {
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
// membership in every tagged circle.
func CheckRequest(ctx context.Context, filter nostr.Filter, st Store) (reject bool, msg string) {
	authed, ok := khatru.GetAuthed(ctx)
	if !ok {
		return true, "auth-required: subscribe requires NIP-42 authentication"
	}

	for _, coord := range filter.Tags["a"] {
		ptr, err := nostr.ParseAddrString(coord)
		if err != nil || ptr.Kind != KindCircle {
			continue
		}
		if !IsMember(ctx, st, ptr, authed) {
			return true, "restricted: not a member of that circle"
		}
	}
	return false, ""
}

// IsCircleCoordString reports whether an `a`-tag string points at a circle.
func IsCircleCoordString(v string) bool {
	return strings.HasPrefix(v, "31950:")
}
