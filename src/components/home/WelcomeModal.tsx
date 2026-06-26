import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, ShoppingBag, Zap, Bot, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStoreSettings } from '@/hooks/useStoreSettings';

const STORAGE_KEY = 'stopy_welcome_seen_v1';

const slides = [
  {
    icon: ShoppingBag,
    color: 'bg-primary/10',
    iconColor: 'text-primary',
    title: 'Pakistan\'s #1 Shoes & Bags Store',
    desc: 'Discover the latest trends in footwear and bags — top quality at unbeatable prices. From casual to formal, we have it all.',
    emoji: '👟',
  },
  {
    icon: Sparkles,
    color: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    title: 'New Arrivals Every Week',
    desc: 'Fresh products added regularly. Every new item stays in "New Arrivals" for 30 days so you never miss out on the latest styles.',
    emoji: '✨',
  },
  {
    icon: Zap,
    color: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
    title: 'Flash Sales & Mega Discounts',
    desc: 'Grab limited-time flash deals with countdown timers. Check the Flash Sale section daily for exclusive offers up to 70% off.',
    emoji: '⚡',
  },
  {
    icon: Bot,
    color: 'bg-violet-500/10',
    iconColor: 'text-violet-500',
    title: 'AI-Powered Shopping',
    desc: 'Our smart AI recommends products just for you, helps you find the perfect size, and even lets you virtually try on shoes!',
    emoji: '🤖',
  },
  {
    icon: Shield,
    color: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    title: 'Safe & Easy Shopping',
    desc: 'Cash on Delivery available. Easy returns, real-time order tracking, and 24/7 chat support. Shop with complete confidence!',
    emoji: '🛡️',
  },
];

const WelcomeModal = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { brandName } = useStoreSettings();

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  const next = () => {
    if (step < slides.length - 1) setStep(s => s + 1);
    else close();
  };

  const prev = () => { if (step > 0) setStep(s => s - 1); };

  const current = slides[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-card border border-border rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Close button */}
            <button
              onClick={close}
              className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Progress dots */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`}
                />
              ))}
            </div>

            {/* Slide content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="px-7 pt-14 pb-8 text-center"
              >
                {/* Icon */}
                <div className={`h-20 w-20 rounded-3xl ${current.color} flex items-center justify-center mx-auto mb-4 relative`}>
                  <Icon className={`h-10 w-10 ${current.iconColor}`} />
                  <span className="absolute -top-2 -right-2 text-2xl">{current.emoji}</span>
                </div>

                {/* Brand name on first slide */}
                {step === 0 && (
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Welcome to {brandName || 'Stopy'}</p>
                )}

                <h2 className="text-xl font-bold mb-3 leading-snug">{current.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{current.desc}</p>
              </motion.div>
            </AnimatePresence>

            {/* Footer */}
            <div className="px-7 pb-7 flex items-center gap-3">
              {step > 0 ? (
                <Button variant="outline" size="sm" onClick={prev} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
              ) : (
                <div className="flex-1" />
              )}

              <Button onClick={next} className="flex-1 gap-1" size="sm">
                {step < slides.length - 1 ? (
                  <>Next <ChevronRight className="h-4 w-4" /></>
                ) : (
                  <>Start Shopping! 🛍️</>
                )}
              </Button>
            </div>

            {/* Skip link */}
            {step < slides.length - 1 && (
              <button onClick={close} className="w-full text-center pb-4 text-xs text-muted-foreground hover:text-foreground transition-colors">
                Skip intro
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeModal;
