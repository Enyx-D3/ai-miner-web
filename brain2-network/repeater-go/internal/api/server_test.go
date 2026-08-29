package api

import (
	"brain2labs/b2-network/internal/auth"
	"brain2labs/b2-network/internal/config"
	"brain2labs/b2-network/internal/model"
	"brain2labs/b2-network/internal/store"
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"
)

type ident struct {
	pub        ed25519.PublicKey
	priv       ed25519.PrivateKey
	space, dev string
}

func newID(s, d string) ident { p, k, _ := ed25519.GenerateKey(rand.Reader); return ident{p, k, s, d} }
func signedReq(method, url string, body []byte, id ident) *http.Request {
	r, _ := http.NewRequest(method, url, bytes.NewReader(body))
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	nonce := strconv.FormatInt(time.Now().UnixNano(), 10)
	sig := ed25519.Sign(id.priv, []byte(auth.SigningString(method, r.URL.Path, ts, nonce, body)))
	r.Header.Set("X-B2-Space-ID", id.space)
	r.Header.Set("X-B2-Device-ID", id.dev)
	r.Header.Set("X-Timestamp", ts)
	r.Header.Set("X-Nonce", nonce)
	r.Header.Set("X-Signature", base64.StdEncoding.EncodeToString(sig))
	return r
}
func register(t *testing.T, c *http.Client, url string, id ident, kind, token string) int {
	body, _ := json.Marshal(map[string]any{"space_id": id.space, "space_kind": kind, "device_id": id.dev, "public_key_b64": base64.StdEncoding.EncodeToString(id.pub), "pair_token": token})
	r := signedReq("POST", url+"/v2/devices/register", body, id)
	resp, e := c.Do(r)
	if e != nil {
		t.Fatal(e)
	}
	defer resp.Body.Close()
	return resp.StatusCode
}
func TestGenericSpacePairRelayAndBulkGuard(t *testing.T) {
	cfg := config.Load()
	cfg.MaxPayloadBytes = 32
	cfg.MaxLongPoll = 50 * time.Millisecond
	st := store.NewMemoryStore()
	s := New(cfg, st, log.New(io.Discard, "", 0))
	ts := httptest.NewServer(s.Handler())
	defer ts.Close()
	a := newID("space-1", "phone")
	b := newID("space-1", "laptop")
	if got := register(t, ts.Client(), ts.URL, a, "b2m", ""); got != 201 {
		t.Fatalf("bootstrap %d", got)
	}
	if got := register(t, ts.Client(), ts.URL, b, "b2m", ""); got != 403 {
		t.Fatalf("second without pair should 403 got %d", got)
	}
	resp, e := ts.Client().Do(signedReq("POST", ts.URL+"/v2/pair/token", []byte{}, a))
	if e != nil {
		t.Fatal(e)
	}
	var pr map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&pr)
	resp.Body.Close()
	token, _ := pr["pair_token"].(string)
	if got := register(t, ts.Client(), ts.URL, b, "b2m", token); got != 201 {
		t.Fatalf("paired register %d", got)
	}
	raw := []byte("delta-ref-123")
	h := sha256.Sum256(raw)
	payload, _ := json.Marshal(map[string]any{"id": "msg-001", "to_device": "laptop", "kind": "delta_refs", "object_type": "b2m", "ciphertext_b64": base64.StdEncoding.EncodeToString(raw), "ciphertext_sha256": hex.EncodeToString(h[:])})
	resp, e = ts.Client().Do(signedReq("POST", ts.URL+"/v2/relay/enqueue", payload, a))
	if e != nil || resp.StatusCode != 202 {
		t.Fatalf("enqueue")
	}
	resp.Body.Close()
	resp, e = ts.Client().Do(signedReq("GET", ts.URL+"/v2/relay/pull?wait_ms=0", nil, b))
	bb, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if e != nil || !bytes.Contains(bb, []byte("msg-001")) {
		t.Fatalf("pull %s", bb)
	}
	ack, _ := json.Marshal(map[string]any{"ids": []string{"msg-001"}})
	resp, _ = ts.Client().Do(signedReq("POST", ts.URL+"/v2/relay/ack", ack, b))
	if resp.StatusCode != 200 {
		t.Fatal("ack")
	}
	resp.Body.Close()
	big := bytes.Repeat([]byte("x"), 33)
	hh := sha256.Sum256(big)
	bulk, _ := json.Marshal(map[string]any{"id": "msg-002", "to_device": "laptop", "kind": "control", "object_type": "b2a", "ciphertext_b64": base64.StdEncoding.EncodeToString(big), "ciphertext_sha256": hex.EncodeToString(hh[:])})
	resp, _ = ts.Client().Do(signedReq("POST", ts.URL+"/v2/relay/enqueue", bulk, a))
	if resp.StatusCode != 413 {
		t.Fatalf("expected bulk guard 413 got %d", resp.StatusCode)
	}
	resp.Body.Close()
}

