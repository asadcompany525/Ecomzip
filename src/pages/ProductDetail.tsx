import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Minus, Plus, ChevronRight, Truck, RotateCcw, Shield, Share2, ArrowLeft, Send, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/home/ProductCard';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
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
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [dbProduct, setDbProduct] = useState<any>(null);
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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setSelectedImage(0);
    setSelectedSize('');
    setSelectedColor('');
    setQuantity(1);
    window.scrollTo(0, 0);

    const fetchProduct = async () => {
      const { data: p } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
      if (!p) { setLoading(false); return; }
      setDbProduct(p);
      setProduct(mapDbProduct(p));

      const { data: vars } = await supabase.from('product_variants').select('*').eq('product_id', id);
      setVariants(vars || []);

      const { data: revs } = await supabase.from('reviews').select('*').eq('product_id', id).eq('is_approved', true).order('created_at', { ascending: false });
      setReviews(revs || []);

      if (p.category_id) {
        const { data: rel } = await supabase.from('products').select('*').eq('category_id', p.category_id).neq('id', id).eq('is_active', true).limit(4);
        setRelatedProducts((rel || []).map(mapDbProduct));
      }

      const { data: pop } = await supabase.from('products').select('*').eq('is_active', true).neq('id', id).order('sold', { ascending: false }).limit(8);
      setPopularProducts((pop || []).map(mapDbProduct));

      const { data: disc } = await supabase.from('products').select('*').eq('is_active', true).neq('id', id).gt('discount_percent', 0).order('discount_percent', { ascending: false }).limit(4);
      setDiscountProducts((disc || []).map(mapDbProduct));

      const { data: flash } = await supabase.from('products').select('*').eq('is_active', true).eq('is_flash_sale', true).neq('id', id).limit(4);
      setFlashProducts((flash || []).map(mapDbProduct));

      setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center"><p className="text-muted-foreground">Loading...</p></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <p className="text-6xl mb-4">😕</p>
          <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
          <Link to="/products"><Button className="mt-4">Browse Products</Button></Link>
        </div>
      </div>
    );
  }

  const allImages = product.images?.length ? product.images : [product.image];
  const uniqueColors = [...new Set(variants.map(v => v.color).filter(Boolean))];
  const uniqueSizes = product.sizes?.length ? product.sizes : [...new Set(variants.map(v => v.size).filter(Boolean))];

  const isVideo = (url: string) => /\.(mp4|mov|webm)(\?|$)/i.test(url);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-4 md:py-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 p-0 h-auto">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <span>/</span>
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/products" className="hover:text-primary">Products</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground truncate max-w-[150px]">{product.name}</span>
        </div>

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
              <span className="text-2xl md:text-3xl font-bold text-primary">Rs. {product.price.toLocaleString()}</span>
              {product.originalPrice && product.discount && product.discount > 0 && (
                <>
                  <span className="text-base text-muted-foreground line-through">Rs. {product.originalPrice.toLocaleString()}</span>
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
                      <button key={color} onClick={() => { setSelectedColor(color); setSelectedSize(''); }}
                        className={`relative w-9 h-9 rounded-full border-2 transition-all ${selectedColor === color ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-border hover:border-primary/50'}`}
                        style={{ background: hex }} title={color}>
                        {selectedColor === color && <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sizes */}
            {uniqueSizes.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-2">Size: <span className="font-normal text-muted-foreground">{selectedSize || 'Select'}</span></h4>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueSizes.map(size => {
                    const available = isSizeAvailable(size as string);
                    return (
                      <button key={size} onClick={() => available && setSelectedSize(size as string)} disabled={!available}
                        className={`w-11 h-11 rounded-lg text-sm font-medium border transition-all ${!available ? 'opacity-30 cursor-not-allowed line-through bg-muted' : selectedSize === size ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary'}`}>
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Quantity</h4>
              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded-lg">
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus className="h-4 w-4" /></Button>
                  <span className="w-10 text-center font-medium">{quantity}</span>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}><Plus className="h-4 w-4" /></Button>
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

            <div className="flex gap-2 mb-4">
              <Button className="flex-1 h-11 text-sm font-semibold" onClick={handleAddToCart} disabled={availableStock <= 0 || (uniqueSizes.length > 0 && !selectedSize)}>
                <ShoppingCart className="h-4 w-4 mr-2" /> {availableStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => toggleWishlist(product)}>
                <Heart className={`h-5 w-5 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={handleShare}><Share2 className="h-5 w-5" /></Button>
            </div>

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
      <BottomNav />
    </div>
  );
};

export default ProductDetail;
