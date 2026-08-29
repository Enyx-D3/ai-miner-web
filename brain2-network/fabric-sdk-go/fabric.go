package fabric

import (
	"crypto/sha256"
	"encoding/hex"
	"math"
)

type Block struct {
	Offset, Size int
	Hash         string
}

func sum(b []byte) string { h := sha256.Sum256(b); return hex.EncodeToString(h[:]) }
func FixedChunks(data []byte, size int) []Block {
	if size <= 0 {
		size = 65536
	}
	out := []Block{}
	for i := 0; i < len(data); i += size {
		e := i + size
		if e > len(data) {
			e = len(data)
		}
		out = append(out, Block{i, e - i, sum(data[i:e])})
	}
	return out
}

func CDCChunks(data []byte, minSize, avgSize, maxSize int) []Block {
	if minSize <= 0 {
		minSize = 16384
	}
	if avgSize < minSize {
		avgSize = minSize * 4
	}
	if maxSize < avgSize {
		maxSize = avgSize * 4
	}

	// Use a content-window fingerprint rather than an offset-dependent cut rule.
	// Normal cuts use the requested average-size mask. If a pathological input
	// (for example highly periodic text) produces no mask hit before maxSize,
	// choose the minimum fingerprint after avgSize. This keeps the fallback
	// content-defined instead of forcing a position-defined maxSize boundary,
	// which is critical for resynchronization after insert/delete edits.
	bits := int(math.Round(math.Log2(float64(avgSize))))
	if bits < 1 {
		bits = 1
	}
	if bits > 62 {
		bits = 62
	}
	mask := uint64((uint64(1) << uint(bits)) - 1)
	const base uint64 = 257
	const window = 64
	var pow uint64 = 1
	for i := 0; i < window; i++ {
		pow *= base
	}

	out := []Block{}
	for start := 0; start < len(data); {
		end := start + maxSize
		if end > len(data) {
			end = len(data)
		}
		lo := start + minSize
		if lo >= end {
			out = append(out, Block{start, end - start, sum(data[start:end])})
			start = end
			continue
		}

		// Fingerprint only the last `window` bytes ending at candidate p.
		// This makes the fingerprint independent of absolute byte offset.
		ws := lo - window
		if ws < 0 {
			ws = 0
		}
		var h uint64
		for _, b := range data[ws:lo] {
			h = h*base + uint64(b) + 1
		}

		fallbackStart := start + avgSize
		if fallbackStart > end {
			fallbackStart = end
		}
		bestSet := false
		var bestHash uint64
		bestPos := end
		cut := 0

		for p := lo; ; p++ {
			if p >= fallbackStart && (!bestSet || h < bestHash) {
				bestSet = true
				bestHash = h
				bestPos = p
			}
			if h&mask == 0 {
				cut = p
				break
			}
			if p >= end {
				break
			}

			// Advance fingerprint from window ending at p to window ending at p+1.
			newByte := data[p]
			h = h*base + uint64(newByte) + 1
			if p >= window {
				old := data[p-window]
				h -= (uint64(old) + 1) * pow
			}
		}
		if cut == 0 {
			if bestSet {
				cut = bestPos
			} else {
				cut = end
			}
		}
		if cut <= start {
			cut = end
		}
		out = append(out, Block{start, cut - start, sum(data[start:cut])})
		start = cut
	}
	return out
}

func MissingBytes(local, remote []Block) int {
	have := map[string]bool{}
	for _, b := range remote {
		have[b.Hash] = true
	}
	n := 0
	for _, b := range local {
		if !have[b.Hash] {
			n += b.Size
		}
	}
	return n
}

type Source struct {
	ID, Transport                  string
	LatencyMS, BandwidthMBps, Cost float64
	Available                      bool
}

func ScoreSource(s Source, bytes int) float64 {
	if !s.Available {
		return math.Inf(1)
	}
	xfer := float64(bytes) / (1024 * 1024) / math.Max(s.BandwidthMBps, .001) * 1000
	return s.LatencyMS + xfer + 25*s.Cost
}
func BestSource(a []Source, bytes int) (Source, bool) {
	best := Source{}
	v := math.Inf(1)
	ok := false
	for _, s := range a {
		z := ScoreSource(s, bytes)
		if z < v {
			best = s
			v = z
			ok = true
		}
	}
	return best, ok
}
func ShouldCompact(depth int, deltaRatio, replayMS float64) bool {
	return depth > 128 || deltaRatio > .35 || replayMS > 250
}
