self.onmessage = (event: MessageEvent<{ id: number; op: string; payload?: unknown }>) => {
  const { id, op, payload } = event.data;
  try {
    if (op === "rank") {
      const { query, items, limit } = (payload ?? {}) as {
        query?: string;
        items?: Array<{ id: string; text: string; kind?: string; [key: string]: unknown }>;
        limit?: number;
      };
      const terms = String(query ?? "").toLowerCase().trim().split(/\s+/).filter(Boolean);
      const ranked = (items ?? [])
        .map((item) => {
          const text = String(item.text ?? "").toLowerCase();
          let score = 0;
          for (const term of terms) {
            const index = text.indexOf(term);
            if (index >= 0) score += 10 + Math.max(0, 10 - index / 20);
          }
          return { ...item, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)))
        .slice(0, Math.max(1, limit ?? 32));
      self.postMessage({ id, ok: true, result: ranked });
      return;
    }
    throw new Error(`Unknown worker op: ${op}`);
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};

export {};
