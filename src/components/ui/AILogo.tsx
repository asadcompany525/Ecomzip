interface AILogoProps {
  size?: number;
  className?: string;
}

const AILogo = ({ size = 40, className = '' }: AILogoProps) => {
  const id = `ai-logo-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AI Ecommerce"
    >
      <defs>
        <linearGradient id={`${id}-g1`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff6b35" />
          <stop offset="50%" stopColor="#f7c59f" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id={`${id}-g2`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.85" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#6366f1" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Background rounded square */}
      <rect x="4" y="4" width="72" height="72" rx="20" fill={`url(#${id}-g1)`} filter={`url(#${id}-shadow)`} />

      {/* Shopping bag body */}
      <rect x="18" y="32" width="44" height="32" rx="7" fill={`url(#${id}-g2)`} opacity="0.92" />

      {/* Bag handle */}
      <path d="M29 32 C29 22 51 22 51 32" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" />

      {/* AI neural dots — 3x2 grid inside bag */}
      <circle cx="31" cy="46" r="3" fill="#6366f1" opacity="0.85" />
      <circle cx="40" cy="46" r="3" fill="#ff6b35" opacity="0.85" />
      <circle cx="49" cy="46" r="3" fill="#6366f1" opacity="0.85" />

      {/* Connecting lines */}
      <line x1="34" y1="46" x2="37" y2="46" stroke="#6366f1" strokeWidth="1.5" opacity="0.6" />
      <line x1="43" y1="46" x2="46" y2="46" stroke="#6366f1" strokeWidth="1.5" opacity="0.6" />

      {/* Lower row dots */}
      <circle cx="35.5" cy="55" r="2.5" fill="#ff6b35" opacity="0.75" />
      <circle cx="44.5" cy="55" r="2.5" fill="#6366f1" opacity="0.75" />

      {/* Vertical lines to lower row */}
      <line x1="31" y1="49" x2="35.5" y2="52.5" stroke="#6366f1" strokeWidth="1.2" opacity="0.5" />
      <line x1="40" y1="49" x2="35.5" y2="52.5" stroke="#ff6b35" strokeWidth="1.2" opacity="0.5" />
      <line x1="40" y1="49" x2="44.5" y2="52.5" stroke="#ff6b35" strokeWidth="1.2" opacity="0.5" />
      <line x1="49" y1="49" x2="44.5" y2="52.5" stroke="#6366f1" strokeWidth="1.2" opacity="0.5" />

      {/* Small sparkle top-right */}
      <circle cx="59" cy="21" r="3" fill="white" opacity="0.9" />
      <circle cx="59" cy="21" r="1.2" fill="#ff6b35" />
    </svg>
  );
};

export default AILogo;
