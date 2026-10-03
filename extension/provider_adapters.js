(() => {
  if (globalThis.Brain2ProviderAdapters?.version >= 2) return;

  function fallbackConversationId(id, locationLike) {
    return `${id}:${locationLike.pathname || ""}${locationLike.search || ""}`;
  }

  function providerTitle(id, documentLike, helpers) {
    return helpers.cleanText(documentLike.title)
      .replace(/\s*[|–—-]\s*(ChatGPT|Claude|Gemini).*$/i, "")
      .replace(/^Gemini\s*[-–—|]\s*/i, "") || `${id} conversation`;
  }

  const adapters = {
    chatgpt: {
      id: "chatgpt",
      hosts: ["chatgpt.com"],
      capabilities: ["live-capture", "native-message-id", "generation-state"],
      conversationId(locationLike) {
        const parts = String(locationLike.pathname || "").split("/").filter(Boolean);
        const c = parts.indexOf("c");
        return c >= 0 && parts[c + 1] ? parts[c + 1] : fallbackConversationId(this.id, locationLike);
      },
      conversationTitle(documentLike, _locationLike, helpers) {
        return providerTitle(this.id, documentLike, helpers);
      },
      isGenerating(documentLike, helpers) {
        return helpers.anyVisible(documentLike, [
          '[data-testid="stop-button"]',
          'button[aria-label*="Stop generating" i]',
          'button[aria-label*="Stop streaming" i]'
        ]);
      },
      textFromRoot(root, _role, helpers) {
        const roleNode = root.matches?.('[data-message-author-role]')
          ? root
          : root.querySelector?.('[data-message-author-role]');
        if (roleNode) {
          const markdown = roleNode.querySelector?.('.markdown, .whitespace-pre-wrap');
          return helpers.cleanText((markdown || roleNode).innerText || (markdown || roleNode).textContent);
        }
        const markdown = root.querySelector?.('.markdown, .whitespace-pre-wrap');
        if (markdown) return helpers.cleanText(markdown.innerText || markdown.textContent);
        return helpers.cleanText(root.innerText || root.textContent);
      },
      extractTurns(documentLike, helpers) {
        const selector = [
          'section[data-turn="user"]', 'section[data-turn="assistant"]',
          'article[data-turn="user"]', 'article[data-turn="assistant"]',
          'section[data-testid^="conversation-turn-"]',
          'article[data-testid^="conversation-turn-"]',
          '[data-message-author-role="user"]', '[data-message-author-role="assistant"]'
        ].join(',');
        const roots = [...documentLike.querySelectorAll(selector)];
        const items = [];
        for (const root of roots) {
          const roleNode = root.matches?.('[data-message-author-role]')
            ? root
            : root.querySelector?.('[data-message-author-role]');
          const roleRaw = root.getAttribute?.("data-turn") ||
            roleNode?.getAttribute?.("data-message-author-role") || "";
          const role = roleRaw === "user" ? "user" : roleRaw === "assistant" ? "assistant" : null;
          if (!role) continue;
          const canonicalRoot = root.closest?.(
            'section[data-turn],article[data-turn],section[data-testid^="conversation-turn-"],article[data-testid^="conversation-turn-"]'
          ) || root;
          const text = this.textFromRoot(canonicalRoot, role, helpers);
          if (text.length < 2) continue;
          const t = helpers.timeFrom(canonicalRoot);
          items.push({
            role,
            text,
            providerMessageId: canonicalRoot.getAttribute?.("data-message-id") || undefined,
            providerNodeId: helpers.idFrom(canonicalRoot),
            occurredAt: t.value,
            timestampSource: t.source
          });
        }
        return {
          turns: helpers.uniqueTurns(items),
          selectorMode: roots.length ? "chatgpt-semantic-turns" : "chatgpt-none"
        };
      }
    },

    claude: {
      id: "claude",
      hosts: ["claude.ai"],
      capabilities: ["live-capture", "native-node-id", "generation-state"],
      conversationId(locationLike) {
        const parts = String(locationLike.pathname || "").split("/").filter(Boolean);
        const chat = parts.indexOf("chat");
        return chat >= 0 && parts[chat + 1] ? parts[chat + 1] : fallbackConversationId(this.id, locationLike);
      },
      conversationTitle(documentLike, _locationLike, helpers) {
        const header = documentLike.querySelector?.('[data-testid="page-header"]');
        const text = helpers.cleanText(header?.innerText);
        if (text) return text.split("\n")[0];
        return providerTitle(this.id, documentLike, helpers);
      },
      isGenerating(documentLike, helpers) {
        return helpers.anyVisible(documentLike, [
          '[data-is-streaming="true"]',
          'button[aria-label*="Stop" i]',
          '[data-testid*="stop" i]'
        ]);
      },
      textFromRoot(root, role, helpers) {
        if (role === "assistant") {
          const actual = root.querySelector?.(
            '.row-start-2 .standard-markdown, .row-start-2 .progressive-markdown, .standard-markdown, .progressive-markdown'
          );
          if (actual) {
            return helpers.cleanText(actual.innerText || actual.textContent)
              .replace(/^Claude responded:\s*/i, "");
          }
        }
        return helpers.cleanText(root.innerText || root.textContent)
          .replace(/^You said:\s*/i, "")
          .replace(/^Claude responded:\s*/i, "");
      },
      extractTurns(documentLike, helpers) {
        const selector = [
          '[data-testid="user-message"]', '[data-testid="human-message"]',
          '[data-testid="message-human"]', '.font-user-message',
          '.font-claude-response', '[data-testid="ai-message"]',
          '[data-testid="message-assistant"]', '.font-claude-message'
        ].join(',');
        const nodes = helpers.documentOrder(
          [...documentLike.querySelectorAll(selector)].map((node) => ({ node }))
        );
        const items = [];
        for (const { node } of nodes) {
          let role = null;
          if (node.matches?.(
            '[data-testid="user-message"],[data-testid="human-message"],[data-testid="message-human"],.font-user-message'
          )) role = "user";
          if (node.matches?.(
            '.font-claude-response,[data-testid="ai-message"],[data-testid="message-assistant"],.font-claude-message'
          )) role = "assistant";
          if (!role) continue;
          const text = this.textFromRoot(node, role, helpers);
          if (text.length < 2) continue;
          const messageRoot = node.closest?.('[data-testid*="message"],article,section') || node;
          const t = helpers.timeFrom(messageRoot);
          items.push({
            role,
            text,
            providerMessageId: messageRoot.getAttribute?.("data-message-id") || undefined,
            providerNodeId: helpers.idFrom(messageRoot),
            occurredAt: t.value,
            timestampSource: t.source
          });
        }
        return {
          turns: helpers.uniqueTurns(items),
          selectorMode: nodes.length ? "claude-semantic-turns" : "claude-none"
        };
      }
    },

    gemini: {
      id: "gemini",
      hosts: ["gemini.google.com"],
      capabilities: ["live-capture", "native-node-id", "generation-state"],
      conversationId(locationLike) {
        const parts = String(locationLike.pathname || "").split("/").filter(Boolean);
        const app = parts.indexOf("app");
        return app >= 0 && parts[app + 1] ? parts[app + 1] : fallbackConversationId(this.id, locationLike);
      },
      conversationTitle(documentLike, _locationLike, helpers) {
        return providerTitle(this.id, documentLike, helpers);
      },
      isGenerating(documentLike, helpers) {
        return helpers.anyVisible(documentLike, [
          'button[aria-label*="Stop response" i]',
          'button[aria-label*="Stop" i]',
          '[data-test-id*="stop" i]'
        ]);
      },
      extractTurns(documentLike, helpers) {
        const selector = [
          'user-query', 'model-response', 'message-content',
          '.query-text', '.user-query', '.model-response-text', '.response-content',
          '[data-message-author="user"]', '[data-message-author="assistant"]',
          '[data-test-id="user-query"]', '[data-test-id="model-response"]'
        ].join(',');
        const nodes = helpers.documentOrder(
          [...documentLike.querySelectorAll(selector)].map((node) => ({ node }))
        );
        const items = [];
        for (const { node } of nodes) {
          let role = null;
          if (node.matches?.(
            'user-query,.query-text,.user-query,[data-message-author="user"],[data-test-id="user-query"]'
          )) role = "user";
          if (node.matches?.(
            'model-response,message-content,.model-response-text,.response-content,[data-message-author="assistant"],[data-test-id="model-response"]'
          )) role = "assistant";
          if (!role) continue;
          const text = helpers.cleanText(node.innerText || node.textContent);
          if (text.length < 2) continue;
          const messageRoot = node.closest?.(
            '[data-message-id],[data-test-id],article,section,user-query,model-response'
          ) || node;
          const t = helpers.timeFrom(messageRoot);
          items.push({
            role,
            text,
            providerMessageId: messageRoot.getAttribute?.("data-message-id") || undefined,
            providerNodeId: helpers.idFrom(messageRoot),
            occurredAt: t.value,
            timestampSource: t.source
          });
        }
        return {
          turns: helpers.uniqueTurns(items),
          selectorMode: nodes.length ? "gemini-semantic-turns" : "gemini-none"
        };
      }
    }
  };

  function resolve(hostname) {
    const host = String(hostname || "").toLowerCase();
    return Object.values(adapters).find((adapter) =>
      adapter.hosts.some((item) => host === item || host.endsWith(`.${item}`))
    ) ?? null;
  }

  for (const adapter of Object.values(adapters)) Object.freeze(adapter.capabilities);
  globalThis.Brain2ProviderAdapters = Object.freeze({
    version: 2,
    adapters: Object.freeze(adapters),
    resolve
  });
})();
