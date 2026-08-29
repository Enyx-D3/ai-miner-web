package fabric

import (
	"bytes"
	"testing"
)

func TestCDCReuseAndRouter(t *testing.T) {
	base := bytes.Repeat([]byte("abcdefghij0123456789"), 20000)
	mod := append([]byte{}, base[:10000]...)
	mod = append(mod, []byte("LOCAL INSERTION")...)
	mod = append(mod, base[10000:]...)
	a := CDCChunks(mod, 2048, 8192, 32768)
	b := CDCChunks(base, 2048, 8192, 32768)
	if MissingBytes(a, b) >= len(mod) {
		t.Fatal("CDC should reuse blocks")
	}
	s, ok := BestSource([]Source{{ID: "cloud", LatencyMS: 40, BandwidthMBps: 50, Available: true, Cost: 1}, {ID: "lan", LatencyMS: 2, BandwidthMBps: 200, Available: true}}, 1<<20)
	if !ok || s.ID != "lan" {
		t.Fatal("expected lan")
	}
	if !ShouldCompact(129, .01, 1) {
		t.Fatal("compaction threshold")
	}
}

func TestCDCResynchronizesAfterFrontInsertDelete(t *testing.T) {
	base := make([]byte, 2<<20)
	var x uint32 = 1
	for i := range base {
		x = 1664525*x + 1013904223
		base[i] = byte(x >> 24)
	}
	payload := bytes.Repeat([]byte("B2-LOCAL-DELTA-"), 64)
	inserted := append(append([]byte{}, payload...), base...)
	deleted := append([]byte{}, base[len(payload):]...)
	baseBlocks := CDCChunks(base, 2048, 8192, 32768)
	for name, mod := range map[string][]byte{"insert_front": inserted, "delete_front": deleted} {
		blocks := CDCChunks(mod, 2048, 8192, 32768)
		missing := MissingBytes(blocks, baseBlocks)
		reuse := 1 - float64(missing)/float64(len(mod))
		if reuse < 0.80 {
			t.Fatalf("%s: expected CDC to resynchronize; reuse=%0.2f%%", name, 100*reuse)
		}
	}
}
