import { useRef, useState, useCallback, useEffect, ReactNode, Children } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  children: ReactNode;
  itemWidth?: number;
  gap?: number;
  desktopGrid?: string;
}

const SwipeCarousel = ({
  children,
  itemWidth = 160,
  gap = 12,
  desktopGrid = 'md:grid-cols-4 lg:grid-cols-5',
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const items = Children.toArray(children);
  const total = items.length;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const updateState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const sl = el.scrollLeft;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanLeft(sl > 4);
    setCanRight(sl < maxScroll - 4);
    const itemW = itemWidth + gap;
    const idx = Math.round(sl / itemW);
    setActiveIndex(Math.min(idx, total - 1));
  }, [itemWidth, gap, total]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateState, { passive: true });
    updateState();
    return () => el.removeEventListener('scroll', updateState);
  }, [updateState]);

  const scrollBy = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = (itemWidth + gap) * 2;
    el.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  const scrollToIndex = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * (itemWidth + gap), behavior: 'smooth' });
  };

  /* ── Desktop: just a regular grid ─────────────────── */
  if (!isMobile) {
    return (
      <div className={`grid gap-3 md:gap-4 ${desktopGrid}`}>
        {items}
      </div>
    );
  }

  /* ── Mobile: swipe carousel ──────────────────────── */
  return (
    <div className="relative -mx-4">
      {/* Left arrow */}
      <AnimatePresence>
        {canLeft && (
          <motion.button
            key="left"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={() => scrollBy('left')}
            className="absolute left-1 z-10 bg-white/90 dark:bg-card/90 backdrop-blur shadow-md rounded-full h-8 w-8 flex items-center justify-center border border-border/50 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            style={{ top: 'calc(50% - 28px)' }}
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Right arrow */}
      <AnimatePresence>
        {canRight && (
          <motion.button
            key="right"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={() => scrollBy('right')}
            className="absolute right-1 z-10 bg-white/90 dark:bg-card/90 backdrop-blur shadow-md rounded-full h-8 w-8 flex items-center justify-center border border-border/50 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            style={{ top: 'calc(50% - 28px)' }}
          >
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Track */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-none px-4 pb-1"
        style={{
          gap: `${gap}px`,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch' as any,
        }}
      >
        {items.map((child, i) => (
          <div
            key={i}
            className="shrink-0"
            style={{ width: `${itemWidth}px`, scrollSnapAlign: 'start' }}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {total > 3 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: Math.ceil(total / 2) }).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i * 2)}
              className={`rounded-full transition-all duration-300 ${
                Math.floor(activeIndex / 2) === i
                  ? 'bg-primary w-5 h-1.5'
                  : 'bg-muted-foreground/30 w-1.5 h-1.5 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SwipeCarousel;
