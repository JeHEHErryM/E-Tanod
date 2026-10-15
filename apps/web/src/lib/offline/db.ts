export type QueueEntityType = 'CHECKPOINT_SCAN' | 'INCIDENT' | 'PATROL_LOCATION';
export type QueueState = 'PENDING' | 'SYNCING' | 'FAILED';

export interface QueueItem {
  clientId: string;
  entityType: QueueEntityType;
  operation: 'CREATE';
  entityId?: string;
  payload: Record<string, unknown>;
  state: QueueState;
  error?: string;
  attempts: number;
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = 'e-tanod-offline';
const DB_VERSION = 1;
const STORE = 'queue';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'clientId' });
        store.createIndex('state', 'state', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      }),
  );
}

export function newClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const db = {
  put(item: QueueItem) {
    return tx('readwrite', (store) => store.put(item));
  },
  all(): Promise<QueueItem[]> {
    return tx('readonly', (store) => store.getAll() as IDBRequest<QueueItem[]>);
  },
  remove(clientId: string) {
    return tx('readwrite', (store) => store.delete(clientId));
  },
  clear() {
    return tx('readwrite', (store) => store.clear());
  },
};
