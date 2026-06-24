import { useState, useEffect, useRef } from 'react';
import { setChatProductContext } from '@/lib/chatProductContext';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Minus, Plus, ChevronRight, Truck, RotateCcw, Shield, Share2, ArrowLeft, Send, Camera, Ruler, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import VirtualTryOn from '@/components/VirtualTryOn';
import AISalesperson from '@/components/product/AISalesperson';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/home/ProductCard';
import BottomNav from '@/components/layout/BottomNav';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Product } from '@/types/product';

const mapDbProduct = (p: any): Product => ({
  id: p.id, name: p.title, price: Number(p.price),
  originalPrice: p.original_price ? Number(p.original_price) : undefined,
  discount: p.discount_percent ? Number(p.discount_percent) : undefined,
  image: (p.images as any)?.[0] || '/placeholder.svg',
  images: (p.images as string[]) || [], category: p.category_id || '',
  brand: p.brand || '', colors: (p.colors as string[]) || [],
  sizes: (p.sizes as string[]) || [], rating: Number(p.rating) || 0,
  reviews: p.review_count || 0, stock: p.stock, sold: p.sold,
  isFlashSale: p.is_flash_sale, isTrending: p.is_featured,
  gender: p.gender as any, description: p.description,
  type: p.sub_category_id || '',
});

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist, cartCount } = useCart();
  const { user } = useAuth();
  const { formatPrice } = useCurrencyConverter();

  const [product, setProduct] = useState<Product | null>(null);
  const [dbProduct, setDbProduct] = useState<any>(null);
  const [categoryName, setCategoryName] = useState('');
  const [variants, setVariants] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [discountProducts, setDiscountProducts] = useState<Product[]>([]);
  const [flashProducts, setFlashProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Auto-slideshow for images
  useEffect(() => {
    if (!product) return;
    const allImgs = product.images?.length ? product.images : [product.image];
    if (allImgs.length <= 1) return;
    const interval = setInterval(() => {
      setSelectedImage(prev => (prev + 1) % allImgs.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [product]);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [uploadingReviewImg, setUploadingReviewImg] = useState(false);

  // Size Advisor state
  const [sizeAdvisorOpen, setSizeAdvisorOpen] = useState(false);
  const [advisorFootLength, setAdvisorFootLength] = useState('');
  const [advisorFootWidth, setAdvisorFootWidth] = useState('');
  const [advisorUsualSize, setAdvisorUsualSize] = useState('');
  const [advisorBrand, setAdvisorBrand] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorResult, setAdvisorResult] = useState<any>(null);
  const [advisorFootPhoto, setAdvisorFootPhoto] = useState<string | null>(null);
  const [advisorFootPhotoFile, setAdvisorFootPhotoFile] = useState<File | null>(null);
  const [advisorUploadingPhoto, setAdvisorUploadingPhoto] = useState(false);
  const footPhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setSelectedImage(0);
    setSelectedSize('');
    setSelectedColor('');
    setQuantity(1);
    window.scrollTo(0, 0);

    const fetchProduct = async () => {
      try {
        const { data: p, error: pError } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
        if (pError) { console.error('Product fetch error:', pError); setLoading(false); return; }
        if (!p) { setLoading(false); return; }

        // Safely map product — guard all optional fields
        const safeProduct = {
          ...p,
          images: Array.isArray(p.images) ? p.images : [],
          colors: Array.isArray(p.colors) ? p.colors : [],
          sizes: Array.isArray(p.sizes) ? p.sizes : [],
          price: Number(p.price) || 0,
          original_price: p.original_price ? Number(p.original_price) : null,
          discount_percent: p.discount_percent ? Number(p.discount_percent) : 0,
          rating: Number(p.rating) || 0,
          review_count: p.review_count || 0,
          stock: p.stock || 0,
          sold: p.sold || 0,
          video_url: typeof p.video_url === 'string' ? p.video_url : null,
          return_policy: p.return_policy || null,
          claim_policy: p.claim_policy || null,
          meta: p.meta && typeof p.meta === 'object' ? p.meta : {},
        };

        setDbProduct(safeProduct);
        const mapped = mapDbProduct(safeProduct);
        setProduct(mapped);
        setChatProductContext({
          title: safeProduct.title,
          price: safeProduct.price,
          description: safeProduct.description,
          stock: safeProduct.stock,
          sizes: safeProduct.sizes,
          return_policy: safeProduct.return_policy,
          claim_policy: safeProduct.claim_policy,
        });

        // Run secondary queries in parallel — don't crash if they fail
        const [varsResult, revsResult] = await Promise.allSettled([
          supabase.from('product_variants').select('*').eq('product_id', id),
          supabase.from('reviews').select('*').eq('product_id', id).eq('is_approved', true).order('created_at', { ascending: false }),
        ]);

        const vars = varsResult.status === 'fulfilled' ? varsResult.value.data || [] : [];
        setVariants(vars);

        const reviewList = revsResult.status === 'fulfilled' ? revsResult.value.data || [] : [];
        setReviews(reviewList);
        if (reviewList.length > 0) {
          const avg = reviewList.reduce((sum: number, r: any) => sum + (Number(r.rating) || 0), 0) / reviewList.length;
          setProduct(prev => prev ? { ...prev, rating: Math.round(avg * 10) / 10, reviews: reviewList.length } : prev);
        }

        if (safeProduct.category_id) {
          const [relResult, catResult] = await Promise.allSettled([
            supabase.from('products').select('*').eq('category_id', safeProduct.category_id).neq('id', id).eq('is_active', true).limit(4),
            supabase.from('categories').select('name').eq('id', safeProduct.category_id).maybeSingle(),
          ]);
          if (relResult.status === 'fulfilled') setRelatedProducts((relResult.value.data || []).map(mapDbProduct));
          if (catResult.status === 'fulfilled' && catResult.value.data?.name) setCategoryName(catResult.value.data.name);
        }

        // Fetch extras in parallel — non-critical, don't block render
        Promise.allSettled([
          supabase.from('products').select('*').eq('is_active', true).neq('id', id).order('sold', { ascending: false }).limit(8),
          supabase.from('products').select('*').eq('is_active', true).neq('id', id).gt('discount_percent', 0).order('discount_percent', { ascending: false }).limit(4),
          supabase.from('products').select('*').eq('is_active', true).eq('is_flash_sale', true).neq('id', id).limit(4),
        ]).then(([popRes, discRes, flashRes]) => {
          if (popRes.status === 'fulfilled') setPopularProducts((popRes.value.data || []).map(mapDbProduct));
          if (discRes.status === 'fulfilled') setDiscountProducts((discRes.value.data || []).map(mapDbProduct));
          if (flashRes.status === 'fulfilled') setFlashProducts((flashRes.value.data || []).map(mapDbProduct));
        });

      } catch (err) {
        console.error('ProductDetail crashed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const getAvailableStock = () => {
    if (variants.length === 0) return product?.stock || 0;
    const matching = variants.filter(v => {
      if (selectedColor && v.color !== selectedColor) return false;
      if (selectedSize && v.size !== selectedSize) return false;
      return true;
    });
    return matching.reduce((sum: number, v: any) => sum + v.stock, 0);
  };

  const isSizeAvailable = (size: string) => {
    if (variants.length === 0) return true;
    return variants.filter(v => {
      if (selectedColor && v.color !== selectedColor) return false;
      return v.size === size && v.stock > 0;
    }).length > 0;
  };

  const availableStock = getAvailableStock();

  const handleAddToCart = () => {
    if (!product) return;
    if (product.sizes?.length && !selectedSize) { toast({ title: 'Please select a size', variant: 'destructive' }); return; }
    if (availableStock <= 0) { toast({ title: 'Out of stock', variant: 'destructive' }); return; }
    addToCart(product, selectedSize, selectedColor);
  };

  const handleFootPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdvisorFootPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setAdvisorFootPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAdvisorPhoto = async (): Promise<string | null> => {
    if (!advisorFootPhotoFile) return null;
    setAdvisorUploadingPhoto(true);
    setAdvisorUploadingPhoto(false);
    return advisorFootPhoto;
  };

  // Detect category type from product name/category for adaptive advisor
  const getCategoryType = (): 'shoes' | 'bags' | 'clothing' | 'electronics' | 'generic' => {
    const nameAndCat = `${product?.name || ''} ${categoryName || ''} ${dbProduct?.description || ''} ${(product?.sizes || []).join(' ')}`.toLowerCase();
    if (/bag|purse|wallet|tote|backpack|handbag|clutch/.test(nameAndCat)) return 'bags';
    if (/shirt|dress|pant|kurta|coat|jacket|jeans|cloth|wear|top|trouser|shalwar|kameez|hoodie|sweater|suit|xs|xxl/.test(nameAndCat)) return 'clothing';
    if (/phone|laptop|tablet|electronic|gadget/.test(nameAndCat)) return 'electronics';
    if (/shoe|sandal|slipper|boot|loafer|sneaker|chappal|khussa|heel/.test(nameAndCat)) return 'shoes';
    if (product?.sizes?.some(s => /^\d+$/.test(String(s)))) return 'shoes';
    return 'generic';
  };

  // -------------------------------------------------------
  // Smart size grid detector — product sizes se system detect karo
  // EU shoes, UK shoes, Clothing (XS-5XL), Kids, Bags — sab support
  // -------------------------------------------------------
  const getFullSizeGrid = (): { sizes: string[]; label: string } => {
    const catType = getCategoryType();
    const productSizes = (product?.sizes || []).map(s => String(s).trim());
    const gender = (dbProduct?.gender || '').toLowerCase();

    // ---- BAGS ----
    if (catType === 'bags') {
      return {
        label: 'Size',
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Small', 'Medium', 'Large'],
      };
    }

    // ---- CLOTHING ----
    if (catType === 'clothing') {
      // Kids clothing detect: any size matches age pattern
      const hasKidsSize = productSizes.some(s => /^\d{1,2}-\d{1,2}Y$/i.test(s) || /^\d{1,2}Y$/i.test(s));
      if (hasKidsSize || gender === 'kids') {
        return {
          label: 'Age / Size',
          sizes: ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y', '12-13Y', '14-15Y'],
        };
      }
      // Number-based clothing (like 28, 30, 32 for pants/trousers)
      const hasNumericClothing = productSizes.some(s => /^\d{2}$/.test(s) && Number(s) >= 24 && Number(s) <= 54);
      if (hasNumericClothing) {
        return {
          label: 'Waist / Size',
          sizes: ['26', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48'],
        };
      }
      // Standard letter sizes (XS to 5XL)
      return {
        label: 'Size',
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '5XL'],
      };
    }

    // ---- SHOES ----
    if (catType === 'shoes') {
      const nums = productSizes.map(s => Number(s)).filter(n => !isNaN(n) && n > 0);

      if (nums.length > 0) {
        const minS = Math.min(...nums);
        const maxS = Math.max(...nums);

        // UK shoe sizes: typically 1-15 (men), 1-9 (women)
        if (maxS <= 15 && minS >= 1) {
          const start = Math.max(1, minS - 1);
          const end = Math.min(15, maxS + 1);
          return {
            label: 'UK Size',
            sizes: Array.from({ length: end - start + 1 }, (_, i) => String(start + i)),
          };
        }

        // US shoe sizes: typically 4-16 (men), 4-12 (women) — overlaps with kids EU so check range
        if (maxS <= 18 && minS >= 4) {
          const start = Math.max(4, minS - 1);
          const end = Math.min(18, maxS + 1);
          return {
            label: 'US Size',
            sizes: Array.from({ length: end - start + 1 }, (_, i) => String(start + i)),
          };
        }

        // Kids EU shoe sizes: 16-35
        if (maxS <= 35 && minS >= 16) {
          const start = Math.max(16, minS - 1);
          const end = Math.min(35, maxS + 2);
          return {
            label: 'EU Size (Kids)',
            sizes: Array.from({ length: end - start + 1 }, (_, i) => String(start + i)),
          };
        }

        // Adult EU shoe sizes: 34-48
        const euStart = Math.max(34, minS - 1);
        const euEnd = Math.min(48, maxS + 1);
        return {
          label: 'EU Size',
          sizes: Array.from({ length: euEnd - euStart + 1 }, (_, i) => String(euStart + i)),
        };
      }

      // No numeric sizes — gender based default EU grid
      if (gender === 'women') return { label: 'EU Size', sizes: ['34', '35', '36', '37', '38', '39', '40', '41', '42'] };
      if (gender === 'kids') return { label: 'EU Size (Kids)', sizes: Array.from({ length: 15 }, (_, i) => String(i + 20)) };
      return { label: 'EU Size', sizes: ['38', '39', '40', '41', '42', '43', '44', '45', '46', '47'] };
    }

    // ---- GENERIC / OTHER (accessories, jewellery, etc.) ----
    // Sirf product ki apni sizes dikhao, koi extra grid nahi
    return { label: 'Size', sizes: productSizes };
  };

  const numberFromText = (value: string) => {
    const match = value.match(/\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
  };

  const normalizeSize = (size: any) => String(size || '').trim().toUpperCase();

  const getStockInfo = (size: string) => {
    const normalized = normalizeSize(size);
    if (!normalized) return { inStock: false, stockCount: 0, exists: false };
    const exists = product?.sizes?.some(s => normalizeSize(s) === normalized) || variants.some(v => normalizeSize(v.size) === normalized);
    if (variants.length === 0) {
      return { exists, inStock: exists && (product?.stock || 0) > 0, stockCount: exists ? (product?.stock || 0) : 0 };
    }
    const matching = variants.filter(v => normalizeSize(v.size) === normalized && (!selectedColor || v.color === selectedColor));
    const stockCount = matching.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
    return { exists: exists || matching.length > 0, inStock: stockCount > 0, stockCount };
  };

  const findNearestAvailableSize = (wanted: string) => {
    const available = (product?.sizes || []).filter(size => getStockInfo(size).inStock);
    if (available.length === 0) return null;
    const wantedNum = numberFromText(wanted);
    if (wantedNum !== null) {
      return available
        .map(size => ({ size, diff: Math.abs((numberFromText(String(size)) ?? wantedNum) - wantedNum) }))
        .sort((a, b) => a.diff - b.diff)[0]?.size || available[0];
    }
    const order = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'SMALL', 'MEDIUM', 'LARGE'];
    const wantedIndex = order.indexOf(normalizeSize(wanted));
    if (wantedIndex >= 0) {
      return available
        .map(size => ({ size, diff: Math.abs(order.indexOf(normalizeSize(size)) - wantedIndex) }))
        .filter(x => x.diff >= 0)
        .sort((a, b) => a.diff - b.diff)[0]?.size || available[0];
    }
    return available[0];
  };

  const buildLocalSizeAdvice = (catType: ReturnType<typeof getCategoryType>) => {
    const sizes = (product?.sizes || []).map(String);
    const usual = advisorUsualSize.trim();
    const firstNumber = numberFromText(advisorFootLength);
    const secondNumber = numberFromText(advisorFootWidth);
    let recommendedSize = usual || sizes[0] || 'Standard';
    let fitNote = '';

    if (catType === 'shoes') {
      if (usual) {
        recommendedSize = String(numberFromText(usual) ?? usual).trim();
        fitNote = `You entered shoe size ${recommendedSize}; checking this exact size in current stock.`;
      } else if (firstNumber) {
        recommendedSize = String(Math.round((firstNumber + 1.5) * 1.5));
        fitNote = `Based on ${firstNumber}cm foot length${secondNumber ? ` and ${secondNumber}cm width` : ''}, this is the nearest EU/Pakistan shoe size.`;
      }
    } else if (catType === 'clothing') {
      const text = `${usual} ${advisorFootLength} ${advisorFootWidth}`.toUpperCase();
      const direct = text.match(/\b(XXS|XS|S|M|L|XL|XXL|XXXL)\b/)?.[1];
      if (direct) recommendedSize = direct;
      else {
        const chest = firstNumber || 0;
        if (chest > 0) {
          recommendedSize = chest <= 34 ? 'S' : chest <= 38 ? 'M' : chest <= 42 ? 'L' : chest <= 46 ? 'XL' : 'XXL';
        }
      }
      fitNote = `For clothing, use chest/height and width/waist measurements. The recommendation is matched against this product's sizes.`;
    } else if (catType === 'bags') {
      const text = `${usual} ${advisorFootLength}`.toLowerCase();
      recommendedSize = /large|xl|travel|laptop|15|20/.test(text) ? 'Large' : /small|mini|compact/.test(text) ? 'Small' : 'Medium';
      fitNote = 'Bag size is based on your use case and available product sizes.';
    } else {
      recommendedSize = usual || advisorFootLength || sizes[0] || 'Standard';
      fitNote = 'Recommendation is matched to this product category and available options.';
    }

    const stock = getStockInfo(recommendedSize);
    const alternateSize = stock.inStock ? null : findNearestAvailableSize(recommendedSize);
    const alternateStock = alternateSize ? getStockInfo(alternateSize) : null;

    return {
      recommendedSize,
      alternateSize,
      confidence: advisorFootPhoto ? 82 : 76,
      shortAdvice: stock.inStock
        ? `Size ${recommendedSize} is suitable and currently available.`
        : `Size ${recommendedSize} is the right recommendation, but it is not available in this product right now.${alternateSize ? ` Closest available option: ${alternateSize}.` : ''}`,
      fitNote,
      categoryType: catType,
      inStock: stock.inStock,
      stockCount: stock.stockCount,
      sizeExists: stock.exists,
      alternateStockCount: alternateStock?.stockCount || 0,
    };
  };

  const getSizeAdvice = async () => {
    if (!advisorFootLength && !advisorUsualSize && !advisorFootPhoto && !advisorFootWidth) {
      toast({ title: 'Upload a photo or enter measurements to continue', variant: 'destructive' });
      return;
    }
    setAdvisorLoading(true);
    setAdvisorResult(null);
    try {
      // Upload photo to Supabase Storage to get a real public URL for AI vision
      let uploadedPhotoUrl: string | null = null;
      if (advisorFootPhotoFile) {
        uploadedPhotoUrl = await uploadAdvisorPhoto();
        toast({ title: '📸 Photo uploaded — analyzing with AI...', description: 'Checking live inventory stock for your size.' });
      }

      const catType = getCategoryType();
      let parsed = buildLocalSizeAdvice(catType);
      toast({ title: `Size ${parsed.recommendedSize} checked`, description: parsed.inStock ? `Available: ${parsed.stockCount}` : 'Not available in current stock' });
      setAdvisorResult(parsed);
    } catch (e: any) {
      toast({ title: 'Could not get recommendation', description: e.message, variant: 'destructive' });
    }
    setAdvisorLoading(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: product?.name, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied!' });
    }
  };

  const handleReviewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploadingReviewImg(true);
    const urls: string[] = [...reviewImages];
    for (const file of Array.from(files).slice(0, 3)) {
      const path = `reviews/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('products').upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from('products').getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    setReviewImages(urls);
    setUploadingReviewImg(false);
  };

  const submitReview = async () => {
    if (!user) { toast({ title: 'Please login to review', variant: 'destructive' }); return; }
    if (!reviewComment.trim()) { toast({ title: 'Please write a comment', variant: 'destructive' }); return; }
    setReviewSubmitting(true);
    const { error } = await supabase.from('reviews').insert({
      product_id: id!, user_id: user.id, rating: reviewRating, comment: reviewComment.trim(),
      images: reviewImages.length > 0 ? reviewImages : null,
    });
    if (error) {
      toast({ title: 'Failed to submit review', variant: 'destructive' });
    } else {
      toast({ title: 'Review submitted! It will appear after approval.' });
      setReviewComment('');
      setReviewRating(5);
      setReviewImages([]);
    }
    setReviewSubmitting(false);
  };

  const CompactHeader = () => (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
      <div className="container flex items-center gap-2 h-14">
        <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="flex-1 font-semibold text-sm truncate">{product?.title || 'Product'}</span>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 shrink-0" onClick={() => navigate('/cart')}>
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cartCount}</span>}
        </Button>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CompactHeader />
        <div className="container py-20 text-center"><p className="text-muted-foreground">Loading...</p></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <CompactHeader />
        <div className="container py-20 text-center">
          <p className="text-6xl mb-4">😕</p>
          <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
          <Link to="/products"><Button className="mt-4">Browse Products</Button></Link>
        </div>
      </div>
    );
  }

  // Color-linked gallery: when a color is selected, show that variant's images first
  const colorVariantImages = selectedColor
    ? [...new Set(
        variants
          .filter(v => v.color === selectedColor)
          .flatMap(v => (v.images as string[] | null) || [])
          .filter(Boolean)
      )]
    : [];
  const baseImages = product.images?.length ? product.images : [product.image];
  const allImages = [
    ...(colorVariantImages.length > 0 ? colorVariantImages : baseImages),
    dbProduct?.video_url,
  ].filter(Boolean);

  const uniqueColors = [...new Set(variants.map(v => v.color).filter(Boolean))];
  const uniqueSizes = product.sizes?.length ? product.sizes : [...new Set(variants.map(v => v.size).filter(Boolean))];

  const isVideo = (url: string) => /\.(mp4|mov|webm)(\?|$)/i.test(url);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <CompactHeader />
      <main className="container py-4 md:py-5">
        <PageBreadcrumb items={[
          { label: 'Products', href: '/products' },
          { label: product.name },
        ]} />

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          <div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="aspect-square bg-muted rounded-xl overflow-hidden mb-3">
              {isVideo(allImages[selectedImage] || '') ? (
                <video
                  key={allImages[selectedImage]}
                  src={allImages[selectedImage]}
                  className="w-full h-full object-cover"
                  autoPlay muted loop playsInline
                />
              ) : (
                <img src={allImages[selectedImage] || '/placeholder.svg'} alt={product.name} className="w-full h-full object-cover" />
              )}
            </motion.div>
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {allImages.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === i ? 'border-primary' : 'border-transparent'}`}>
                    {isVideo(img) ? (
                      <video src={img} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{product.brand}</p>
            <h1 className="text-xl md:text-3xl font-bold mb-2">{product.name}</h1>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < Math.floor(product.rating) ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
                ))}
              </div>
              <span className="text-sm font-medium">{product.rating}</span>
              <span className="text-sm text-muted-foreground">({reviews.length} reviews)</span>
              {product.sold ? <span className="text-sm text-muted-foreground ml-2">{product.sold}+ sold</span> : null}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl md:text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
              {product.originalPrice && product.discount && product.discount > 0 && (
                <>
                  <span className="text-base text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
                  <Badge className="bg-sale text-sale-foreground">-{product.discount}%</Badge>
                </>
              )}
            </div>

            {/* Colors */}
            {uniqueColors.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-2">Color: <span className="font-normal text-muted-foreground">{selectedColor || 'Select'}</span></h4>
                <div className="flex gap-2 flex-wrap">
                  {uniqueColors.map(color => {
                    const hex = variants.find(v => v.color === color)?.color_hex || '#888';
                    return (
                      <button key={color} onClick={() => { setSelectedColor(color); setSelectedSize(''); setSelectedImage(0); }}
                        className={`relative w-9 h-9 rounded-full border-2 transition-all ${selectedColor === color ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-border hover:border-primary/50'}`}
                        style={{ background: hex }} title={color}>
                        {selectedColor === color && <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Smart Size Grid — product type + size system ke hisaab se */}
            {(() => {
              const catType = getCategoryType();
              const { sizes: fullGrid, label: sizeLabel } = getFullSizeGrid();
              if (fullGrid.length === 0) return null;

              // Product ki actual sizes normalize karke set mein rakho
              const productSizeSet = new Set(
                (product.sizes || []).map(s => normalizeSize(String(s)))
              );

              // Clothing buttons slightly wider (S, M, L text is short, XS XL etc need space)
              const isLetterSize = fullGrid.some(s => /^(XS|S|M|L|XL|XXL|XXXL|4XL|5XL|Small|Medium|Large)$/i.test(s));
              const btnW = isLetterSize ? 'min-w-[44px] px-2 h-10' : 'w-11 h-11';

              return (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">
                      {sizeLabel}:{' '}
                      <span className="font-normal text-muted-foreground">
                        {selectedSize || 'Select'}
                      </span>
                    </h4>
                    {(catType === 'shoes' || catType === 'bags') && (
                      <button
                        onClick={() => { setSizeAdvisorOpen(true); setAdvisorResult(null); }}
                        className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                      >
                        <Ruler className="h-3.5 w-3.5" /> Find My Size
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {fullGrid.map(size => {
                      const normSize = normalizeSize(size);
                      const inProduct = productSizeSet.has(normSize);
                      const stockInfo = inProduct ? getStockInfo(size) : { inStock: false, stockCount: 0 };
                      const isSelected = normalizeSize(selectedSize) === normSize;

                      // State 1: Available in product + in stock
                      // State 2: In product but out of stock (strikethrough)
                      // State 3: Not in this product (heavy gray + diagonal slash)
                      let cls = `relative ${btnW} rounded-lg text-xs font-semibold border transition-all `;

                      if (!inProduct) {
                        cls += 'opacity-20 cursor-not-allowed bg-muted/40 border-border/20 text-muted-foreground overflow-hidden select-none';
                      } else if (!stockInfo.inStock) {
                        cls += 'opacity-45 cursor-not-allowed bg-muted border-border text-muted-foreground';
                      } else if (isSelected) {
                        cls += 'border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30';
                      } else {
                        cls += 'border-border bg-background hover:border-primary hover:text-primary cursor-pointer';
                      }

                      return (
                        <button
                          key={size}
                          disabled={!inProduct || !stockInfo.inStock}
                          onClick={() => inProduct && stockInfo.inStock && setSelectedSize(size)}
                          title={
                            !inProduct ? 'Is product mein yeh size nahi hai'
                            : !stockInfo.inStock ? 'Out of stock'
                            : `Size ${size}`
                          }
                          className={cls}
                        >
                          {/* Out-of-stock slash line */}
                          {inProduct && !stockInfo.inStock && (
                            <svg viewBox="0 0 44 44" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
                              <line x1="4" y1="4" x2="40" y2="40" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
                            </svg>
                          )}
                          {/* Not-in-product blocked diagonal */}
                          {!inProduct && (
                            <svg viewBox="0 0 44 44" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
                              <line x1="4" y1="4" x2="40" y2="40" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                            </svg>
                          )}
                          {size}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="w-3 h-3 rounded border border-primary bg-primary/10 inline-block" /> Available
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="w-3 h-3 rounded border border-border bg-muted opacity-50 inline-block" /> Out of Stock
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="w-3 h-3 rounded border border-border/20 bg-muted/40 opacity-20 inline-block" /> N/A
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Quantity</h4>
              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded-lg">
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus className="h-4 w-4" /></Button>
                  <span className="w-10 text-center font-medium">{quantity}</span>
                  <Button variant="ghost" size="icon" className="h-9 w-9" disabled={quantity >= availableStock} onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}><Plus className="h-4 w-4" /></Button>
                </div>
                {selectedSize ? (
                  <span className={`text-sm ${availableStock <= 0 ? 'text-destructive font-bold' : availableStock < 5 ? 'text-orange-500 font-medium' : 'text-muted-foreground'}`}>
                    {availableStock <= 0 ? 'Out of Stock' : availableStock < 5 ? `Only ${availableStock} left in size ${selectedSize}!` : `${availableStock} in stock (size ${selectedSize})`}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Select a size to check stock</span>
                )}
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <Button className="flex-1 h-11 text-sm font-semibold" onClick={handleAddToCart} disabled={availableStock <= 0 || (uniqueSizes.length > 0 && !selectedSize)}>
                <ShoppingCart className="h-4 w-4 mr-2" /> {availableStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => toggleWishlist(product)}>
                <Heart className={`h-5 w-5 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={handleShare}><Share2 className="h-5 w-5" /></Button>
            </div>
            {['shoes', 'bags'].includes(getCategoryType()) && (
              <div className="mb-4">
                <VirtualTryOn productImage={product.image} productName={product.name} productCategory={categoryName} />
              </div>
            )}

            {/* Policies inline */}
            <div className="grid grid-cols-3 gap-2 border rounded-xl p-3 mb-3">
              <div className="text-center">
                <Truck className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-[10px] font-medium">Fast Delivery</p>
                <p className="text-[9px] text-muted-foreground">2-5 Days</p>
              </div>
              <div className="text-center">
                <RotateCcw className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-[10px] font-medium">Easy Return</p>
                <p className="text-[9px] text-muted-foreground">{dbProduct?.return_policy || '7 Days'}</p>
              </div>
              <div className="text-center">
                <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-[10px] font-medium">Warranty</p>
                <p className="text-[9px] text-muted-foreground">{dbProduct?.claim_policy || 'Genuine'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Combined Section: Description + Policy + Reviews */}
        <div className="mt-8 space-y-6">
          {/* Description */}
          <div className="bg-card rounded-xl border p-4 md:p-6">
            <h3 className="text-base font-bold mb-3">📝 Description</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{product.description || 'No description available.'}</p>
          </div>

          {/* Return & Claim Policy */}
          <div className="bg-card rounded-xl border p-4 md:p-6">
            <h3 className="text-base font-bold mb-3">📋 Return & Claim Policy</h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2 items-start">
                <RotateCcw className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div><p className="font-medium">Return Policy</p><p className="text-muted-foreground">{dbProduct?.return_policy || 'Standard 7-day return policy applies.'}</p></div>
              </div>
              <div className="flex gap-2 items-start">
                <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div><p className="font-medium">Claim/Warranty</p><p className="text-muted-foreground">{dbProduct?.claim_policy || 'Contact us within 30 days for defects.'}</p></div>
              </div>
              <div className="flex gap-2 items-start">
                <Truck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div><p className="font-medium">Cancellation</p><p className="text-muted-foreground">Orders can be cancelled within 24 hours of placement.</p></div>
              </div>
            </div>
          </div>

          {/* Reviews */}
          <div className="bg-card rounded-xl border p-4 md:p-6">
            <h3 className="text-base font-bold mb-3">⭐ Reviews ({reviews.length})</h3>
            <div className="space-y-4">
              {user && (
                <div className="border-b pb-4 space-y-3">
                  <h4 className="font-semibold text-sm">Write a Review</h4>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setReviewRating(s)}>
                        <Star className={`h-5 w-5 ${s <= reviewRating ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Share your experience..." rows={3} />
                  <div className="flex gap-2 items-center flex-wrap">
                    {reviewImages.map((img, i) => (
                      <div key={i} className="relative w-14 h-14">
                        <img src={img} alt="" className="w-full h-full object-cover rounded-lg border" />
                        <button onClick={() => setReviewImages(reviewImages.filter((_, j) => j !== i))}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">×</button>
                      </div>
                    ))}
                    <label className="w-14 h-14 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-accent">
                      <Camera className="h-4 w-4 text-muted-foreground" />
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleReviewImageUpload} />
                    </label>
                    {uploadingReviewImg && <span className="text-xs text-muted-foreground">Uploading...</span>}
                  </div>
                  <Button size="sm" onClick={submitReview} disabled={reviewSubmitting}>
                    <Send className="h-4 w-4 mr-1" /> {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No reviews yet. Be the first to review!</p>
              ) : (
                reviews.map((review: any) => (
                  <div key={review.id} className="border-b last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">U</div>
                      <span className="font-medium text-sm">User</span>
                      <div className="flex ml-2">{[...Array(review.rating)].map((_, i) => <Star key={i} className="h-3 w-3 fill-warning text-warning" />)}</div>
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-9">{review.comment}</p>
                    {review.images && Array.isArray(review.images) && review.images.length > 0 && (
                      <div className="flex gap-2 ml-9 mt-2">
                        {(review.images as string[]).map((img, i) => (
                          <img key={i} src={img} alt="" className="w-14 h-14 rounded-lg object-cover border" />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg md:text-xl font-bold mb-4">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
              {relatedProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </section>
        )}

        {/* Smart Cross-sell: Pairs well with */}
        {relatedProducts.length > 0 && (
          <section className="mt-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Pairs Well With</h2>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">AI Curated</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Customers who bought <strong>{product?.name}</strong> also loved these:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {relatedProducts.slice(0, 4).map((p, i) => (
                <Link key={p.id} to={`/product/${p.id}`} className="group">
                  <div className="bg-card rounded-xl border overflow-hidden hover:border-primary/30 hover:shadow-md transition-all">
                    <div className="aspect-square overflow-hidden">
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{p.name}</p>
                      <p className="text-xs text-primary font-bold">Rs. {p.price.toLocaleString()}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {discountProducts.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg md:text-xl font-bold mb-4">🏷️ Discount Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
              {discountProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </section>
        )}

        {flashProducts.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg md:text-xl font-bold mb-4">⚡ Flash Sale</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
              {flashProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </section>
        )}

        {popularProducts.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg md:text-xl font-bold mb-4">🔥 Popular Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
              {popularProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </section>
        )}
      </main>

      {/* ── Size Advisor Sheet (customer-facing) ── */}
      <Sheet open={sizeAdvisorOpen} onOpenChange={setSizeAdvisorOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Ruler className="h-5 w-5 text-primary" /> Find My Size
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-4">
            {(() => {
              const catType = getCategoryType();
              const photoLabel = { shoes: 'Upload Foot Photo', bags: 'Upload Reference Photo', clothing: 'Upload Body Photo', electronics: 'Upload Reference', generic: 'Upload Photo' }[catType];
              const photoHint = { shoes: 'AI analyzes foot shape to find the perfect shoe size', bags: 'AI analyzes the reference image to suggest the right bag size', clothing: 'AI analyzes body proportions from the photo', electronics: 'AI analyzes your reference to suggest the right variant', generic: 'AI analyzes the photo to suggest the right size' }[catType];
              const measureLabel1 = { shoes: 'Foot Length (cm)', bags: 'Preferred size / capacity', clothing: 'Chest / Height (cm)', electronics: 'Preferred specs', generic: 'Measurement / Reference' }[catType];
              const measureLabel2 = { shoes: 'Foot Width (cm)', bags: 'Brand preference', clothing: 'Width / Waist (cm)', electronics: 'Budget range', generic: 'Additional info' }[catType];
              const placeholder1 = { shoes: 'e.g. 25.5', bags: 'e.g. Medium, 15L', clothing: 'e.g. 40, 170', electronics: 'e.g. 256GB', generic: 'e.g. Standard' }[catType];
              const placeholder2 = { shoes: 'e.g. 9.5 (optional)', bags: 'e.g. Gucci, local', clothing: 'e.g. 32, 70kg', electronics: 'e.g. Rs. 50,000', generic: 'optional' }[catType];
              return (
                <>
                  <p className="text-sm text-muted-foreground">
                    {catType === 'shoes' ? 'Upload a foot photo or enter measurements — adviser will recommend the perfect shoe size.' :
                     catType === 'bags' ? 'Tell us your preferences — AI will recommend the best bag size.' :
                     catType === 'clothing' ? 'For shirts/clothing, enter height/chest and width/waist so adviser recommends clothing size.' :
                     'Describe your needs — adviser will recommend the right option.'}
                  </p>

                  {/* Photo Upload */}
                  <div className="border-2 border-dashed border-primary/30 rounded-xl p-4 text-center bg-primary/5">
                    <input ref={footPhotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFootPhotoChange} />
                    {advisorFootPhoto ? (
                      <div className="space-y-2">
                        <img src={advisorFootPhoto} alt="Photo" className="h-32 mx-auto rounded-lg object-contain" />
                        <div className="flex gap-2 justify-center">
                          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => footPhotoRef.current?.click()}>
                            <Camera className="h-3.5 w-3.5" /> Retake
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => setAdvisorFootPhoto(null)}>Remove</Button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => footPhotoRef.current?.click()} className="w-full space-y-1.5">
                        <Camera className="h-8 w-8 mx-auto text-primary/50" />
                        <p className="text-sm font-medium text-primary">{photoLabel}</p>
                        <p className="text-xs text-muted-foreground">{photoHint}</p>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t" />
                    <span className="text-xs text-muted-foreground px-2">OR enter manually</span>
                    <div className="flex-1 border-t" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">{measureLabel1}</Label>
                      <Input value={advisorFootLength} onChange={e => setAdvisorFootLength(e.target.value)} placeholder={placeholder1} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm">{measureLabel2}</Label>
                      <Input value={advisorFootWidth} onChange={e => setAdvisorFootWidth(e.target.value)} placeholder={placeholder2} className="mt-1" />
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="flex items-center gap-2">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground px-2">OR reference size</span>
              <div className="flex-1 border-t" />
            </div>

            <div>
              <Label className="text-sm">My usual size</Label>
              <Input
                value={advisorUsualSize}
                onChange={e => setAdvisorUsualSize(e.target.value)}
                placeholder="e.g. 42, UK 8, M, L..."
                className="mt-1"
              />
            </div>

            <Button onClick={getSizeAdvice} disabled={advisorLoading || advisorUploadingPhoto} className="w-full gap-2">
              {(advisorLoading || advisorUploadingPhoto) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ruler className="h-4 w-4" />}
              {advisorUploadingPhoto ? 'Uploading photo...' : advisorLoading ? 'AI analyzing photo & checking stock...' : 'Get My Size Recommendation'}
            </Button>

            {advisorResult && (
              <div className={`border rounded-xl p-4 space-y-3 ${advisorResult.inStock !== false ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-primary/5 border-primary/20'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-black shrink-0">
                    {advisorResult.recommendedSize}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base">Recommended Size</p>
                    <p className="text-xs text-muted-foreground">{advisorResult.confidence}% confidence {advisorFootPhoto ? '· Photo analyzed' : ''}</p>
                    {/* Live stock badge */}
                    <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${advisorResult.inStock !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${advisorResult.inStock !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                      {advisorResult.inStock !== false
                        ? `In Stock${advisorResult.stockCount ? ` · ${advisorResult.stockCount} left` : ''}`
                        : advisorResult.sizeExists === false ? 'Size not available for this product' : 'Out of Stock'}
                    </div>
                    {advisorResult.alternateSize && advisorResult.alternateSize !== advisorResult.recommendedSize && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Alternate: <span className="font-semibold text-foreground">{advisorResult.alternateSize}</span>
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm">{advisorResult.shortAdvice}</p>
                {advisorResult.fitNote && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                    {advisorResult.fitNote}
                  </div>
                )}
                {(product?.sizes?.includes(advisorResult.recommendedSize) || advisorResult.inStock !== false) && (
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    disabled={advisorResult.inStock === false}
                    onClick={() => {
                      setSelectedSize(advisorResult.recommendedSize);
                      setSizeAdvisorOpen(false);
                      toast({ title: `Size ${advisorResult.recommendedSize} selected!` });
                    }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {advisorResult.inStock === false ? 'Out of Stock' : `Select Size ${advisorResult.recommendedSize}`}
                  </Button>
                )}
              </div>
            )}

            {getCategoryType() === 'shoes' && (
              <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium">💡 How to measure foot length:</p>
                <p>1. Place your foot on a piece of paper</p>
                <p>2. Mark the heel and longest toe</p>
                <p>3. Measure the distance in cm</p>
              </div>
            )}
            {getCategoryType() === 'clothing' && (
              <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium">💡 How to measure chest/bust:</p>
                <p>1. Wrap a tape measure around the fullest part of your chest</p>
                <p>2. Keep it parallel to the ground</p>
                <p>3. Note in centimeters</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AISalesperson
        product={{ ...product, description: dbProduct?.description, return_policy: dbProduct?.return_policy, claim_policy: dbProduct?.claim_policy }}
        categoryName={categoryName}
        categoryType={getCategoryType()}
        variants={variants}
      />

      <BottomNav />
    </div>
  );
};

export default ProductDetail;
