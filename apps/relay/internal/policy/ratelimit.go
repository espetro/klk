// Per-agent write quota for delegated events. Sliding window in memory —
// good enough for a single-process relay; resets on restart.
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
