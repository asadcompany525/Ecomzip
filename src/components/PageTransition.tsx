// ============================================================
// PageTransition — Route change pe fade + slide animation
// App.tsx mein har storefront route ko PT/PTL mein wrap kiya gaya hai
// ============================================================

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

const variants = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

const PageTransition = ({ children }: { children: ReactNode }) => (
  <motion.div
    variants={variants}
    initial="initial"
    animate="enter"
    exit="exit"
    transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
    style={{ width: '100%' }}
  >
    {children}
  </motion.div>
);

export default PageTransition;
