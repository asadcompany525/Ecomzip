import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteProgressBar() {
  const location = useLocation();
  const [width, setWidth] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => timers.current.forEach(clearTimeout);

  useEffect(() => {
    clear();
    setPhase('running');
    setWidth(0);

    const t: ReturnType<typeof setTimeout>[] = [];
    t.push(setTimeout(() => setWidth(35), 20));
    t.push(setTimeout(() => setWidth(60), 180));
    t.push(setTimeout(() => setWidth(80), 450));
    t.push(setTimeout(() => setWidth(95), 800));
    t.push(setTimeout(() => {
      setWidth(100);
      setPhase('done');
      t.push(setTimeout(() => setPhase('idle'), 400));
    }, 1000));

    timers.current = t;
    return clear;
  }, [location.pathname + location.search]);

  if (phase === 'idle') return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      style={{ background: 'transparent' }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.5))',
          boxShadow: '0 0 10px hsl(var(--primary) / 0.7)',
          transition: width === 0
            ? 'none'
            : phase === 'done'
              ? 'width 150ms ease-out, opacity 350ms ease-in 100ms'
              : 'width 350ms cubic-bezier(0.4,0,0.2,1)',
          opacity: phase === 'done' ? 0 : 1,
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  );
}
