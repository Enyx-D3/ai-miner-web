# Security Model

## Design goals
- Server does not possess `B2 object` plaintext.
- Device identity is Ed25519-based.
- Existing `B2 object` membership requires a single-use pairing token.
- Signed requests are replay-protected with timestamp + nonce.
- Relay payload size is strictly bounded to keep the repeater out of the bulk-data path.
- Cross-`B2 object` rendezvous and relay routing are rejected.
- Push tokens are stored only as server-side metadata and are not exposed through rendezvous.

## Encryption responsibility
End-to-end payload encryption belongs to the Brain2 Connector endpoints. The repeater accepts **already encrypted ciphertext**. This project intentionally does not invent a new cryptographic envelope format; the Connector should use the project's approved endpoint encryption/session protocol.

## Reverse proxy requirements
Production ingress should provide:
- TLS 1.3 where supported
- request size limits
- DDoS/WAF/rate controls
- trustworthy forwarded-client-IP configuration
- access logs without bodies or sensitive headers

`X-Forwarded-For` should only be trusted from your own ingress/load balancer. If deployed directly to the Internet, strip untrusted forwarded headers before the app.

## Redis
Use managed Redis with TLS, ACL credentials, private networking, encryption at rest, backups appropriate to the ephemeral control-plane SLA, and no public Internet exposure.
