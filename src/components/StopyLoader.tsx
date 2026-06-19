// ============================================================
// StopyLoader — Animated brand loader (rotating ring + logo)
// Usage: <StopyLoader /> inline, ya <StopyLoader fullScreen /> page level par
// ============================================================

import { motion } from 'framer-motion';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface StopyLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

const StopyLoader = ({ size = 'md', fullScreen = false }: StopyLoaderProps) => {
  const { brandName, faviconUrl } = useStoreSettings();
  const dims = { sm: 40, md: 64, lg: 96 };
  const d = dims[size];

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        {/* Outer ring */}
        <motion.div
          className="absolute rounded-full border-2 border-primary/20"
          style={{ width: d * 2, height: d * 2 }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
        />
        {/* Middle pulse ring */}
        <motion.div
          className="absolute rounded-full bg-primary/10"
          style={{ width: d * 1.5, height: d * 1.5 }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
        {/* Inner rotating gradient ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: d * 1.2, height: d * 1.2,
            background: 'conic-gradient(from 0deg, transparent 70%, hsl(var(--primary)) 100%)',
          }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        />
        {/* Logo circle */}
        <motion.div
          style={{ width: d, height: d }}
          className="relative rounded-full bg-background flex items-center justify-center shadow-lg border border-primary/20 z-10"
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <img
            src={faviconUrl || '/favicon.ico'}
            alt={brandName}
            className="object-contain rounded-full"
            style={{ width: d * 0.6, height: d * 0.6 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </motion.div>
      </div>

      {size !== 'sm' && brandName && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-sm font-semibold text-foreground">{brandName}</p>
          <div className="flex justify-center gap-1 mt-2">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.22 }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {content}
    </div>
  );
};

export default StopyLoader;
