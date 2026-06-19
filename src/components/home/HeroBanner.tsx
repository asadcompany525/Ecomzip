// ============================================================
// HeroBanner — Homepage ka main sliding banner/slideshow
// Banners Supabase 'banners' table se load hote hain (is_active = true)
// Video support: mp4/webm banners autoplay hote hain
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

  return (
    <div className="relative overflow-hidden rounded-xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4 }}
          className="relative min-h-[200px] md:min-h-[350px] flex flex-col justify-center"
          style={{ backgroundColor: banner.bg_color || '#FF6B00' }}
        >
          {banner.video_url ? (
            <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
              <source src={banner.video_url} type="video/mp4" />
            </video>
          ) : banner.image_url ? (
            <img src={banner.image_url} alt={banner.title || ''} className="absolute inset-0 w-full h-full object-cover" />
          ) : null}
          <div className="relative z-10 p-8 md:p-16 bg-gradient-to-r from-black/60 to-transparent">
            {banner.title && <h2 className="text-2xl md:text-5xl font-black mb-3 max-w-lg leading-tight text-white">{banner.title}</h2>}
            {banner.subtitle && <p className="text-sm md:text-lg opacity-90 mb-6 max-w-md text-white">{banner.subtitle}</p>}
            {banner.link && (
              <Link to={banner.link}>
                <Button size="lg" className="bg-card text-foreground hover:bg-card/90 font-bold w-fit">Shop Now →</Button>
              </Link>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {banners.length > 1 && (
        <>
          <button onClick={() => setCurrent(prev => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setCurrent(prev => (prev + 1) % banners.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${i === current ? 'w-8 bg-white' : 'w-2 bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HeroBanner;
