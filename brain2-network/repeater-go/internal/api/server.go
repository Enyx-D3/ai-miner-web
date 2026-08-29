package api

import (
	"brain2labs/b2-network/internal/auth"
	"brain2labs/b2-network/internal/config"
	"brain2labs/b2-network/internal/metrics"
	"brain2labs/b2-network/internal/model"
	"brain2labs/b2-network/internal/store"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type Server struct {
	Cfg    config.Config
	Store  store.Store
	Auth   auth.Verifier
	M      *metrics.Metrics
	Logger *log.Logger
}

func New(cfg config.Config, st store.Store, l *log.Logger) *Server {
	return &Server{Cfg: cfg, Store: st, Auth: auth.Verifier{Store: st, Skew: cfg.SignatureSkew, NonceTTL: cfg.NonceTTL, RateLimit: cfg.RateLimit, RateWindow: cfg.RateWindow}, M: &metrics.Metrics{}, Logger: l}
}
func (s *Server) Handler() http.Handler {
	m := http.NewServeMux()
	m.HandleFunc("GET /healthz", s.health)
	m.HandleFunc("GET /readyz", s.ready)
	m.HandleFunc("GET /metrics", s.metrics)
	m.HandleFunc("GET /v2/info", s.info)
	m.HandleFunc("POST /v2/devices/register", s.register)
	m.HandleFunc("POST /v2/pair/token", s.protected(s.pairToken))
	m.HandleFunc("POST /v2/presence", s.protected(s.presence))
	m.HandleFunc("GET /v2/rendezvous/{device}", s.protected(s.rendezvous))
	m.HandleFunc("POST /v2/relay/enqueue", s.protected(s.enqueue))
	m.HandleFunc("GET /v2/relay/pull", s.protected(s.pull))
	m.HandleFunc("POST /v2/relay/ack", s.protected(s.ack))
	return s.instrument(m)
}
func (s *Server) instrument(n http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.M.Requests.Add(1)
		w.Header().Set("X-Brain2-Protocol", model.ProtocolVersion)
		n.ServeHTTP(w, r)
	})
}
func (s *Server) readBody(w http.ResponseWriter, r *http.Request) ([]byte, bool) {
	r.Body = http.MaxBytesReader(w, r.Body, s.Cfg.MaxBodyBytes)
	b, e := io.ReadAll(r.Body)
	if e != nil {
		s.writeErr(w, 413, "body_too_large", e.Error())
		return nil, false
	}
	return b, true
}

type handler func(http.ResponseWriter, *http.Request, []byte, auth.Identity)

