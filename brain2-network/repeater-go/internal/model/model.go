package model

import "time"

const (
	ProtocolVersion  = "b2-network/2"
	GlobalPendingKey = "b2net:relay:pending:index"
)

type DeviceRecord struct {
	SpaceID      string    `json:"space_id"`
	SpaceKind    string    `json:"space_kind"`
	DeviceID     string    `json:"device_id"`
	PublicKeyB64 string    `json:"public_key_b64"`
	Transports   []string  `json:"transports,omitempty"`
	Candidates   []string  `json:"candidates,omitempty"`
	Capabilities []string  `json:"capabilities,omitempty"`
	LastSeen     time.Time `json:"last_seen"`
	RegisteredAt time.Time `json:"registered_at"`
	Protocol     string    `json:"protocol"`
}

type RegisterRequest struct {
	SpaceID      string   `json:"space_id"`
	SpaceKind    string   `json:"space_kind"`
	DeviceID     string   `json:"device_id"`
	PublicKeyB64 string   `json:"public_key_b64"`
	PairToken    string   `json:"pair_token,omitempty"`
	Transports   []string `json:"transports,omitempty"`
	Capabilities []string `json:"capabilities,omitempty"`
}

type PresenceRequest struct{ Transports, Candidates, Capabilities []string }

type RendezvousResponse struct {
	DeviceID       string    `json:"device_id"`
	PublicKeyB64   string    `json:"public_key_b64"`
	Transports     []string  `json:"transports,omitempty"`
	Candidates     []string  `json:"candidates,omitempty"`
	Capabilities   []string  `json:"capabilities,omitempty"`
	LastSeen       time.Time `json:"last_seen"`
	DirectP2PFirst bool      `json:"direct_p2p_first"`
	RelayFallback  bool      `json:"relay_fallback"`
}

type RelayEnvelope struct {
	ID               string    `json:"id"`
	SpaceID          string    `json:"space_id"`
	SpaceKind        string    `json:"space_kind"`
	ObjectType       string    `json:"object_type,omitempty"`
	FromDevice       string    `json:"from_device"`
	ToDevice         string    `json:"to_device"`
	Kind             string    `json:"kind"`
	MutationSeq      uint64    `json:"mutation_seq,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	ExpiresAt        time.Time `json:"expires_at"`
	CiphertextB64    string    `json:"ciphertext_b64"`
	CiphertextSHA256 string    `json:"ciphertext_sha256"`
	Protocol         string    `json:"protocol"`
}

type EnqueueRequest struct {
	ID               string `json:"id"`
	ToDevice         string `json:"to_device"`
	Kind             string `json:"kind"`
	ObjectType       string `json:"object_type,omitempty"`
	MutationSeq      uint64 `json:"mutation_seq,omitempty"`
	TTLSeconds       int    `json:"ttl_seconds,omitempty"`
	CiphertextB64    string `json:"ciphertext_b64"`
	CiphertextSHA256 string `json:"ciphertext_sha256"`
}
type AckRequest struct {
	IDs []string `json:"ids"`
}
type PullResponse struct {
	Messages []RelayEnvelope `json:"messages"`
	Cursor   string          `json:"cursor,omitempty"`
}
