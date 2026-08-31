import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { api, getErrorMessage } from '@/services/api';
import { Button, Badge, Card } from '@e-tanod/ui';
import type { ScanResult } from '@e-tanod/types';

interface ScanResponse {
  result: ScanResult;
  failureReason: string | null;
  scannedAt: string;
  checkpoint: { id: string; code: string; name: string } | null;
}

interface ActiveSession {
  id: string;
  startedAt: string;
  patrolAssignment: {
    patrolSchedule: { id: string; title: string; scheduledDate: string; startTime: string; endTime: string };
  };
  checkpointScans: { checkpoint: { id: string; name: string }; result: string; scannedAt: string }[];
}

const scanTone: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  VALID: 'success',
  DUPLICATE: 'warning',
  NOT_IN_PATROL: 'warning',
  INACTIVE: 'warning',
  LOCATION_UNAVAILABLE: 'warning',
  OUTSIDE_RADIUS: 'danger',
  INVALID: 'danger',
};

export function ScanPage() {
  const user = useAuthStore((s) => s.user);
  const isTanod = user?.primaryRole === 'TANOD';
  const qc = useQueryClient();
  const [token, setToken] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null);

  const active = useQuery<ActiveSession | null>({
    queryKey: ['active-session'],
    queryFn: async () => (await api.get<ActiveSession | null>('/patrol/session/active')).data,
  });

  const [hasLocation, setHasLocation] = useState(false);

  const locate = () =>
    new Promise<{ latitude: number; longitude: number; accuracy?: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this device'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        (err) => reject(new Error(err.message)),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    });

  const captureLocation = async () => {
    setLocationError(null);
    try {
      await locate();
      setHasLocation(true);
    } catch (e) {
      setHasLocation(false);
      setLocationError(getErrorMessage(e));
    }
  };

  const scan = useMutation({
    mutationFn: async () => {
      const pos = await locate();
      const res = await api.post<ScanResponse>('/checkpoints/scan', {
        token: token.trim(),
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setLastResult(data);
      setHasLocation(true);
      if (data.result === 'VALID') {
        qc.invalidateQueries({ queryKey: ['active-session'] });
      }
    },
    onError: (e) => setLocationError(getErrorMessage(e)),
  });

  const resultTone = lastResult ? (scanTone[lastResult.result] ?? 'info') : 'info';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Checkpoint Scan</h1>
        <p className="text-sm text-gray-500">
          {isTanod ? 'Scan a QR code to verify a checkpoint during your patrol' : 'Checkpoint scan verification'}
        </p>
      </div>

      {isTanod && active.data ? (
        <Card title="Active Patrol">
          <div className="text-sm text-gray-700">
            <span className="font-medium">{active.data.patrolAssignment.patrolSchedule.title}</span> ·{' '}
            <span className="text-gray-500">
              verified {active.data.checkpointScans.filter((s) => s.result === 'VALID').length} checkpoint(s)
            </span>
          </div>
        </Card>
      ) : null}

      <Card title="Scan Checkpoint">
        <div className="space-y-4">
          {!hasLocation ? (
            <div>
              <p className="mb-2 text-sm text-gray-500">GPS location is required to validate your position against the checkpoint radius.</p>
              <Button type="button" variant="secondary" onClick={captureLocation}>
                Capture Location
              </Button>
              {locationError ? <p className="mt-2 text-sm text-red-600">{locationError}</p> : null}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              Location captured
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">QR token</label>
            <div className="flex gap-2">
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste the scanned QR code value (e.g. qr_...) or scan with a camera app"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <Button
                onClick={() => scan.mutate()}
                disabled={!token.trim() || !hasLocation || scan.isPending}
              >
                Verify
              </Button>
            </div>
            {!isTanod ? (
              <p className="mt-1 text-xs text-gray-400">Only an active patrol tanod can verify a checkpoint.</p>
            ) : null}
          </div>
        </div>
      </Card>

      {lastResult ? (
        <Card title="Scan Result">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge tone={resultTone}>{lastResult.result}</Badge>
              {lastResult.checkpoint ? (
                <span className="text-sm font-medium text-gray-800">
                  {lastResult.checkpoint.name} ({lastResult.checkpoint.code})
                </span>
              ) : (
                <span className="text-sm text-gray-500">No checkpoint matched</span>
              )}
            </div>
            {lastResult.failureReason ? (
              <p className="text-sm text-gray-600">{lastResult.failureReason}</p>
            ) : null}
            <p className="text-xs text-gray-400">
              Scanned at {new Date(lastResult.scannedAt).toLocaleTimeString()}
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
