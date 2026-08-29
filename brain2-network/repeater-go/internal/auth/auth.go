package auth

import (
	"brain2labs/b2-network/internal/model"
	"brain2labs/b2-network/internal/store"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type Identity struct {
	SpaceID, DeviceID string
	Device            model.DeviceRecord
}
type Verifier struct {
	Store                      store.Store
	Skew, NonceTTL, RateWindow time.Duration
	RateLimit                  int
}

func SigningString(method, path, ts, nonce string, body []byte) string {
	h := sha256.Sum256(body)
	return strings.Join([]string{strings.ToUpper(method), path, ts, nonce, hex.EncodeToString(h[:])}, "\n")
}
func VerifySignature(pubB64, sigB64, msg string) error {
	pub, e := base64.StdEncoding.DecodeString(pubB64)
	if e != nil {
		return e
	}
	if len(pub) != ed25519.PublicKeySize {
		return errors.New("bad public key size")
	}
	sig, e := base64.StdEncoding.DecodeString(sigB64)
	if e != nil {
		return e
	}
	if !ed25519.Verify(ed25519.PublicKey(pub), []byte(msg), sig) {
		return errors.New("signature invalid")
	}
	return nil
}
func (v Verifier) Authenticate(r *http.Request, body []byte) (Identity, error) {
	s := r.Header.Get("X-B2-Space-ID")
	if s == "" {
		s = r.Header.Get("X-B2M-ID")
	}
	d := r.Header.Get("X-B2-Device-ID")
	if d == "" {
		d = r.Header.Get("X-Device-ID")
	}
	ts := r.Header.Get("X-Timestamp")
	nonce := r.Header.Get("X-Nonce")
	sig := r.Header.Get("X-Signature")
	if s == "" || d == "" || ts == "" || nonce == "" || sig == "" {
		return Identity{}, errors.New("missing auth headers")
	}
	unix, e := strconv.ParseInt(ts, 10, 64)
	if e != nil {
		return Identity{}, errors.New("bad timestamp")
	}
	t := time.Unix(unix, 0)
	if dt := time.Since(t); dt > v.Skew || dt < -v.Skew {
		return Identity{}, errors.New("timestamp outside allowed skew")
	}
	rec, e := v.Store.GetDevice(r.Context(), s, d)
	if e != nil {
		return Identity{}, errors.New("unknown device")
	}
	if e = VerifySignature(rec.PublicKeyB64, sig, SigningString(r.Method, r.URL.Path, ts, nonce, body)); e != nil {
		return Identity{}, e
	}
	ok, e := v.Store.RememberNonce(r.Context(), fmt.Sprintf("%s:%s:%s", s, d, nonce), v.NonceTTL)
	if e != nil {
		return Identity{}, e
	}
	if !ok {
		return Identity{}, errors.New("replayed nonce")
	}
	allowed, _, e := v.Store.RateLimit(r.Context(), fmt.Sprintf("%s:%s", s, d), v.RateLimit, v.RateWindow)
	if e != nil {
		return Identity{}, e
	}
	if !allowed {
		return Identity{}, errors.New("rate limit exceeded")
	}
	return Identity{SpaceID: s, DeviceID: d, Device: rec}, nil
}
