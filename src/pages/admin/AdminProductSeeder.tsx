import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Database, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import { ensureAdminSession } from '@/lib/adminSession';

const BRANDS = ['Servis', 'Bata', 'Ndure', 'ECS', 'Stylo', 'Metro', 'Borjan', 'Hush Puppies', 'Nike', 'Adidas', 'Puma', 'Skechers'];
const COLORS = ['Black', 'White', 'Brown', 'Tan', 'Navy', 'Red', 'Grey', 'Beige', 'Olive', 'Maroon'];
const SIZES_POOL = [['36','37','38','39','40'],['38','39','40','41','42'],['39','40','41','42','43'],['36','37','38'],['40','41','42','43','44'],['33','34','35','36']];
const GENDERS = ['men','women','kids','unisex'];
const IMGS = [
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
  'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600',
  'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600',
  'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600',
  'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600',
  'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600',
  'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600',
  'https://images.unsplash.com/photo-1584735175315-9d5df23be620?w=600',
  'https://images.unsplash.com/photo-1520256862855-398228c41684?w=600',
  'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=600',
];
const TITLES = [
  'Classic Leather Oxford','Casual Sneaker','Sport Running Shoe','Formal Derby Shoe',
  'Loafer Comfort','Suede Chelsea Boot','Canvas Trainer','Sandal Flat','Slipper Indoor',
  'Ankle Boot','Moccasin Slip-On','Khussa Traditional','Brogue Shoe','Monk Strap',
  'Ballet Flat','High Heel Pump','Wedge Sandal','Platform Sneaker','Kids School Shoe',
  'Kids Sport Shoe','Memory Foam Sneaker','Desert Boot','Trail Running Shoe','Velvet Slip-On',
  'Block Heel Sandal','Pointed Toe Flat','Zipper Ankle Boot','Mesh Sport Shoe','Kolhapuri Chappal',
  'Party Heels','Flip Flop Summer','Office Lace-Up','Ethnic Chappal','Trekking Boot',
  'Go Walk Shoe','Premium Oxford','Arch Fit Sneaker','Wedding Khussa','School Shoe Classic',
  'Casual Slipper',
];

const AdminProductSeeder = () => {
  const [status, setStatus] = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const seedProducts = async () => {
    setStatus('loading');
    setProgress(0);
    setLog([]);
    try {
      await ensureAdminSession();
      addLog('✅ Admin session established');

      const { data: cats, error: catErr } = await supabase.from('categories').select('id, slug').limit(10);
      if (catErr || !cats?.length) throw new Error('Could not fetch categories');
      addLog(`✅ Found ${cats.length} categories`);

      const catIds = cats.map(c => c.id);
      const products = [];
      for (let i = 0; i < 100; i++) {
        const brand = BRANDS[i % BRANDS.length];
        const title = TITLES[i % TITLES.length];
        const color = COLORS[i % COLORS.length];
        const gender = GENDERS[i % GENDERS.length];
        const catId = catIds[i % catIds.length];
        const img = IMGS[i % IMGS.length];
        const base = 800 + (i * 40);
        const hasDisc = i % 3 === 0;
        const discPct = hasDisc ? [10, 15, 20, 25, 30][i % 5] : null;
        const origPrice = hasDisc ? Math.round(base * 1.25) : null;

        products.push({
          title: `${brand} ${title} ${color}`,
          description: `Premium quality ${title.toLowerCase()} by ${brand}. Crafted with care for comfort and style. Available in ${color.toLowerCase()}.`,
          price: base,
          original_price: origPrice,
          discount_percent: discPct,
          category_id: catId,
          brand,
          gender,
          sizes: SIZES_POOL[i % SIZES_POOL.length],
          colors: [color, COLORS[(i + 2) % COLORS.length]],
          images: [img],
          stock: 10 + (i % 90),
          rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
          review_count: Math.floor(Math.random() * 200),
          sold: Math.floor(Math.random() * 500),
          is_active: true,
          is_flash_sale: i % 10 === 0,
          is_featured: i % 7 === 0,
          is_new_arrival: i % 4 === 0,
        });
      }

      let inserted = 0;
      const batchSize = 20;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const { data, error } = await supabase.from('products').insert(batch).select('id');
        if (error) throw new Error(`Batch ${Math.floor(i/batchSize)+1} failed: ${error.message}`);
        inserted += data?.length || 0;
        setProgress(Math.round((i + batchSize) / products.length * 100));
        addLog(`✅ Inserted batch ${Math.floor(i/batchSize)+1} (${inserted} total)`);
      }

      addLog(`🎉 Successfully seeded ${inserted} products!`);
      setStatus('done');
      toast({ title: `✅ ${inserted} dummy products added!` });
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
      setStatus('error');
      toast({ title: 'Seeding failed', description: err.message, variant: 'destructive' });
    }
  };

  const deleteDummyProducts = async () => {
    if (!confirm('Delete all dummy/test products? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await ensureAdminSession();
      const { error } = await supabase.from('products').delete().in('brand', BRANDS);
      if (error) throw error;
      toast({ title: 'Dummy products deleted' });
      setStatus('idle');
      setLog([]);
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
    setDeleting(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-xl"><Database className="h-5 w-5 text-indigo-600" /></div>
        <div>
          <h1 className="text-2xl font-bold">Product Seeder</h1>
          <p className="text-muted-foreground text-sm">Add 100 dummy test products to your store for UI/testing purposes</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <p className="text-amber-800 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Test Data Only
        </p>
        <p className="text-amber-700 text-xs mt-1">These are dummy products using placeholder images from Unsplash. Delete them before going live with real products.</p>
      </div>

      <div className="flex gap-3 mb-6">
        <Button onClick={seedProducts} disabled={status === 'loading'} className="gap-2 flex-1">
          {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          {status === 'loading' ? `Seeding… ${progress}%` : 'Seed 100 Products'}
        </Button>
        <Button variant="destructive" onClick={deleteDummyProducts} disabled={deleting} className="gap-2">
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete Dummies
        </Button>
      </div>

      {status === 'loading' && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span><span>{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-2 text-green-800">
          <CheckCircle className="h-5 w-5 shrink-0" /> All 100 products successfully added to your store!
        </div>
      )}

      {log.length > 0 && (
        <div className="bg-muted rounded-xl p-4 space-y-1 max-h-48 overflow-y-auto font-mono text-xs">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
};

export default AdminProductSeeder;
