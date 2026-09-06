"use client";

export type Brain2ForegroundTaskKind =
  | "MODEL_INIT"
  | "ARCHIVE_IMPORT"
  | "B2M_EXPORT"
  | "B2M_IMPORT";

type ActiveTask = {
  id: number;
  kind: Brain2ForegroundTaskKind;
};

let nextTaskId = 1;
const activeTasks = new Map<number, ActiveTask>();
const waiters = new Set<() => void>();

function notifyWaiters() {
  for (const waiter of [...waiters]) waiter();
}

function hasConflictingTask(kind: Brain2ForegroundTaskKind) {
  for (const task of activeTasks.values()) {
    if (task.kind !== kind) return true;
  }
  return false;
}

async function waitForExclusiveTurn(kind: Brain2ForegroundTaskKind) {
  while (hasConflictingTask(kind)) {
    await new Promise<void>((resolve) => {
      const waiter = () => {
        waiters.delete(waiter);
        resolve();
      };
      waiters.add(waiter);
    });
  }
}

export async function runBrain2ForegroundTask<T>(
  kind: Brain2ForegroundTaskKind,
  work: () => Promise<T>,
): Promise<T> {
  await waitForExclusiveTurn(kind);
  const id = nextTaskId++;
  activeTasks.set(id, { id, kind });
  try {
    return await work();
  } finally {
    activeTasks.delete(id);
    notifyWaiters();
  }
}

export function hasActiveBrain2ForegroundTask() {
  return activeTasks.size > 0;
}
