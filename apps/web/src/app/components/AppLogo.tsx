export function AppLogo({ size = 40, light = false }: { size?: number; light?: boolean }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-soft"
      aria-hidden="true"
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2.5 4.5 5.5v6.4c0 4.4 3.2 8.1 7.5 9.6 4.3-1.5 7.5-5.2 7.5-9.6V5.5L12 2.5Z"
          fill="currentColor"
          fillOpacity={light ? 0.95 : 1}
        />
        <path
          d="m12 16 3.2-3.2a2.3 2.3 0 0 0-3.2-3.2 2.3 2.3 0 0 0-3.2 3.2L12 16Z"
          fill="#0f3b36"
          fillOpacity={0.9}
        />
      </svg>
    </div>
  );
}

export function BrandWordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <AppLogo size={34} light={light} />
      <span
        className={`font-display text-xl font-bold tracking-tight ${
          light ? 'text-sand-50' : 'text-ink-900'
        }`}
      >
        E-Tanod
      </span>
    </span>
  );
}
