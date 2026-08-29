package main

import (
	"brain2labs/b2-network/internal/api"
	"brain2labs/b2-network/internal/config"
	"brain2labs/b2-network/internal/store"
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	cfg := config.Load()
	logger := log.New(os.Stdout, "b2-network ", log.LstdFlags|log.LUTC|log.Lmsgprefix)
	st := store.NewRedisStore(cfg.RedisAddr, cfg.RedisUsername, cfg.RedisPassword, cfg.RedisDB, cfg.RedisTLS)
	srv := api.New(cfg, st, logger)
	h := &http.Server{Addr: cfg.ListenAddr, Handler: srv.Handler(), ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 70 * time.Second, WriteTimeout: 35 * time.Second}
	go func() {
		logger.Printf("listening on %s", cfg.ListenAddr)
		if e := h.ListenAndServe(); e != nil && !errors.Is(e, http.ErrServerClosed) {
			logger.Fatalf("server: %v", e)
		}
	}()
	ch := make(chan os.Signal, 1)
	signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
	<-ch
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	_ = h.Shutdown(ctx)
}