func BenchmarkSignedRelayEnqueueAck(b *testing.B) {
	cfg := config.Load()
	cfg.MaxPayloadBytes = 1024
	cfg.RateLimit = 100000000
	st := store.NewMemoryStore()
	s := New(cfg, st, log.New(io.Discard, "", 0))
	hnd := s.Handler()
	a := newID("bench-space", "phone")
	d := newID("bench-space", "laptop")
	_, _ = st.ClaimSpace(context.Background(), "bench-space", "phone")
	_, _ = st.RegisterDevice(context.Background(), model.DeviceRecord{SpaceID: "bench-space", SpaceKind: "b2m", DeviceID: "phone", PublicKeyB64: base64.StdEncoding.EncodeToString(a.pub), Protocol: model.ProtocolVersion})
	_, _ = st.RegisterDevice(context.Background(), model.DeviceRecord{SpaceID: "bench-space", SpaceKind: "b2m", DeviceID: "laptop", PublicKeyB64: base64.StdEncoding.EncodeToString(d.pub), Protocol: model.ProtocolVersion})
	raw := []byte("delta-ref")
	sh := sha256.Sum256(raw)
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		id := fmt.Sprintf("m-%d", i)
		payload, _ := json.Marshal(map[string]any{"id": id, "to_device": "laptop", "kind": "delta_refs", "object_type": "b2m", "ciphertext_b64": base64.StdEncoding.EncodeToString(raw), "ciphertext_sha256": hex.EncodeToString(sh[:])})
		req := signedReq("POST", "http://x/v2/relay/enqueue", payload, a)
		rr := httptest.NewRecorder()
		hnd.ServeHTTP(rr, req)
		if rr.Code != 202 {
			b.Fatalf("enqueue %d", rr.Code)
		}
		ack, _ := json.Marshal(map[string]any{"ids": []string{id}})
		req = signedReq("POST", "http://x/v2/relay/ack", ack, d)
		rr = httptest.NewRecorder()
		hnd.ServeHTTP(rr, req)
		if rr.Code != 200 {
			b.Fatalf("ack %d", rr.Code)
		}
	}
}

func BenchmarkSignedRelayPayloadSizes(b *testing.B) {
	for _, sz := range []int{64, 1024, 16384, 60000} {
		b.Run(fmt.Sprintf("payload_%d", sz), func(b *testing.B) {
			cfg := config.Load()
			cfg.MaxPayloadBytes = 65536
			cfg.RateLimit = 100000000
			st := store.NewMemoryStore()
			s := New(cfg, st, log.New(io.Discard, "", 0))
			hnd := s.Handler()
			a := newID("bench-space", "phone")
			d := newID("bench-space", "laptop")
			_, _ = st.ClaimSpace(context.Background(), "bench-space", "phone")
			_, _ = st.RegisterDevice(context.Background(), model.DeviceRecord{SpaceID: "bench-space", SpaceKind: "b2m", DeviceID: "phone", PublicKeyB64: base64.StdEncoding.EncodeToString(a.pub), Protocol: model.ProtocolVersion})
			_, _ = st.RegisterDevice(context.Background(), model.DeviceRecord{SpaceID: "bench-space", SpaceKind: "b2m", DeviceID: "laptop", PublicKeyB64: base64.StdEncoding.EncodeToString(d.pub), Protocol: model.ProtocolVersion})
			raw := bytes.Repeat([]byte("x"), sz)
			sh := sha256.Sum256(raw)
			cipher := base64.StdEncoding.EncodeToString(raw)
			sha := hex.EncodeToString(sh[:])
			b.ReportAllocs()
			b.SetBytes(int64(sz))
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				id := fmt.Sprintf("m-%d", i)
				payload, _ := json.Marshal(map[string]any{"id": id, "to_device": "laptop", "kind": "delta_refs", "object_type": "b2m", "ciphertext_b64": cipher, "ciphertext_sha256": sha})
				req := signedReq("POST", "http://x/v2/relay/enqueue", payload, a)
				rr := httptest.NewRecorder()
				hnd.ServeHTTP(rr, req)
				if rr.Code != 202 {
					b.Fatalf("enqueue %d", rr.Code)
				}
				ack, _ := json.Marshal(map[string]any{"ids": []string{id}})
				req = signedReq("POST", "http://x/v2/relay/ack", ack, d)
				rr = httptest.NewRecorder()
				hnd.ServeHTTP(rr, req)
				if rr.Code != 200 {
					b.Fatalf("ack %d", rr.Code)
				}
			}
		})
	}
}

