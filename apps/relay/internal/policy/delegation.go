// Scoped agent delegation: a member publishes a kind-34134 "agent scope"
// event (addressable, so relays store it — kind 24134 sits in NIP-16's
// ephemeral range and would never persist) naming an agent pubkey, the
// circle coords it may touch, and the capabilities granted. The agent
// then authors normal circle events carrying a `delegation` tag pointing
// at that scope; the relay admits them if the scope is live, covers the
// circle + capability, and the delegator is still a member.
package policy

import (
	"context"
	"strconv"
	"time"

	"fiatjaf.com/nostr"
)

// Capabilities a delegation may grant — declared in
// packages/proto/src/taxonomy.ts (CAPABILITIES); mirrored here. Unknown
// cap tags are ignored so newer caps don't break old relays.
const (
	CapRead      = "read"      // filter-level reads of circle-scoped events
	CapPostEvent = "postEvent" // delegated writes of KindCalendarEvent
	CapSetRsvp   = "setRsvp"   // delegated writes of KindRSVP
)

// capForKind maps a write kind to the capability it needs; "" means the
// kind is never delegatable (circle defs, member claims, scopes).
func capForKind(kind nostr.Kind) string {
	switch kind {
	case KindCalendarEvent:
		return CapPostEvent
	case KindRSVP:
		return CapSetRsvp
	}
	return ""
}

// Scope is the parsed form of a kind-34134 event.
type Scope struct {
	Delegator nostr.PubKey
	Agent     nostr.PubKey
	Circles   map[string]nostr.EntityPointer // key: "31950:pk:d"
	Caps      map[string]bool
	Expires   int64 // unix seconds; 0 = no expiry
}

// ParseScope validates a candidate scope event.
func ParseScope(ev nostr.Event) (Scope, bool) {
	if ev.Kind != KindAgentScope {
		return Scope{}, false
	}
	s := Scope{
		Delegator: ev.PubKey,
		Circles:   map[string]nostr.EntityPointer{},
		Caps:      map[string]bool{},
	}
	var agentHex string
	for _, tag := range ev.Tags {
		if len(tag) < 2 {
			continue
		}
		switch tag[0] {
		case "p":
			agentHex = tag[1]
		case "a":
			if ptr, err := nostr.ParseAddrString(tag[1]); err == nil && ptr.Kind == KindCircle {
				s.Circles[tag[1]] = ptr
			}
		case "cap":
			s.Caps[tag[1]] = true
		case "expiration":
			if n, err := strconv.ParseInt(tag[1], 10, 64); err == nil {
				s.Expires = n
			}
		}
	}
	if agentHex == "" || len(s.Circles) == 0 || len(s.Caps) == 0 {
		return Scope{}, false
	}
	agent, err := nostr.PubKeyFromHexCheap(agentHex)
	if err != nil {
		return Scope{}, false
	}
	s.Agent = agent
	return s, true
}

// Live reports whether the scope is within its validity window.
func (s Scope) Live() bool {
	return s.Expires == 0 || s.Expires > time.Now().Unix()
}

// Allows reports whether the scope grants cap on the circle coord string.
func (s Scope) Allows(coord, cap string) bool {
	_, ok := s.Circles[coord]
	return ok && s.Caps[cap] && s.Live()
}

// IsDelegated reports whether the event carries a delegation tag.
func IsDelegated(ev nostr.Event) bool {
	for _, tag := range ev.Tags {
		if len(tag) >= 2 && tag[0] == "delegation" {
			return true
		}
	}
	return false
}

// delegationCovers reports whether a non-member author's event is allowed
// into circle coord via a delegation tag pointing at a valid scope.
func delegationCovers(ctx context.Context, st Store, ev nostr.Event, coord nostr.EntityPointer) bool {
	wantCap := capForKind(ev.Kind)
	if wantCap == "" {
		return false
	}
	coordStr := coord.AsTagReference()
	for _, tag := range ev.Tags {
		if len(tag) < 2 || tag[0] != "delegation" {
			continue
		}
		ptr, err := nostr.ParseAddrString(tag[1])
		if err != nil || ptr.Kind != KindAgentScope {
			continue
		}
		scopeEv, ok := st.AgentScope(ctx, ptr)
		if !ok {
			continue
		}
		scope, ok := ParseScope(scopeEv)
		if !ok || scope.Agent != ev.PubKey {
			continue
		}
		if !scope.Allows(coordStr, wantCap) {
			continue
		}
		if !IsMember(ctx, st, coord, scope.Delegator) {
			continue
		}
		return true
	}
	return false
}

// readScopeCovers reports whether the agent has any live scope from a
// circle member granting cap on coord.
func readScopeCovers(ctx context.Context, st Store, agent nostr.PubKey, coord nostr.EntityPointer, cap string) bool {
	for _, scopeEv := range st.AgentScopesFor(ctx, agent) {
		scope, ok := ParseScope(scopeEv)
		if !ok {
			continue
		}
		if scope.Allows(coord.AsTagReference(), cap) && IsMember(ctx, st, coord, scope.Delegator) {
			return true
		}
	}
	return false
}
