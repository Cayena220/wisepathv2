import { compassRose, landscapeGeometry as g } from '@wisepath/shared';
import { cn } from '@/lib/utils';

/**
 * The WisePath background: parchment gradient, soft teal/gold light, a dashed "route" with
 * waypoints and a compass-rose watermark. `auth` is the strong version for the sign-in page,
 * `app` is the quiet version behind the dashboard.
 */
export function BrandBackground({ variant = 'app', className }: { variant?: 'app' | 'auth' | 'panel'; className?: string }) {
  const strong = variant !== 'app';
  const dark = variant === 'panel';
  const routeColor = dark ? '#DFB468' : '#C2872E';
  const inkColor = dark ? '#FFFDF8' : '#1F3350';

  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      <svg className="h-full w-full" viewBox={`0 0 ${g.width} ${g.height}`} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`bg-${variant}`} x1="0" y1="0" x2="1" y2="1">
            {dark ? (
              <>
                <stop offset="0%" stopColor="#1F3350" />
                <stop offset="55%" stopColor="#223A5A" />
                <stop offset="100%" stopColor="#2F5F54" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FFFDF8" />
                <stop offset="100%" stopColor="#F6F1E6" />
              </>
            )}
          </linearGradient>
          {g.blobs.map((b, i) => (
            <radialGradient key={i} id={`blob-${variant}-${i}`} cx="50%" cy="50%" r="50%">
              <stop
                offset="0%"
                stopColor={b.tone === 'teal' ? '#3E7A6C' : b.tone === 'gold' ? '#C2872E' : dark ? '#4F8F80' : '#1F3350'}
                stopOpacity={b.tone === 'navy' ? (dark ? 0.25 : 0.035) : strong ? 0.22 : 0.1}
              />
              <stop offset="100%" stopColor="#FFFDF8" stopOpacity="0" />
            </radialGradient>
          ))}
          <pattern id={`dots-${variant}`} width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill={inkColor} opacity={dark ? 0.08 : strong ? 0.06 : 0.045} />
          </pattern>
        </defs>

        <rect width={g.width} height={g.height} fill={`url(#bg-${variant})`} />
        {g.blobs.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={`url(#blob-${variant}-${i})`} />
        ))}
        <rect width={g.width} height={g.height} fill={`url(#dots-${variant})`} />

        <path d={g.routeEcho} fill="none" stroke={inkColor} strokeOpacity={dark ? 0.1 : 0.05} strokeWidth={2} strokeDasharray="2 10" strokeLinecap="round" />
        <path
          d={g.route}
          fill="none"
          stroke={routeColor}
          strokeOpacity={strong ? 0.55 : 0.28}
          strokeWidth={strong ? 3 : 2.5}
          strokeDasharray="10 12"
          strokeLinecap="round"
          className="animate-route-dash"
        />
        {g.waypoints.map((w, i) => (
          <g key={i} opacity={strong ? 0.9 : 0.5}>
            <circle cx={w.x} cy={w.y} r={w.r * 2.4} fill={routeColor} opacity={0.15} />
            <circle cx={w.x} cy={w.y} r={w.r} fill={dark ? '#1F3350' : '#FFFDF8'} stroke={routeColor} strokeWidth={2.5} />
          </g>
        ))}

        <g transform={`translate(${g.compass.x} ${g.compass.y}) scale(${g.compass.size})`} opacity={dark ? 0.16 : strong ? 0.09 : 0.05}>
          {compassRose.rings.map((r) => (
            <circle key={r} r={r} fill="none" stroke={inkColor} strokeWidth={0.012} />
          ))}
          <path d={compassRose.minor} fill={inkColor} transform="rotate(45)" />
          <path d={compassRose.major} fill={inkColor} />
        </g>
      </svg>
    </div>
  );
}
