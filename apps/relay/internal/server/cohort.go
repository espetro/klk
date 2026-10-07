// Cohort gate: the app collects an email before first use; the relay
// records signups as JSONL under DATA_DIR (tiny, inspectable, restart-safe).
package server

import (
	"encoding/json"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

var emailRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

// cohortHandler appends {"email","ts","ua"} lines to
// <dataDir>/cohort.jsonl. Per-IP throttle (5s) blunts form spam without
// any external dependency.
func cohortHandler(dataDir string) http.HandlerFunc {
	path := filepath.Join(dataDir, "cohort.jsonl")
	var mu sync.Mutex
	lastByIP := map[string]time.Time{}

	return func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Email string `json:"email"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<12)).Decode(&in); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}
		email := strings.ToLower(strings.TrimSpace(in.Email))
		if len(email) > 254 || !emailRe.MatchString(email) {
			http.Error(w, "bad email", http.StatusBadRequest)
			return
		}

		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}
		mu.Lock()
		if t, ok := lastByIP[ip]; ok && time.Since(t) < 5*time.Second {
			mu.Unlock()
			http.Error(w, "slow down", http.StatusTooManyRequests)
			return
		}
		lastByIP[ip] = time.Now()
		mu.Unlock()

		line, err := json.Marshal(map[string]string{
			"email": email,
			"ts":    time.Now().UTC().Format(time.RFC3339),
			"ua":    r.UserAgent(),
		})
		if err != nil {
			http.Error(w, "encode", http.StatusInternalServerError)
			return
		}
		f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
		if err != nil {
			http.Error(w, "store", http.StatusInternalServerError)
			return
		}
		_, werr := f.Write(append(line, '\n'))
		_ = f.Close()
		if werr != nil {
			http.Error(w, "store", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
