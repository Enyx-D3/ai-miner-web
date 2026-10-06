import type { IngestionJournalRecord, JournalStatus } from "./types";

const INTERRUPTED_JOURNAL_STATES = new Set<JournalStatus>([
  "RECEIVED",
  "NORMALIZED",
  "COMMITTING",
]);

export function journalNeedsRecovery(status: JournalStatus): boolean {
  return INTERRUPTED_JOURNAL_STATES.has(status);
}

export function recoverInterruptedJournal<T extends IngestionJournalRecord>(
  journal: T,
  recoveredAt: string,
): T {
  if (!journalNeedsRecovery(journal.status)) return journal;
  return {
    ...journal,
    status: "FAILED",
    updatedAt: recoveredAt,
    error:
      "Interrupted by browser restart before atomic ingestion commit completed. " +
      "The same archive/conversation can be replayed safely.",
  } as T;
}
