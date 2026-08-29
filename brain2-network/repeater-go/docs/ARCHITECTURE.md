# Brain2 Fabric `B2 object` Repeater Architecture

## Role
The repeater is a **minimal encrypted control-plane relay and rendezvous service** for the Brain2 Fabric. It is not the user's `B2 object` database and does not become the source of truth.

### Canonical transport order
1. **Direct P2P first** — peers exchange selective data directly when reachable.
2. **Repeater fallback** — tiny encrypted control messages, mutation references, session offers, checkpoint notices, wake messages, and delta references can be stored-and-forwarded.
3. **Selective data plane** — large atoms, files, images, model artifacts, and bulk `.b2m` content are fetched from the authorized source, not pushed through this relay.

## What the server stores
Minimal temporary infrastructure state only:
- `B2 object` opaque identifier
- device ID
- device public key
- supported transports
- short-lived connection candidates
- last-seen time
- optional push endpoint/token (kept server-side)
- one-time pairing tokens
- short-lived anti-replay nonces
- opaque encrypted control envelopes until ACK/TTL

It must not store plaintext conversation history, LifeWiki, project decisions, the atom bank, or full `.b2m` files.

## Stateless replicas
Every HTTP replica is stateless. Shared ephemeral state is in Redis. This allows any request to land on any pod and permits horizontal scaling behind a normal load balancer.

## Autoscaling
The deployment ships with a KEDA `ScaledObject` using two signals:
- length of `b2net:relay:pending:index` (pending encrypted control envelopes)
- average CPU utilization

Minimum replicas are kept at 2 so inbound registration/rendezvous traffic is immediately available even when there is no relay backlog.

## Offline catch-up
Envelopes are ACK-based and idempotent:
- enqueue with a stable message ID
- duplicate enqueue returns accepted + deduplicated
- pull does not delete
- recipient applies transaction idempotently on-device
- recipient ACKs only after durable application/checkpoint
- repeater deletes the opaque envelope after ACK

This fits Connector append-only delta synchronization without silently applying last-write-wins on the server.

## Failure model
- A relay pod can die without losing queued control messages.
- A recipient can disappear and later catch up until message TTL expires.
- Expired queue IDs are cleaned by a background janitor so autoscaling is not driven forever by stale entries.
- KEDA has a fallback replica count if its scaler cannot retrieve metrics.
- Kubernetes readiness/liveness probes and a PodDisruptionBudget are included.
