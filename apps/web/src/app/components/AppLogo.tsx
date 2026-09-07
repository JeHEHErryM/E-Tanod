const LOGO_ASPECT = 1408 / 768;

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
        src="/E_TanodLogo.jfif"
        alt="E-Tanod"
        className="h-full w-full object-cover"
        style={{ height: size, width: Math.round(size * LOGO_ASPECT) }}
      />
    </div>
  );
}

export function BrandWordmark({ light = false }: { light?: boolean }) {
  return <AppLogo size={36} light={light} />;
}