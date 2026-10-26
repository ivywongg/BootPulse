type LogoProps = {
  /** "full" shows the symbol and wordmark; "icon" shows the symbol only. */
  variant?: 'full' | 'icon';
  /** "inverse" is for dark backgrounds; "mono" follows the surrounding text colour. */
  tone?: 'default' | 'inverse' | 'mono';
  /** Symbol size in pixels. */
  size?: number;
  className?: string;
};

const palette = {
  default: { tile: '#1e3a8a', line: '#ffffff', pulse: '#60a5fa', boot: '#1e3a8a', word: '#2563eb' },
  inverse: { tile: '#ffffff', line: '#1e3a8a', pulse: '#2563eb', boot: '#ffffff', word: '#93c5fd' },
  mono: { tile: 'currentColor', line: 'var(--background)', pulse: 'var(--background)', boot: 'currentColor', word: 'currentColor' },
} as const;

/** BootPulse symbol: a stepped cash line climbing into a pulse. Pure SVG, scales from 16px up. */
export function LogoMark({ size = 32, tone = 'default', title }: { size?: number; tone?: LogoProps['tone']; title?: string }) {
  const c = palette[tone ?? 'default'];
  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      height={size}
      role={title ? 'img' : undefined}
      viewBox="0 0 32 32"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <rect fill={c.tile} height="32" rx="8" width="32" />
      <path d="M6.5 24H12V18.5H17.5V13H22" fill="none" stroke={c.line} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.75" />
      <circle cx="23" cy="13" fill="none" r="4.4" stroke={c.pulse} strokeOpacity="0.5" strokeWidth="1.5" />
      <circle cx="23" cy="13" fill={c.pulse} r="2.4" />
    </svg>
  );
}

export default function Logo({ variant = 'full', tone = 'default', size = 32, className }: LogoProps) {
  if (variant === 'icon') {
    return (
      <span className={className}>
        <LogoMark size={size} title="BootPulse" tone={tone} />
      </span>
    );
  }
  const c = palette[tone];
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <LogoMark size={size} tone={tone} />
      <span className="font-bold tracking-tight" style={{ fontSize: Math.round(size * 0.72), lineHeight: 1 }}>
        <span style={{ color: c.boot }}>Boot</span>
        <span style={{ color: c.word }}>Pulse</span>
      </span>
    </span>
  );
}
