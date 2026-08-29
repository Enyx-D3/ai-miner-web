package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	ListenAddr       string
	RedisAddr        string
	RedisUsername    string
	RedisPassword    string
	RedisDB          int
	RedisTLS         bool
	MaxPayloadBytes  int
	MaxBodyBytes     int64
	MaxPullBatch     int
	MaxLongPoll      time.Duration
	MaxTTL           time.Duration
	MinTTL           time.Duration
	SignatureSkew    time.Duration
	NonceTTL         time.Duration
	RateLimit        int
	RateWindow       time.Duration
	PresenceFreshFor time.Duration
}

func Load() Config {
	return Config{
		ListenAddr:       env("LISTEN_ADDR", ":8080"),
		RedisAddr:        env("REDIS_ADDR", "127.0.0.1:6379"),
		RedisUsername:    os.Getenv("REDIS_USERNAME"),
		RedisPassword:    os.Getenv("REDIS_PASSWORD"),
		RedisDB:          envInt("REDIS_DB", 0),
		RedisTLS:         envBool("REDIS_TLS", false),
		MaxPayloadBytes:  envInt("MAX_RELAY_PAYLOAD_BYTES", 65536),
		MaxBodyBytes:     int64(envInt("MAX_HTTP_BODY_BYTES", 262144)),
		MaxPullBatch:     envInt("MAX_PULL_BATCH", 100),
		MaxLongPoll:      time.Duration(envInt("MAX_LONG_POLL_MS", 25000)) * time.Millisecond,
		MaxTTL:           time.Duration(envInt("MAX_MESSAGE_TTL_SECONDS", 86400)) * time.Second,
		MinTTL:           time.Duration(envInt("MIN_MESSAGE_TTL_SECONDS", 30)) * time.Second,
		SignatureSkew:    time.Duration(envInt("SIGNATURE_SKEW_SECONDS", 90)) * time.Second,
		NonceTTL:         time.Duration(envInt("NONCE_TTL_SECONDS", 180)) * time.Second,
		RateLimit:        envInt("RATE_LIMIT_PER_MINUTE", 600),
		RateWindow:       time.Minute,
		PresenceFreshFor: time.Duration(envInt("PRESENCE_FRESH_SECONDS", 180)) * time.Second,
	}
}

func env(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
func envInt(k string, d int) int {
	if v := os.Getenv(k); v != "" {
		if n, e := strconv.Atoi(v); e == nil {
			return n
		}
	}
	return d
}
func envBool(k string, d bool) bool {
	if v := os.Getenv(k); v != "" {
		if b, e := strconv.ParseBool(v); e == nil {
			return b
		}
	}
	return d
}
