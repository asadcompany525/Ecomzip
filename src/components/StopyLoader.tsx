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
  const fontSize = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20"
          animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/10"
          animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut', delay: 0.3 }}
        />
        <motion.div
          style={{ width: d, height: d }}
          className="relative rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30"
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <img
            src={faviconUrl || '/favicon.ico'}
            alt={brandName}
            className="object-contain"
            style={{ width: d * 0.6, height: d * 0.6 }}
          />
        </motion.div>
      </div>

      {size !== 'sm' && (
        <div className="text-center space-y-1">
          <motion.p
            className={`font-black text-primary tracking-wider ${fontSize[size]}`}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            {(brandName || 'LOADING').toUpperCase()}
          </motion.p>
          <motion.div className="flex justify-center gap-1">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
              />
            ))}
          </motion.div>
        </div>
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
