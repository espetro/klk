// Package lookup resolves the policy.Store contract against a live
// eventstore: circle definitions, member-claims, and agent scopes.
package lookup

import (
	"context"
	"fmt"
	"slices"

	"fiatjaf.com/nostr"
	"fiatjaf.com/nostr/eventstore"
	"fyi.klk/relay/internal/policy"
)

// Store wraps an eventstore.Store for policy lookups.
type Store struct {
	ES eventstore.Store
}

var _ policy.Store = (*Store)(nil)

// CircleDef returns the newest circle-def event at the coordinate.
func (s *Store) CircleDef(ctx context.Context, coord nostr.EntityPointer) (nostr.Event, bool) {
	filter := nostr.Filter{
		Kinds:   []nostr.Kind{policy.KindCircle},
		Authors: []nostr.PubKey{coord.PublicKey},
		Tags:    nostr.TagMap{"d": []string{coord.Identifier}},
		Limit:   8,
	}
	var newest nostr.Event
	found := false
	for ev := range s.ES.QueryEvents(filter, 8) {
		if !found || ev.CreatedAt > newest.CreatedAt {
			newest = ev
			found = true
		}
	}
	return newest, found
}

// HasMemberClaim reports whether pubkey has a member-claim event
// pointing at the circle coordinate.
func (s *Store) HasMemberClaim(ctx context.Context, coord nostr.EntityPointer, pubkey nostr.PubKey) bool {
	a := fmt.Sprintf("%d:%s:%s", policy.KindCircle, coord.PublicKey.Hex(), coord.Identifier)
	filter := nostr.Filter{
		Kinds:   []nostr.Kind{policy.KindCircleMember},
		Authors: []nostr.PubKey{pubkey},
		Tags:    nostr.TagMap{"a": []string{a}},
		Limit:   1,
	}
	for range s.ES.QueryEvents(filter, 1) {
		return true
	}
	return false
}

// AgentScope returns the newest delegation scope event at the
// coordinate (kind 34134).
func (s *Store) AgentScope(ctx context.Context, coord nostr.EntityPointer) (nostr.Event, bool) {
	filter := nostr.Filter{
		Kinds:   []nostr.Kind{policy.KindAgentScope},
		Authors: []nostr.PubKey{coord.PublicKey},
		Tags:    nostr.TagMap{"d": []string{coord.Identifier}},
		Limit:   8,
	}
	var newest nostr.Event
	found := false
	for ev := range s.ES.QueryEvents(filter, 8) {
		if !found || ev.CreatedAt > newest.CreatedAt {
			newest = ev
			found = true
		}
	}
	return newest, found
}

// AgentScopesFor lists delegation scopes naming pubkey as the agent
// (`p` tag). Bounded — an agent's granted scopes are a small set.
func (s *Store) AgentScopesFor(ctx context.Context, agent nostr.PubKey) []nostr.Event {
	filter := nostr.Filter{
		Kinds: []nostr.Kind{policy.KindAgentScope},
		Tags:  nostr.TagMap{"p": []string{agent.Hex()}},
		Limit: 200,
	}
	var out []nostr.Event
	for ev := range s.ES.QueryEvents(filter, 200) {
		out = append(out, ev)
	}
	return out
}

// Members lists member pubkeys of a circle (owner + claim authors).
func (s *Store) Members(ctx context.Context, coord nostr.EntityPointer) []nostr.PubKey {
	a := fmt.Sprintf("%d:%s:%s", policy.KindCircle, coord.PublicKey.Hex(), coord.Identifier)
	filter := nostr.Filter{
		Kinds: []nostr.Kind{policy.KindCircleMember},
		Tags:  nostr.TagMap{"a": []string{a}},
		Limit: 500,
	}
	out := []nostr.PubKey{coord.PublicKey}
	for ev := range s.ES.QueryEvents(filter, 500) {
		if !slices.Contains(out, ev.PubKey) {
			out = append(out, ev.PubKey)
		}
	}
	return out
}
