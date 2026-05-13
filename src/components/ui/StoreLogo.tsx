interface StoreLogoProps {
  name?: string;
  size?: number;
  className?: string;
}

const StoreLogo = ({ name = 'Store', size = 40, className = '' }: StoreLogoProps) => {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');

  const fontSize = size * 0.38;
  const r = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={name}
    >
      <defs>
        <linearGradient id={`lg-${name}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(24,95%,53%)" />
          <stop offset="100%" stopColor="hsl(213,94%,48%)" />
        </linearGradient>
        <filter id={`sh-${name}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.18" />
        </filter>
      </defs>
      <rect
        x="0" y="0" width={size} height={size}
        rx={r * 0.45}
        fill={`url(#lg-${name})`}
        filter={`url(#sh-${name})`}
      />
      <text
        x={r}
        y={r + fontSize * 0.38}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill="white"
        letterSpacing="-0.5"
      >
        {initials || '?'}
      </text>
    </svg>
  );
};

export default StoreLogo;
