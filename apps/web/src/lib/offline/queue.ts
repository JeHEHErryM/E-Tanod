import axios from 'axios';
import { api } from '@/services/api';
import { useSyncStore } from '@/stores/sync';
import { db, newClientId, type QueueEntityType, type QueueItem } from './db';

const BATCH_SIZE = 50;

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/** True when a request failed because the network was unreachable (no HTTP response). */
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

export interface EnqueueInput {
  entityType: QueueEntityType;
  operation?: 'CREATE';
  entityId?: string;
  payload: Record<string, unknown>;
}

export async function enqueue(input: EnqueueInput): Promise<QueueItem> {
  const now = Date.now();
  const item: QueueItem = {
    clientId: newClientId(),
    entityType: input.entityType,
    operation: input.operation ?? 'CREATE',
    entityId: input.entityId,
    payload: input.payload,
    state: 'PENDING',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.put(item);
  await useSyncStore.getState().refresh();
  return item;
}

let flushing = false;

export async function flush(): Promise<void> {
  if (flushing || isOffline()) return;
  flushing = true;
  useSyncStore.getState().setSyncing(true);
  try {
    let items = (await db.all()).filter((item) => item.state !== 'SYNCING');
    let synced = false;

    while (items.length > 0) {
      const batch = items.slice(0, BATCH_SIZE);
      let results: { clientId: string; state: string; error?: string }[];
      try {
        const { data } = await api.post<{
          results: { clientId: string; state: string; error?: string }[];
        }>('/sync', {
          records: batch.map((item) => ({
            clientId: item.clientId,
            entityType: item.entityType,
            operation: item.operation,
            entityId: item.entityId,
            payload: item.payload,
          })),
        });
        results = data.results;
      } catch {
        // Network/server failure — keep everything queued and try again later.
        break;
      }

      for (const result of results) {
        const item = batch.find((candidate) => candidate.clientId === result.clientId);
        if (!item) continue;
        if (result.state === 'SYNCED') {
          await db.remove(item.clientId);
          synced = true;
        } else {
          await db.put({
            ...item,
            state: 'FAILED',
            error: result.error ?? 'Sync failed',
            attempts: item.attempts + 1,
            updatedAt: Date.now(),
          });
        }
      }

      items = items.slice(BATCH_SIZE);
    }

    if (synced) {
      useSyncStore.setState({ lastSyncedAt: Date.now() });
    }
  } catch {
    // IndexedDB or an unexpected error — keep whatever is queued and retry later.
  } finally {
    flushing = false;
    useSyncStore.getState().setSyncing(false);
    await useSyncStore.getState().refresh();
  }
}

/** Reset any items stuck in SYNCING (e.g. after a crash) back to PENDING. */
async function resetStuck(): Promise<void> {
  const items = await db.all();
  for (const item of items) {
    if (item.state === 'SYNCING') {
      await db.put({ ...item, state: 'PENDING', updatedAt: Date.now() });
    }
  }
}

let initialized = false;

/** Wire online/offline listeners and periodic flushing. Safe to call once at boot. */
export function initSync(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const store = useSyncStore.getState();
  store.setOnline(navigator.onLine);
  void resetStuck().then(() => store.refresh()).catch(() => {});

  window.addEventListener('online', () => {
    useSyncStore.getState().setOnline(true);
    void flush();
  });
  window.addEventListener('offline', () => {
    useSyncStore.getState().setOnline(false);
  });

  const interval = window.setInterval(() => {
    void flush();
  }, 30_000);

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flush();
  });

  window.addEventListener('beforeunload', () => window.clearInterval(interval));

  void flush();
}
