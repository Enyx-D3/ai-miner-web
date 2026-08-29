# Provider Adapter Contract

## Common capture record

```text
id
provider
conversationExternalId
conversationTitle
messageExternalId
providerMessageId?
providerNodeId?
parentProviderNodeId?
sequence
role
text
url
occurredAt?
capturedAt
timestampSource
```

## ChatGPT

Primary turn roots:

```text
article[data-turn]
article[data-testid^="conversation-turn-"]
[data-testid^="conversation-turn-"]
```

Role fallback:

```text
[data-message-author-role="user"]
[data-message-author-role="assistant"]
```

Generation detection includes `data-testid="stop-button"`.

## Claude

User selectors:

```text
[data-testid="human-message"]
[data-testid="user-message"]
[data-testid="message-human"]
.font-user-message
```

Assistant selectors:

```text
.font-claude-response
[data-testid="ai-message"]
[data-testid="message-assistant"]
.font-claude-response-body
.font-claude-message
```

Preferred markdown content:

```text
.standard-markdown
.progressive-markdown
```

## Gemini

Primary semantic custom elements:

```text
user-query
model-response
```

Fallback data-test-id selectors are also included.

## Completion rule

A DOM mutation is not immediately captured. Brain2 waits until:

```text
provider is not generating
+
conversation snapshot remains stable for STABLE_MS
```

This prevents streaming partial responses from becoming canonical captures.
