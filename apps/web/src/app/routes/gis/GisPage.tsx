import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Map as MapIcon, Thermometer, Pin, Info, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { PageHeader } from '@/app/components/PageHeader';
import { StatusLabel } from '@/app/components/StatusLabel';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ?? '';

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#f43f5e',
  CRITICAL: '#8b5cf6',
};

interface HeatPoint {
  id: string;
  latitude: number;
  longitude: number;
  weight: number;
  severity: string;
  reportedAt: string;
}

interface GisIncident {
  id: string;
  code: string;
  latitude: number;
  longitude: number;
  severity: string;
  status: string;
  isAnonymous: boolean;
  source: string;
  reportedAt: string;
  category: { id: string; name: string; code: string };
  barangay: { id: string; name: string } | null;
}

const STATUS_FILTERS = ['', 'PENDING', 'VERIFIED', 'RESOLVED', 'REJECTED'];

const esc = (v: string | number) =>
  String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));

const MAP_STYLES = {
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

interface GeoFeature {
  type: 'Feature';
  properties: Record<string, string | number>;
  geometry: { type: 'Point'; coordinates: [number, number] };
}

export function GisPage() {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const [status, setStatus] = useState('');
  const [showHeat, setShowHeat] = useState(true);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  // Keep the basemap in sync with the app theme (dark class on <html>)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.setStyle(isDark ? MAP_STYLES.dark : MAP_STYLES.light);
  }, [isDark, mapReady]);

  const barangayId = me?.primaryRole === 'SUPER_ADMIN' ? undefined : (me?.barangayId ?? undefined) || undefined;

  const param = (extra: Record<string, string> = {}) => {
    const params: Record<string, string> = { ...extra };
    if (status) params.status = status;
    if (barangayId) params.barangayId = barangayId;
    return params;
  };

  const heat = useQuery<{ data: HeatPoint[]; count: number }>({
    queryKey: ['gis-heat', status],
    enabled: !!(MAPBOX_TOKEN && mapReady),
    queryFn: async () => (await api.get('/gis/heatmap', { params: param() })).data,
  });

  const incidents = useQuery<{ data: GisIncident[] }>({
    queryKey: ['gis-incidents', status],
    enabled: !!(MAPBOX_TOKEN && mapReady),
    queryFn: async () => (await api.get('/gis/incidents', { params: param() })).data,
  });

