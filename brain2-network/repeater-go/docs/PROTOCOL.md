# Repeater Protocol v1

Base protocol header: `X-Brain2-Protocol: b2-network/1`

## Request authentication
Registered-device requests use Ed25519 signatures.

Headers:
- `X-B2-Space-ID`
- `X-B2-Device-ID`
- `X-Timestamp` — Unix seconds
- `X-Nonce` — unique random nonce
- `X-Signature` — base64 Ed25519 signature

Signing string:

```text
METHOD
/path/without/query
TIMESTAMP
NONCE
SHA256_HEX(raw_body)
```

The server verifies timestamp skew, device membership, signature, one-time nonce, and per-device rate limit.

## Bootstrap and pairing
The first device creates a high-entropy `.b2m` ID and self-registers with `bootstrap=true`.

A later device cannot join merely by knowing the `.b2m` ID. An already-authorized device requests a 5-minute, single-use pairing token from:

`POST /v1/pairing/token`

The new device self-signs its registration and includes that pairing token.

## Presence/rendezvous
`POST /v1/presence` publishes short-lived transport/candidate information.

`GET /v1/rendezvous/{device_id}` returns same-`B2 object` public-key + fresh connection candidates so clients can try direct P2P before falling back to relay.

Push tokens are never returned to peers.

## Relay envelope
`POST /v1/relay/enqueue`

Allowed kinds:
- `wake`
- `session_offer`
- `session_answer`
- `delta_refs`
- `mutation_refs`
- `checkpoint`
- `ack_hint`
- `control`

The payload is opaque ciphertext. Default decoded payload ceiling is **64 KiB**. Oversized payloads return HTTP 413 with `control_plane_only` so clients use the selective/direct data plane instead.

The server verifies the ciphertext SHA-256 only for transport integrity; it cannot decrypt the payload.

## Pull / ACK
`GET /v1/relay/pull?wait_ms=20000&limit=50`

Pull is a bounded long poll. Messages stay durable until recipient ACK or TTL.

`POST /v1/relay/ack`

```json
{"ids":["message-id-1","message-id-2"]}
```

The Connector should ACK only after its local append-only mutation has been durably applied and checkpointed.
