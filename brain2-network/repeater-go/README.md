# B2 Network Repeater v2

Generic encrypted rendezvous/store-and-forward fallback for **B2 Network**. `.B2M`, `.B2A`, `.ASIF` and future Brain2 profiles use the same control plane.

The Repeater is deliberately **not** bulk storage. Endpoint Connectors exchange encrypted references/control messages through it when direct P2P is unavailable, then fetch actual authorized blocks through the selected data path.

Security features: Ed25519 signed requests, replay nonce protection, one-use pairing tokens for existing spaces, rate limits, payload ceiling, endpoint-owned encryption, idempotent envelope IDs.
