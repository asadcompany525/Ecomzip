import { Product } from '@/types/product';

export const mapDbProduct = (p: any): Product => {
  const embedded = p.reviews as { rating: number }[] | null;
  let rating = Number(p.rating) || 0;
  let reviewCount = Number(p.review_count) || 0;
  if (embedded && embedded.length > 0) {
    rating = Math.round((embedded.reduce((s: number, r: any) => s + (r.rating || 0), 0) / embedded.length) * 10) / 10;
    reviewCount = embedded.length;
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
  };
};

export const PRODUCT_SELECT = '*, reviews(rating)';