const sources = useMemo(() => {
    const heatFeatures = (heat.data?.data ?? []).map(
      (p): GeoFeature => ({
        type: 'Feature',
        properties: { weight: p.weight, severity: p.severity, id: p.id },
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
      }),
    );
    const markerFeatures = (incidents.data?.data ?? []).map(
      (p): GeoFeature => ({
        type: 'Feature',
        properties: {
          code: p.code,
          severity: p.severity,
          status: p.status,
          category: p.category.name,
          barangay: p.barangay?.name ?? '—',
          reportedAt: new Date(p.reportedAt).toLocaleDateString(),
        },
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
      }),
    );
    return { heatSource: heatFeatures, markerSource: markerFeatures };
  }, [heat.data, incidents.data]);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: isDark ? MAP_STYLES.dark : MAP_STYLES.light,
      center: [120.596, 13.2231],
      zoom: 12,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
    mapRef.current = map;
    map.on('load', () => setMapReady(true));
    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const empty: GeoFeature[] = [];
    if (!map.getSource('heat')) {
      map.addSource('heat', { type: 'geojson', data: { type: 'FeatureCollection', features: empty } as object });
      map.addLayer({
        id: 'heat',
        type: 'heatmap',
        source: 'heat',
        maxzoom: 15,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 1, 0.4, 4, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(34,197,94,0)',
            0.2,
            'rgb(34,197,94)',
            0.4,
            'rgb(245,158,11)',
            0.6,
            'rgb(244,63,94)',
            0.8,
            'rgb(139,92,246)',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 18, 15, 48],
          'heatmap-opacity': 0.85,
        },
      });
    }
    if (!map.getSource('markers')) {
      map.addSource('markers', { type: 'geojson', data: { type: 'FeatureCollection', features: empty } as object });
      map.addLayer({
        id: 'markers',
        type: 'circle',
        source: 'markers',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 7, 15, 11],
          'circle-color': ['match', ['get', 'severity'], 'LOW', '#22c55e', 'MEDIUM', '#f59e0b', 'HIGH', '#f43f5e', 'CRITICAL', '#8b5cf6', '#64748b'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
        },
      });
    }

    (map.getSource('heat') as mapboxgl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: sources.heatSource,
    });
    (map.getSource('markers') as mapboxgl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: sources.markerSource,
    });

    map.setLayoutProperty('heat', 'visibility', showHeat ? 'visible' : 'none');

    const popup = new mapboxgl.Popup({
      closeButton: true,
      maxWidth: '280px',
      offset: 18,
    });
    const openPopup = (feature: GeoFeature | undefined) => {
      if (!feature) return;
      const p = feature.properties;
      popup
        .setLngLat({ lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] })
        .setHTML(
          `<div style="font-family:inherit">
             <div style="font-weight:700;color:#0f172a">${esc(p.category)}</div>
             <div style="font-size:11px;color:#475569;margin:2px 0 6px">${esc(p.code)} · ${esc(p.barangay)}</div>
             <div style="font-size:12px;color:#334155">Status: <b>${esc(p.status)}</b></div>
             <div style="font-size:11px;color:#64748b;margin-top:3px">${esc(p.reportedAt)}</div>
           </div>`,
        )
        .addTo(map);
    };
    map.on('click', 'markers', (e) => {
      const feature = e.features?.[0] as unknown as GeoFeature | undefined;
      openPopup(feature);
    });
    map.on('mouseenter', 'markers', () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', 'markers', () => (map.getCanvas().style.cursor = ''));

    return () => {
      popup.remove();
    };
  }, [mapReady, sources, showHeat]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('gis.title')} description={t('gis.desc')} icon={<MapIcon className="h-5 w-5" />} />
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
            <Info className="h-7 w-7" />
          </span>
          <div className="text-base font-bold text-ink-900">{t('gis.noTokenTitle')}</div>
          <p className="max-w-sm text-sm text-ink-500">{t('gis.noTokenDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('gis.title')} description={t('gis.desc')} icon={<MapIcon className="h-5 w-5" />} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setShowHeat((v) => !v);
            setStatus('');
          }}
          className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${
            showHeat ? 'bg-brand-700 text-white' : 'bg-white text-ink-600 border border-ink-200 hover:border-brand-300'
          }`}
        >
          <Thermometer className="h-4 w-4" /> {t('gis.showHeatmap')}
        </button>
        <div className="h-6 w-px bg-ink-200" />
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`inline-flex h-9 items-center rounded-full px-3.5 text-xs font-bold transition-colors ${
              status === s ? 'bg-ink-900 text-white dark:bg-white/20 dark:text-white' : 'bg-white text-ink-500 border border-ink-200 hover:border-ink-400'
            }`}
          >
            {s === '' ? t('gis.all') : t(`status.${s}`)}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
        <div ref={containerRef} className="h-[62vh] min-h-[420px] w-full" />
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-ink-100 bg-white/95 px-3 py-2 shadow-soft backdrop-blur">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-500">
              <Pin className="h-3.5 w-3.5" /> {t('gis.legend')}
            </span>
            {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
              <span key={sev} className="flex items-center gap-1 text-[11px] font-semibold text-ink-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {t(`gis.severity.${sev}`)}
              </span>
            ))}
          </div>
          {!mapReady ? (
            <div className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-ink-500 shadow-soft backdrop-blur">
              <Loader2 className="h-4 w-4 animate-spin" /> {t('gis.loading')}
            </div>
          ) : null}
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl bg-ink-900/85 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur dark:bg-black/70">
          {t('gis.count', { count: incidents.data?.data.length ?? 0 })}
        </div>
      </div>

      {heat.data && heat.data.count > 0 ? (
        <div className="flex flex-wrap gap-2">
          {Object.entries(SEVERITY_COLORS).map(([sev, color]) => {
            const count = (incidents.data?.data ?? []).filter((i) => i.severity === sev).length;
            return (
              <span key={sev} className="inline-flex items-center gap-1.5 rounded-full border border-ink-100 bg-white px-3 py-1.5 text-xs font-bold text-ink-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {t(`gis.severity.${sev}`)} · {count}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <StatusLabel tone="muted" label={t('gis.noData')} />
        </div>
      )}
    </div>
  );
}