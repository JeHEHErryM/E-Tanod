import { AlertTriangle, CloudUpload, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSyncStore } from '@/stores/sync';
import { flush } from '@/lib/offline/queue';

export function SyncStatus() {
  const { t } = useTranslation();
  const online = useSyncStore((s) => s.online);
  const pending = useSyncStore((s) => s.pending);
  const failed = useSyncStore((s) => s.failed);
  const syncing = useSyncStore((s) => s.syncing);

  const relevant = !online || syncing || pending > 0 || failed > 0;
  if (!relevant) return null;

  const tone = !online
    ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30'
    : failed > 0
      ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-500/30'
      : 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/30';

  const label = !online
    ? t('sync.offline')
    : syncing
      ? t('sync.syncing')
      : failed > 0
        ? t('sync.failed', { count: failed })
        : t('sync.pending', { count: pending });

  return (
    <button
      type="button"
      onClick={() => void flush()}
      disabled={!online || syncing}
      title={t('sync.syncNow')}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 transition-colors disabled:cursor-default ${tone}`}
    >
      {!online ? (
        <WifiOff className="h-3.5 w-3.5" />
      ) : syncing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : failed > 0 ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <CloudUpload className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{label}</span>
      {online && !syncing && (pending > 0 || failed > 0) ? (
        <RefreshCw className="h-3 w-3 opacity-70" />
      ) : null}
    </button>
  );
}
