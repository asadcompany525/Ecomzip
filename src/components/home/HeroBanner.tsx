// ============================================================
// HeroBanner — Homepage ka main sliding banner/slideshow
// Banners Supabase 'banners' table se load hote hain (is_active = true)
// Text bottom-left corner card mein show hota hai — image full-bleed
// ============================================================

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  video_url: string | null;
  bg_color: string | null;
  link: string | null;
}

const HeroBanner = () => {
  const [current, setCurrent] = useState(0);
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('banners').select('*').eq('is_active', true).order('sort_order');
      setBanners(data || []);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => setCurrent(prev => (prev + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const banner = banners[current];

  const hasText = banner.title || banner.subtitle;

  return (
    <div className="relative overflow-hidden rounded-xl mx-auto" style={{ minHeight: '220px' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="relative w-full"
          style={{
            minHeight: 'inherit',
            backgroundColor: banner.bg_color || '#1a1a2e',
          }}
        >
          {/* Background media — full bleed, no text in this layer */}
          {banner.video_url ? (
            <video
              autoPlay loop muted playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={banner.video_url} type="video/mp4" />
            </video>
          ) : banner.image_url ? (
            <img
              src={banner.image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : null}

          {/* Subtle bottom gradient so text card always readable */}
          {hasText && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
          )}

          {/* Spacer so banner has height */}
          <div className="w-full" style={{ paddingBottom: '38%', minHeight: '220px' }} />

          {/* Text card — bottom-left corner, clearly separated from image content */}
          {hasText && (
            <div className="absolute bottom-0 left-0 right-0 z-10 p-4 md:p-6 lg:p-8">
              <div className="inline-block max-w-xs md:max-w-sm lg:max-w-md bg-black/55 backdrop-blur-sm rounded-2xl px-4 py-3 md:px-5 md:py-4 border border-white/10 shadow-xl">
                {banner.title && (
                  <h2 className="text-lg md:text-2xl lg:text-3xl font-black leading-tight text-white mb-1">
                    {banner.title}
                  </h2>
                )}
                {banner.subtitle && (
                  <p className="text-xs md:text-sm text-white/85 mb-3 leading-snug">
                    {banner.subtitle}
                  </p>
                )}
                {banner.link && (
                  <Link to={banner.link}>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs md:text-sm px-4 py-2 h-auto rounded-xl"
                    >
                      Shop Now →
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Prev / Next arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrent(prev => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/35 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors z-20"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrent(prev => (prev + 1) % banners.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/35 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors z-20"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-4 right-4 flex gap-1.5 z-20">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-white' : 'w-2 bg-white/45'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HeroBanner;