func (s *Server) protected(fn handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var b []byte
		if r.Method != "GET" {
			var ok bool
			b, ok = s.readBody(w, r)
			if !ok {
				return
			}
		}
		id, e := s.Auth.Authenticate(r, b)
		if e != nil {
			s.M.AuthFailures.Add(1)
			s.writeErr(w, 401, "auth_failed", e.Error())
			return
		}
		fn(w, r, b, id)
	}
}
func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	s.writeJSON(w, 200, map[string]any{"ok": true, "protocol": model.ProtocolVersion})
}
func (s *Server) ready(w http.ResponseWriter, r *http.Request) {
	if e := s.Store.Ping(r.Context()); e != nil {
		s.writeErr(w, 503, "store_unavailable", e.Error())
		return
	}
	s.writeJSON(w, 200, map[string]any{"ok": true})
}
func (s *Server) info(w http.ResponseWriter, r *http.Request) {
	s.writeJSON(w, 200, map[string]any{"protocol": model.ProtocolVersion, "network": "B2 Network", "object_types": []string{"b2m", "b2a", "asif", "artifact", "extension"}, "direct_p2p_first": true, "relay_fallback": true, "control_plane_only": true, "bulk_data_relay": false, "max_payload_bytes": s.Cfg.MaxPayloadBytes, "autoscale_metric_key": model.GlobalPendingKey})
}
func (s *Server) metrics(w http.ResponseWriter, r *http.Request) {
	p, _ := s.Store.PendingCount(r.Context())
	w.Header().Set("Content-Type", "text/plain; version=0.0.4")
	fmt.Fprintf(w, "b2net_requests_total %d\nb2net_auth_failures_total %d\nb2net_enqueued_total %d\nb2net_pulled_total %d\nb2net_acked_total %d\nb2net_rejected_bulk_total %d\nb2net_pairings_total %d\nb2net_pending_messages %d\n", s.M.Requests.Load(), s.M.AuthFailures.Load(), s.M.Enqueued.Load(), s.M.Pulled.Load(), s.M.Acked.Load(), s.M.RejectedBulk.Load(), s.M.Paired.Load(), p)
}
func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	b, ok := s.readBody(w, r)
	if !ok {
		return
	}
	var q model.RegisterRequest
	if e := json.Unmarshal(b, &q); e != nil {
		s.writeErr(w, 400, "bad_json", e.Error())
		return
	}
	if q.SpaceKind == "" {
		q.SpaceKind = "b2m"
	}
	if !validID(q.SpaceID) || !validID(q.DeviceID) || !validKind(q.SpaceKind) {
		s.writeErr(w, 400, "bad_id", "invalid space/device/kind")
		return
	}
	ts := r.Header.Get("X-Timestamp")
	nonce := r.Header.Get("X-Nonce")
	sig := r.Header.Get("X-Signature")
	if ts == "" || nonce == "" || sig == "" {
		s.writeErr(w, 401, "missing_signature", "registration must be self-signed")
		return
	}
	unix, e := strconv.ParseInt(ts, 10, 64)
	if e != nil || abs(time.Now().Unix()-unix) > int64(s.Cfg.SignatureSkew.Seconds()) {
		s.writeErr(w, 401, "bad_timestamp", "timestamp outside allowed skew")
		return
	}
	if e = auth.VerifySignature(q.PublicKeyB64, sig, auth.SigningString(r.Method, r.URL.Path, ts, nonce, b)); e != nil {
		s.writeErr(w, 401, "bad_signature", e.Error())
		return
	}
	ok, e = s.Store.RememberNonce(r.Context(), "register:"+q.SpaceID+":"+q.DeviceID+":"+nonce, s.Cfg.NonceTTL)
	if e != nil || !ok {
		s.writeErr(w, 409, "replay", "nonce already used")
		return
	}
	exists, _ := s.Store.SpaceExists(r.Context(), q.SpaceID)
	if exists {
		if q.PairToken == "" {
			s.writeErr(w, 403, "pair_required", "existing space requires one-time pair token")
			return
		}
		paired, e := s.Store.ConsumePairToken(r.Context(), q.PairToken, q.SpaceID)
		if e != nil || !paired {
			s.writeErr(w, 403, "bad_pair_token", "invalid/expired pair token")
			return
		}
	} else {
		claimed, e := s.Store.ClaimSpace(r.Context(), q.SpaceID, q.DeviceID)
		if e != nil || !claimed {
			s.writeErr(w, 409, "space_claim_failed", "space could not be claimed")
			return
		}
	}
	now := time.Now().UTC()
	rec := model.DeviceRecord{SpaceID: q.SpaceID, SpaceKind: q.SpaceKind, DeviceID: q.DeviceID, PublicKeyB64: q.PublicKeyB64, Transports: cleanList(q.Transports, 12), Capabilities: cleanList(q.Capabilities, 24), LastSeen: now, RegisteredAt: now, Protocol: model.ProtocolVersion}
	created, e := s.Store.RegisterDevice(r.Context(), rec)
	if e != nil {
		s.writeErr(w, 500, "store_error", e.Error())
		return
	}
	if !created {
		s.writeErr(w, 409, "device_exists", "device already registered")
		return
	}
	s.writeJSON(w, 201, map[string]any{"registered": true, "space_id": q.SpaceID, "space_kind": q.SpaceKind, "device_id": q.DeviceID, "direct_p2p_first": true})
}
func (s *Server) pairToken(w http.ResponseWriter, r *http.Request, _ []byte, id auth.Identity) {
	raw := make([]byte, 24)
	if _, e := rand.Read(raw); e != nil {
		s.writeErr(w, 500, "random_failed", e.Error())
		return
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	ttl := 5 * time.Minute
	if e := s.Store.CreatePairToken(r.Context(), token, id.SpaceID, ttl); e != nil {
		s.writeErr(w, 500, "store_error", e.Error())
		return
	}
	s.M.Paired.Add(1)
	s.writeJSON(w, 201, map[string]any{"pair_token": token, "expires_at": time.Now().UTC().Add(ttl), "single_use": true})
}
func (s *Server) presence(w http.ResponseWriter, r *http.Request, b []byte, id auth.Identity) {
	var q model.PresenceRequest
	if e := json.Unmarshal(b, &q); e != nil {
		s.writeErr(w, 400, "bad_json", e.Error())
		return
	}
	rec := id.Device
	rec.Transports = cleanList(q.Transports, 12)
	rec.Candidates = cleanList(q.Candidates, 8)
	rec.Capabilities = cleanList(q.Capabilities, 24)
	rec.LastSeen = time.Now().UTC()
	if e := s.Store.UpdateDevice(r.Context(), rec); e != nil {
		s.writeErr(w, 500, "store_error", e.Error())
		return
	}
	s.writeJSON(w, 200, map[string]any{"ok": true, "last_seen": rec.LastSeen})
}
func (s *Server) rendezvous(w http.ResponseWriter, r *http.Request, _ []byte, id auth.Identity) {
	rec, e := s.Store.GetDevice(r.Context(), id.SpaceID, r.PathValue("device"))
	if e != nil {
		s.writeErr(w, 404, "device_not_found", "target not registered in this B2 space")
		return
	}
	resp := model.RendezvousResponse{DeviceID: rec.DeviceID, PublicKeyB64: rec.PublicKeyB64, LastSeen: rec.LastSeen, Capabilities: rec.Capabilities, DirectP2PFirst: true, RelayFallback: true}
	if time.Since(rec.LastSeen) <= s.Cfg.PresenceFreshFor {
		resp.Transports = rec.Transports
		resp.Candidates = rec.Candidates
	}
	s.writeJSON(w, 200, resp)
}

var allowedKinds = map[string]bool{"wake": true, "session_offer": true, "session_answer": true, "delta_refs": true, "mutation_refs": true, "block_refs": true, "checkpoint": true, "ack_hint": true, "route_probe": true, "source_offer": true, "control": true}

func (s *Server) enqueue(w http.ResponseWriter, r *http.Request, b []byte, id auth.Identity) {
	var q model.EnqueueRequest
	if e := json.Unmarshal(b, &q); e != nil {
		s.writeErr(w, 400, "bad_json", e.Error())
		return
	}
	if !validID(q.ID) || !validID(q.ToDevice) || !allowedKinds[q.Kind] {
		s.writeErr(w, 400, "bad_envelope", "invalid id,target,or kind")
		return
	}
	if q.ObjectType != "" && !validKind(q.ObjectType) {
		s.writeErr(w, 400, "bad_object_type", "invalid object type")
		return
	}
	if _, e := s.Store.GetDevice(r.Context(), id.SpaceID, q.ToDevice); e != nil {
		s.writeErr(w, 404, "target_not_found", "recipient not registered in this B2 space")
		return
	}
	payload, e := base64.StdEncoding.DecodeString(q.CiphertextB64)
	if e != nil {
		s.writeErr(w, 400, "bad_ciphertext", "ciphertext_b64 invalid")
		return
	}
	if len(payload) > s.Cfg.MaxPayloadBytes {
		s.M.RejectedBulk.Add(1)
		s.writeErr(w, 413, "control_plane_only", "payload exceeds control-plane limit; use direct/selective data-plane fetch")
		return
	}
	h := sha256.Sum256(payload)
	if !strings.EqualFold(hex.EncodeToString(h[:]), q.CiphertextSHA256) {
		s.writeErr(w, 400, "hash_mismatch", "ciphertext sha256 mismatch")
		return
	}
	ttl := time.Duration(q.TTLSeconds) * time.Second
	if ttl == 0 {
		ttl = 15 * time.Minute
	}
	if ttl < s.Cfg.MinTTL {
		ttl = s.Cfg.MinTTL
	}
	if ttl > s.Cfg.MaxTTL {
		ttl = s.Cfg.MaxTTL
	}
	now := time.Now().UTC()
	env := model.RelayEnvelope{ID: q.ID, SpaceID: id.SpaceID, SpaceKind: id.Device.SpaceKind, ObjectType: q.ObjectType, FromDevice: id.DeviceID, ToDevice: q.ToDevice, Kind: q.Kind, MutationSeq: q.MutationSeq, CreatedAt: now, ExpiresAt: now.Add(ttl), CiphertextB64: q.CiphertextB64, CiphertextSHA256: q.CiphertextSHA256, Protocol: model.ProtocolVersion}
	created, e := s.Store.Enqueue(r.Context(), env, ttl)
	if e != nil {
		s.writeErr(w, 500, "store_error", e.Error())
		return
	}
	if created {
		s.M.Enqueued.Add(1)
	}
	s.writeJSON(w, 202, map[string]any{"accepted": true, "deduplicated": !created, "id": q.ID, "expires_at": env.ExpiresAt})
}
func (s *Server) pull(w http.ResponseWriter, r *http.Request, _ []byte, id auth.Identity) {
	limit := intParam(r, "limit", 50)
	if limit < 1 {
		limit = 1
	}
	if limit > s.Cfg.MaxPullBatch {
		limit = s.Cfg.MaxPullBatch
	}
	wait := time.Duration(intParam(r, "wait_ms", 20000)) * time.Millisecond
	if wait < 0 {
		wait = 0
	}
	if wait > s.Cfg.MaxLongPoll {
		wait = s.Cfg.MaxLongPoll
	}
	deadline := time.Now().Add(wait)
	var msgs []model.RelayEnvelope
	var e error
	for {
		msgs, e = s.Store.Pull(r.Context(), id.SpaceID, id.DeviceID, limit)
		if e != nil {
			s.writeErr(w, 500, "store_error", e.Error())
			return
		}
		if len(msgs) > 0 || time.Now().After(deadline) || r.Context().Err() != nil {
			break
		}
		time.Sleep(100 * time.Millisecond)
	}
	s.M.Pulled.Add(uint64(len(msgs)))
	s.writeJSON(w, 200, model.PullResponse{Messages: msgs})
}
func (s *Server) ack(w http.ResponseWriter, r *http.Request, b []byte, id auth.Identity) {
	var q model.AckRequest
	if e := json.Unmarshal(b, &q); e != nil {
		s.writeErr(w, 400, "bad_json", e.Error())
		return
	}
	if len(q.IDs) > 200 {
		s.writeErr(w, 400, "too_many_ids", "ack batch too large")
		return
	}
	n := 0
	for _, mid := range q.IDs {
		ok, e := s.Store.Ack(r.Context(), id.SpaceID, id.DeviceID, mid)
		if e != nil {
			s.writeErr(w, 400, "ack_failed", e.Error())
			return
		}
		if ok {
			n++
		}
	}
	s.M.Acked.Add(uint64(n))
	s.writeJSON(w, 200, map[string]any{"acked": n})
}
func (s *Server) writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}
func (s *Server) writeErr(w http.ResponseWriter, code int, c, m string) {
	if code >= 500 {
		s.M.Errors.Add(1)
	}
	s.writeJSON(w, code, map[string]any{"error": c, "message": m})
}
func validID(x string) bool {
	if len(x) < 3 || len(x) > 128 {
		return false
	}
	for _, r := range x {
		if !(r == '-' || r == '_' || r == '.' || r >= '0' && r <= '9' || r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z') {
			return false
		}
	}
	return true
}
func validKind(x string) bool {
	if len(x) < 2 || len(x) > 32 {
		return false
	}
	for _, r := range x {
		if !(r == '-' || r == '_' || r >= '0' && r <= '9' || r >= 'a' && r <= 'z') {
			return false
		}
	}
	return true
}
func cleanList(a []string, max int) []string {
	if len(a) > max {
		a = a[:max]
	}
	out := make([]string, 0, len(a))
	for _, x := range a {
		x = strings.TrimSpace(x)
		if x != "" && len(x) <= 256 {
			out = append(out, x)
		}
	}
	return out
}
func intParam(r *http.Request, k string, d int) int {
	if v := r.URL.Query().Get(k); v != "" {
		if n, e := strconv.Atoi(v); e == nil {
			return n
		}
	}
	return d
}
func abs(x int64) int64 {
	if x < 0 {
		return -x
	}
	return x
}