func TestIsolationReplayIdempotencyAndPairSingleUse(t *testing.T) {
	cfg := config.Load()
	cfg.RateLimit = 10000
	st := store.NewMemoryStore()
	s := New(cfg, st, log.New(io.Discard, "", 0))
	ts := httptest.NewServer(s.Handler())
	defer ts.Close()
	a := newID("space-a", "dev-a1")
	b := newID("space-a", "dev-a2")
	c := newID("space-a", "dev-a3")
	x := newID("space-x", "dev-x1")
	if register(t, ts.Client(), ts.URL, a, "b2m", "") != 201 {
		t.Fatal("bootstrap a")
	}
	// Pair token once.
	resp, _ := ts.Client().Do(signedReq("POST", ts.URL+"/v2/pair/token", []byte{}, a))
	var pr map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&pr)
	resp.Body.Close()
	tok := pr["pair_token"].(string)
	if register(t, ts.Client(), ts.URL, b, "b2m", tok) != 201 {
		t.Fatal("pair b")
	}
	if register(t, ts.Client(), ts.URL, c, "b2m", tok) != 403 {
		t.Fatal("pair token must be single use")
	}
	if register(t, ts.Client(), ts.URL, x, "b2a", "") != 201 {
		t.Fatal("bootstrap x")
	}
	raw := []byte("ref")
	sh := sha256.Sum256(raw)
	payload, _ := json.Marshal(map[string]any{"id": "same-id", "to_device": "dev-a2", "kind": "delta_refs", "object_type": "b2m", "ciphertext_b64": base64.StdEncoding.EncodeToString(raw), "ciphertext_sha256": hex.EncodeToString(sh[:])})
	req := signedReq("POST", ts.URL+"/v2/relay/enqueue", payload, a)
	rr := httptest.NewRecorder()
	s.Handler().ServeHTTP(rr, req)
	if rr.Code != 202 {
		t.Fatalf("first %d", rr.Code)
	}
	// New signature/nonce, same logical ID -> accepted but deduplicated.
	req = signedReq("POST", ts.URL+"/v2/relay/enqueue", payload, a)
	rr = httptest.NewRecorder()
	s.Handler().ServeHTTP(rr, req)
	if rr.Code != 202 || !bytes.Contains(rr.Body.Bytes(), []byte(`"deduplicated":true`)) {
		t.Fatalf("idempotency %d %s", rr.Code, rr.Body.String())
	}
	// Exact request replay (same nonce/signature) is rejected.
	req = signedReq("POST", ts.URL+"/v2/presence", []byte(`{"transports":["lan"]}`), a)
	rr = httptest.NewRecorder()
	s.Handler().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatal("presence first")
	}
	rr = httptest.NewRecorder()
	s.Handler().ServeHTTP(rr, req.Clone(req.Context()))
	if rr.Code != 401 {
		t.Fatalf("expected replay 401 got %d", rr.Code)
	}
	// Cross-space target is invisible.
	cross, _ := json.Marshal(map[string]any{"id": "cross-1", "to_device": "dev-x1", "kind": "delta_refs", "object_type": "b2m", "ciphertext_b64": base64.StdEncoding.EncodeToString(raw), "ciphertext_sha256": hex.EncodeToString(sh[:])})
	req = signedReq("POST", ts.URL+"/v2/relay/enqueue", cross, a)
	rr = httptest.NewRecorder()
	s.Handler().ServeHTTP(rr, req)
	if rr.Code != 404 {
		t.Fatalf("cross-space expected 404 got %d", rr.Code)
	}
}
