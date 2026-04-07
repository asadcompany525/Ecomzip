export interface Product {
  id: string;
  name: string;
  nameUrdu?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  images?: string[];
  category: string;
  subCategory?: string;
  brand: string;
  colors?: string[];
  sizes?: string[];
  rating: number;
  reviews: number;
  stock: number;
  sold?: number;
  isFlashSale?: boolean;
  flashSaleEnds?: string;
  isTrending?: boolean;
  gender?: 'men' | 'women' | 'kids' | 'unisex';
  type?: string;
  description?: string;
  descriptionUrdu?: string;
}

export interface Category {
  id: string;
  name: string;
  nameUrdu: string;
  icon: string;
  image: string;
  count: number;
}

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

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface Review {
  id: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
}
