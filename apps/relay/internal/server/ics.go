// Calendar feed: GET /ics/<ownerPubkey>/<slug>?invite=<secret> renders a
// circle's calendar events as an iCalendar feed. The invite secret is the
// capability — the same one carried by join links, so anyone holding a
// link can subscribe the feed. Hosted circles only: the relay stores only
// ciphertext for sealed ones, by design.
package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"fiatjaf.com/nostr"
	"fyi.klk/relay/internal/lookup"
	"fyi.klk/relay/internal/policy"
)

func icsFeed(st *lookup.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		owner, err := nostr.PubKeyFromHex(r.PathValue("owner"))
		if err != nil {
			http.Error(w, "bad owner", http.StatusBadRequest)
			return
		}
		coord := nostr.EntityPointer{
			Kind:       policy.KindCircle,
			PublicKey:  owner,
			Identifier: r.PathValue("slug"),
		}
		def, ok := st.CircleDef(r.Context(), coord)
		if !ok {
			http.Error(w, "unknown circle", http.StatusNotFound)
			return
		}
		if inv := tagValue(def, "invite"); inv == "" || inv != r.URL.Query().Get("invite") {
			http.Error(w, "invalid invite", http.StatusForbidden)
			return
		}
		if tagValue(def, "tier") == "sealed" {
			// the relay holds ciphertext only — export is client-side
			http.Error(w, "sealed circles export from the app", http.StatusForbidden)
			return
		}

		a := fmt.Sprintf("%d:%s:%s", policy.KindCircle, owner.Hex(), coord.Identifier)
		events := latestByD(queryTag(st, r.Context(), a))
		var b strings.Builder
		b.WriteString("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//klk//events//EN\r\n")
		b.WriteString("X-WR-CALNAME:" + icsEsc(circleName(def)) + "\r\n")
		b.WriteString("REFRESH-INTERVAL;VALUE=DURATION:PT1H\r\n")
		for _, ev := range events {
			b.WriteString("BEGIN:VEVENT\r\n")
			b.WriteString("UID:" + ev.ID.Hex() + "@klk\r\n")
			b.WriteString("DTSTAMP:" + icsTime(time.Unix(int64(ev.CreatedAt), 0)) + "\r\n")
			b.WriteString("DTSTART:" + icsTime(unixTag(ev, "start")) + "\r\n")
			if end := unixTag(ev, "end"); !end.IsZero() {
				b.WriteString("DTEND:" + icsTime(end) + "\r\n")
			}
			b.WriteString("SUMMARY:" + icsEsc(tagValue(ev, "title")) + "\r\n")
			if loc := tagValue(ev, "location"); loc != "" {
				b.WriteString("LOCATION:" + icsEsc(loc) + "\r\n")
			}
			if ev.Content != "" {
				b.WriteString("DESCRIPTION:" + icsEsc(ev.Content) + "\r\n")
			}
			if g := tagValue(ev, "g"); g != "" {
				if parts := strings.SplitN(g, ",", 2); len(parts) == 2 {
					b.WriteString("GEO:" + parts[0] + ";" + parts[1] + "\r\n")
				}
			}
			b.WriteString("END:VEVENT\r\n")
		}
		b.WriteString("END:VCALENDAR\r\n")

		w.Header().Set("Content-Type", "text/calendar; charset=utf-8")
		w.Header().Set("Cache-Control", "public, max-age=300")
		_, _ = w.Write([]byte(b.String()))
	}
}

// queryTag fetches calendar events carrying the circle `a` tag.
func queryTag(st *lookup.Store, ctx context.Context, a string) []nostr.Event {
	var out []nostr.Event
	for ev := range st.ES.QueryEvents(nostr.Filter{
		Kinds: []nostr.Kind{policy.KindCalendarEvent},
		Tags:  nostr.TagMap{"a": []string{a}},
	}, 2000) {
		out = append(out, ev)
	}
	return out
}

func tagValue(ev nostr.Event, name string) string {
	for _, t := range ev.Tags {
		if len(t) >= 2 && t[0] == name {
			return t[1]
		}
	}
	return ""
}

func circleName(def nostr.Event) string {
	var meta struct {
		Name string `json:"name"`
	}
	if err := json.Unmarshal([]byte(def.Content), &meta); err == nil && meta.Name != "" {
		return meta.Name
	}
	return def.Tags.GetD()
}

func unixTag(ev nostr.Event, name string) time.Time {
	var ts int64
	if _, err := fmt.Sscanf(tagValue(ev, name), "%d", &ts); err != nil {
		return time.Time{}
	}
	return time.Unix(ts, 0)
}

func icsTime(t time.Time) string {
	return t.UTC().Format("20060102T150405Z")
}

func icsEsc(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, ";", "\\;")
	s = strings.ReplaceAll(s, ",", "\\,")
	s = strings.ReplaceAll(s, "\n", "\\n")
	return s
}

// latestByD keeps only the newest revision of each addressable event.
func latestByD(evs []nostr.Event) []nostr.Event {
	byD := make(map[string]nostr.Event)
	for _, ev := range evs {
		if cur, ok := byD[ev.Tags.GetD()]; !ok || ev.CreatedAt > cur.CreatedAt {
			byD[ev.Tags.GetD()] = ev
		}
	}
	out := make([]nostr.Event, 0, len(byD))
	for _, ev := range byD {
		out = append(out, ev)
	}
	return out
}
