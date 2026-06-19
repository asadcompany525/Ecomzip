// ============================================================
// Product Types — Poori app mein use hone wale core types
// ============================================================

// Ek product ki poori information
export interface Product {
  id: string;
  name: string;
  nameUrdu?: string;
  price: number;             // PKR mein price
  originalPrice?: number;    // Sale se pehle ki price
  discount?: number;         // Discount percentage (0-100)
  image: string;             // Main thumbnail image URL
  images?: string[];         // Gallery images + videos
  category: string;          // Category ID (DB se)
  subCategory?: string;
  brand: string;
  colors?: string[];
  sizes?: string[];
  rating: number;            // 0-5 star rating
  reviews: number;           // Total review count
  stock: number;             // Available quantity
  sold?: number;             // Total sold count
  isFlashSale?: boolean;
  flashSaleEnds?: string;    // ISO datetime string (UTC)
  isTrending?: boolean;
  gender?: 'men' | 'women' | 'kids' | 'unisex';
  type?: string;             // Sub-category ID
  description?: string;
  descriptionUrdu?: string;
  tags?: string[];           // First tag = product code
  video_url?: string;        // MP4/GLB video ya 3D model URL
}

// Product category (shoes, bags, etc.)
export interface Category {
  id: string;
  name: string;
  nameUrdu: string;
  icon: string;
  image: string;
  count: number;             // Us category mein products ki ginti
}

// Homepage banner/slideshow
export interface Banner {
  id: string;
  title: string;
  titleUrdu: string;
  subtitle: string;
  subtitleUrdu: string;
  image: string;
  link: string;
  bgColor: string;
}

// Cart mein ek item (product + chosen options)
export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

// Customer ka product review
export interface Review {
  id: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
}
