package fabric

import (
	"bytes"
	"testing"
)

func TestCompactManifestRoundTripAndRoot(t *testing.T) {
	data := bytes.Repeat([]byte("Brain2-Databox-current-truth-"), 10000)
	blocks := CDCChunks(data, 2048, 8192, 32768)
	m, err := CompactManifest(blocks)
	if err != nil {
		t.Fatal(err)
	}
	got, err := ParseCompactManifest(m)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != len(blocks) {
		t.Fatalf("count %d != %d", len(got), len(blocks))
	}
	for i := range blocks {
		if got[i] != blocks[i] {
			t.Fatalf("block %d mismatch: %+v != %+v", i, got[i], blocks[i])
		}
	}
	if ManifestRoot(m) == "" {
		t.Fatal("empty root")
	}
	if len(m) >= len(blocks)*64 {
		t.Fatalf("compact manifest unexpectedly large: %d", len(m))
	}
}

func TestCompactManifestRejectsCorruption(t *testing.T) {
	blocks := FixedChunks([]byte("abcdef"), 2)
	m, err := CompactManifest(blocks)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ParseCompactManifest(m[:len(m)-1]); err == nil {
		t.Fatal("expected truncated manifest error")
	}
	bad := append([]byte(nil), m...)
	bad[0] = 'X'
	if _, err := ParseCompactManifest(bad); err == nil {
		t.Fatal("expected magic error")
	}
}
