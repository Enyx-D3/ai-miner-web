# Brain2 Website Bridge Contract

The extension expects the current Brain2 web app to mark its `<body>` with:

```html
<body data-brain2-ai-miner="true">
```

## Connection

```text
extension bridge → BRAIN2_EXTENSION_PRESENT
website → BRAIN2_WEBSITE_CONNECT_REQUEST
extension → BRAIN2_EXTENSION_CONNECT_RESPONSE
website → BRAIN2_WEBSITE_CONNECT_ACK
```

## Delivery

```text
extension → BRAIN2_EXTENSION_BATCH
website → ingestExtensionBatch(records)
website → BRAIN2_EXTENSION_ACK { acceptedIds }
extension → delete only accepted IDs
```

## Retry

- Every new capture pulses the configured Brain2 origin.
- A one-minute alarm also retries while capture encryption is available.
- `Send queued now` manually pulses the bridge.

## Dedupe

- Content script creates deterministic SHA-256-derived capture IDs.
- IndexedDB queue enforces unique `recordId`.
- Brain2 web ingestion returns accepted IDs.
- Only acknowledged IDs are removed.
