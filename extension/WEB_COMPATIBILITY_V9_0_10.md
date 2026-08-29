# Web Compatibility — Brain2 Web V9.0.10

The extension bridge remains compatible with the current Brain2 web receiver in `Brain2Provider.tsx`.

Required message sequence:

```text
BRAIN2_EXTENSION_PRESENT
→ BRAIN2_WEBSITE_CONNECT_REQUEST
→ BRAIN2_EXTENSION_CONNECT_RESPONSE
→ BRAIN2_WEBSITE_CONNECT_ACK
→ BRAIN2_EXTENSION_BATCH
→ BRAIN2_EXTENSION_ACK
```

The web receiver validates capture records before calling `ingestExtensionBatch(...)`, then ACKs only the accepted capture IDs.

No changes to the Brain2 web bridge protocol are required for extension v0.8.0.
