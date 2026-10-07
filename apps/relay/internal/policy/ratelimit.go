// Per-agent write quota for delegated events. Sliding window in memory —
// good enough for a single-process relay; resets on restart. Buckets are
// keyed per capability (method × resource × identity axes, as Slack/Discord
// rate-limit): a heavy rsvp agent can't starve its own postEvent quota.
package policy

import (
	"sync"
	"time"

	"fiatjaf.com/nostr"
)

type RateLimiter struct {
	mu     sync.Mutex
	max    int
	window time.Duration
	hits   map[nostr.PubKey][]time.Time
}

func NewRateLimiter(max int, window time.Duration) *RateLimiter {
	return &RateLimiter{max: max, window: window, hits: map[nostr.PubKey][]time.Time{}}
}

// Allow records an attempt and reports whether it fits the quota.
func (l *RateLimiter) Allow(pk nostr.PubKey) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-l.window)
	kept := l.hits[pk][:0]
	for _, t := range l.hits[pk] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= l.max {
		l.hits[pk] = kept
		return false
	}
	l.hits[pk] = append(kept, now)
	return true
}

// CapLimiter applies a different quota per capability.
type CapLimiter struct {
	limiters map[string]*RateLimiter
}

// NewCapLimiter builds a limiter per cap name, e.g. {"postEvent": 60, "setRsvp": 120}.
func NewCapLimiter(perCap map[string]int, window time.Duration) *CapLimiter {
	l := &CapLimiter{limiters: map[string]*RateLimiter{}}
	for cap, max := range perCap {
		l.limiters[cap] = NewRateLimiter(max, window)
	}
	return l
}

// Allow reports whether pk may write under cap. Unknown caps fall back to
// the strictest bucket — the smallest configured max.
func (l *CapLimiter) Allow(pk nostr.PubKey, cap string) bool {
	if lim, ok := l.limiters[cap]; ok {
		return lim.Allow(pk)
	}
	var min *RateLimiter
	for _, lim := range l.limiters {
		if min == nil || lim.max < min.max {
			min = lim
		}
	}
	return min == nil || min.Allow(pk)
}
