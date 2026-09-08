const LOGO_ASPECT = 1;

export function AppLogo({
  size = 40,
  light = false,
}: {
  size?: number;
  light?: boolean;
}) {
  return (
    <div
      style={{ height: size, width: Math.round(size * LOGO_ASPECT) }}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-soft ring-1 ${
        light ? 'ring-white/25' : 'ring-ink-100'
      }`}
      aria-hidden="true"
    >
      <img
        src="/e_tanod_logo.jfif"
        alt="E-Tanod"
        className="h-full w-full object-cover"
        style={{ height: size, width: Math.round(size * LOGO_ASPECT) }}
      />
    </div>
  );
}

export function BrandWordmark({
  light = false,
  size = 36,
  showText = true,
}: {
  light?: boolean;
  size?: number;
  showText?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <AppLogo size={size} light={light} />
      {showText ? (
        <span
          className={`font-display text-lg font-black tracking-tight ${
            light ? 'text-sand-50' : 'text-ink-900'
          }`}
        >
          E-Tanod
        </span>
      ) : null}
    </span>
  );
}