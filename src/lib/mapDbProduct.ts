// ============================================================
// mapDbProduct — Supabase DB row ko frontend Product type mein convert karta hai
// ============================================================

import { Product } from '@/types/product';

// Supabase products table ka ek row Product interface mein map karo
// Reviews embedded hain to real-time rating calculate hoti hai
export const mapDbProduct = (p: any): Product => {
  // Agar reviews embed hain (PRODUCT_SELECT use kiya) to rating recalculate karo
  const embeddedReviews = p.reviews as { rating: number }[] | null;
  let rating = Number(p.rating) || 0;
  let reviewCount = Number(p.review_count) || 0;

  if (embeddedReviews && embeddedReviews.length > 0) {
    const total = embeddedReviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
    rating = Math.round((total / embeddedReviews.length) * 10) / 10;
    reviewCount = embeddedReviews.length;
  }

  return {
    id: p.id,
    name: p.title,
    price: Number(p.price),
    originalPrice: p.original_price ? Number(p.original_price) : undefined,
    discount: p.discount_percent ? Number(p.discount_percent) : undefined,
    image: (p.images as any)?.[0] || '/placeholder.svg',
    images: (p.images as string[]) || [],
    category: p.category_id || '',
    brand: p.brand || '',
    colors: (p.colors as string[]) || [],
    sizes: (p.sizes as string[]) || [],
    rating,
    reviews: reviewCount,
    stock: p.stock,
    sold: p.sold,
    isFlashSale: p.is_flash_sale,
    isTrending: p.is_featured,
    gender: p.gender as any,
    description: p.description,
    type: p.sub_category_id || '',
    tags: (p.tags as string[]) || [],
    video_url: p.video_url || undefined,
  };
};

// Products fetch karte waqt yeh select string use karo
// Reviews embedded hoti hain taake real-time rating mile
export const PRODUCT_SELECT = '*, reviews(rating)';
