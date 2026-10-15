import { create } from 'zustand';
import { db } from '@/lib/offline/db';

interface SyncState {
  online: boolean;
  syncing: boolean;
  pending: number;
  failed: number;
  lastSyncedAt: number | null;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  refresh: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set) => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  syncing: false,
  pending: 0,
  failed: 0,
  lastSyncedAt: null,

  setOnline: (online) => set({ online }),
  setSyncing: (syncing) => set({ syncing }),

  async refresh() {
    try {
      const items = await db.all();
      let pending = 0;
      let failed = 0;
      for (const item of items) {
        if (item.state === 'FAILED') failed += 1;
        else pending += 1;
      }
      set({ pending, failed });
    } catch {
      // IndexedDB unavailable (e.g. private mode) — leave counts unchanged.
    }
  },
}));
