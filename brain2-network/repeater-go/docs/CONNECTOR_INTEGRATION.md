# Brain2 Connector Integration

The Connector should treat this repeater as one transport adapter inside Brain2 Fabric.

## Send algorithm
1. Build the local append-only `B2 object` mutation and durable outbox record.
2. Determine recipient replicas that need the delta.
3. Attempt direct P2P using current presence/rendezvous candidates.
4. If direct transfer succeeds, send only the selective required objects and record ACK.
5. If peer is unavailable, encrypt a **small mutation/delta-reference control envelope** and enqueue it to the repeater.
6. Never relay the entire `.b2m`, model weights, media, or other bulk objects through this control plane.

## Receive algorithm
1. Pull encrypted relay envelopes.
2. Decrypt/verify on the endpoint.
3. Resolve referenced source objects selectively/directly.
4. Apply ordered mutation transactionally to local `B2 object` replica.
5. Preserve conflicts explicitly; no silent last-write-wins.
6. Commit local checkpoint.
7. ACK the repeater message.

## Resume
Stable envelope IDs + mutation sequence numbers make retries idempotent. A crash between pull and local commit simply results in the same envelope being pulled again.
