// klk-relay: the application relay — khatru + BoltDB eventstore +
// per-circle ACLs, serving the PWA statics in production.
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"fyi.klk/relay/internal/server"
)

func main() {
	addr := envOr("ADDR", ":3334")
	dbPath := envOr("DATA_DIR", "./data") + "/events.bolt"
	staticDir := os.Getenv("STATIC_DIR") // empty = relay only (dev)

	handler, cleanup, err := server.New(dbPath, staticDir)
	if err != nil {
		log.Fatalf("open store %s: %v", dbPath, err)
	}
	defer cleanup()

	srv := &http.Server{Addr: addr, Handler: handler}

	go func() {
		log.Printf("relay listening on %s (store %s, static %q)", addr, dbPath, staticDir)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("http: %v", err)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
	fmt.Println("bye")
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
