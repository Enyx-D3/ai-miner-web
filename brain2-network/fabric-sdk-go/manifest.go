package fabric

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"errors"
)

var compactManifestMagic = []byte{'B', '2', 'M', 'F', 1}

// CompactManifest encodes a sequential block inventory without JSON field names
// or hex expansion. Offsets are implicit from cumulative sizes; hashes are the
// raw 32-byte SHA-256 values already used by Block.Hash.
func CompactManifest(blocks []Block) ([]byte, error) {
	// 5-byte magic + count + roughly 32-byte hash and short size varint/block.
	out := make([]byte, 0, len(compactManifestMagic)+10+len(blocks)*35)
	out = append(out, compactManifestMagic...)
	var tmp [10]byte
	n := binary.PutUvarint(tmp[:], uint64(len(blocks)))
	out = append(out, tmp[:n]...)
	for _, b := range blocks {
		if b.Size < 0 {
			return nil, errors.New("negative block size")
		}
		n = binary.PutUvarint(tmp[:], uint64(b.Size))
		out = append(out, tmp[:n]...)
		h, err := hex.DecodeString(b.Hash)
		if err != nil || len(h) != sha256.Size {
			return nil, errors.New("block hash must be SHA-256 hex")
		}
		out = append(out, h...)
	}
	return out, nil
}

// ParseCompactManifest validates and reconstructs sequential block offsets.
func ParseCompactManifest(data []byte) ([]Block, error) {
	if len(data) < len(compactManifestMagic) {
		return nil, errors.New("manifest too short")
	}
	for i := range compactManifestMagic {
		if data[i] != compactManifestMagic[i] {
			return nil, errors.New("bad manifest magic/version")
		}
	}
	p := len(compactManifestMagic)
	count, n := binary.Uvarint(data[p:])
	if n <= 0 {
		return nil, errors.New("bad manifest count")
	}
	p += n
	// Protect callers from hostile count values before allocation.
	if count > uint64((len(data)-p)/sha256.Size)+1 {
		return nil, errors.New("manifest count exceeds payload")
	}
	out := make([]Block, 0, int(count))
	offset := 0
	for i := uint64(0); i < count; i++ {
		if p >= len(data) {
			return nil, errors.New("truncated block size")
		}
		sz, n := binary.Uvarint(data[p:])
		if n <= 0 {
			return nil, errors.New("bad block size")
		}
		p += n
		if sz > uint64(^uint(0)>>1) {
			return nil, errors.New("block size overflows int")
		}
		if len(data)-p < sha256.Size {
			return nil, errors.New("truncated block hash")
		}
		h := hex.EncodeToString(data[p : p+sha256.Size])
		p += sha256.Size
		out = append(out, Block{Offset: offset, Size: int(sz), Hash: h})
		offset += int(sz)
	}
	if p != len(data) {
		return nil, errors.New("trailing manifest bytes")
	}
	return out, nil
}

// ManifestRoot is the stable content address used to refer to a previously
// exchanged manifest without resending its complete block inventory.
func ManifestRoot(manifest []byte) string {
	h := sha256.Sum256(manifest)
	return hex.EncodeToString(h[:])
}
