package api

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http/httputil"
	"testing"
)

// TestRelayWireAmplification is lab instrumentation for tiny Databox/control
// objects. It measures the current HTTP/JSON/base64/signature envelope rather
// than assuming payload bytes equal wire bytes.
func TestRelayWireAmplification(t *testing.T) {
	id := newID("lab-space", "phone")
	for _, sz := range []int{64, 1024, 4096, 16384, 60000} {
		raw := bytes.Repeat([]byte("x"), sz)
		h := sha256.Sum256(raw)
		body, _ := json.Marshal(map[string]any{
			"id":                fmt.Sprintf("dbx-%d", sz),
			"to_device":         "laptop",
			"kind":              "delta_refs",
			"object_type":       "b2m_databox",
			"ciphertext_b64":    base64.StdEncoding.EncodeToString(raw),
			"ciphertext_sha256": hex.EncodeToString(h[:]),
		})
		req := signedReq("POST", "http://b2.local/v2/relay/enqueue", body, id)
		dump, err := httputil.DumpRequest(req, true)
		if err != nil {
			t.Fatal(err)
		}
		if len(dump) <= sz {
			t.Fatalf("wire dump must include envelope")
		}
		t.Logf("raw=%d json_body=%d http1_dump=%d body_overhead=%d total_overhead=%d amplification=%.3fx",
			sz, len(body), len(dump), len(body)-sz, len(dump)-sz, float64(len(dump))/float64(sz))
	}
}

func TestRawBodyEnvelopeWireAmplification(t *testing.T) {
	id := newID("lab-space", "phone")
	for _, sz := range []int{64, 1024, 4096, 16384, 60000} {
		raw := bytes.Repeat([]byte("x"), sz)
		h := sha256.Sum256(raw)
		req := signedReq("POST", "http://b2.local/v2/relay/enqueue", raw, id)
		req.Header.Set("Content-Type", "application/vnd.brain2.relay-ciphertext")
		req.Header.Set("X-B2-Message-ID", fmt.Sprintf("dbx-%d", sz))
		req.Header.Set("X-B2-To-Device", "laptop")
		req.Header.Set("X-B2-Kind", "delta_refs")
		req.Header.Set("X-B2-Object-Type", "b2m_databox")
		req.Header.Set("X-B2-Ciphertext-SHA256", hex.EncodeToString(h[:]))
		dump, err := httputil.DumpRequest(req, true)
		if err != nil {
			t.Fatal(err)
		}
		t.Logf("raw=%d raw_http1_dump=%d total_overhead=%d amplification=%.3fx", sz, len(dump), len(dump)-sz, float64(len(dump))/float64(sz))
	}
}
