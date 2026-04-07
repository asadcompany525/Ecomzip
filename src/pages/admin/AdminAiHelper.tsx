import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AdminAiHelper = () => {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const quickActions = [
    'Show me today sales summary',
    'Which products are selling slow?',
    'Suggest products for flash sale',
    'Generate social media post for new arrivals',
    'List products with low stock',
    'Add 10% discount on all mens joggers',
    'Remove discount from product PMP001',
    'Add a new category called Sandals',
    'Set product PMP001 as flash sale till tomorrow',
    'Create a promotional message for WhatsApp',
  ];

  const sendMessage = async (msg?: string) => {
    const text = msg || input;
    if (!text.trim()) return;
    
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data: products } = await supabase.from('products').select('id, title, price, stock, sold, discount_percent, is_flash_sale, brand, gender, category_id, original_price, tags, flash_sale_ends').limit(200);
      const { data: orders } = await supabase.from('orders').select('id, total, status, payment_method, created_at').order('created_at', { ascending: false }).limit(50);
      const { data: returns } = await supabase.from('returns').select('id, reason, status, created_at').limit(20);
      const { data: categories } = await supabase.from('categories').select('id, name, level, parent_id').eq('is_active', true);

      const context = `Store Data:
Products: ${JSON.stringify((products || []).map(p => ({ id: p.id, title: p.title, price: p.price, stock: p.stock, sold: p.sold, discount: p.discount_percent, flash: p.is_flash_sale, brand: p.brand, gender: p.gender, cat: p.category_id, code: (p.tags as string[])?.[0] || '', orig_price: p.original_price, flash_ends: p.flash_sale_ends })))}
Categories: ${JSON.stringify(categories || [])}
Recent Orders: ${(orders || []).length}, Revenue: Rs. ${(orders || []).reduce((s, o) => s + Number(o.total || 0), 0).toLocaleString()}
Returns: ${(returns || []).length}

IMPORTANT: You have FULL ACCESS to manage the store. You can perform BULK operations - multiple items at once.
When the admin asks to:
- Add/remove discount on MULTIPLE products: Return JSON action { "action": "update_products", "product_ids": ["id1","id2",...], "updates": { "discount_percent": X, "price": Y, "original_price": Z } }
- Set flash sale on MULTIPLE: Return JSON action { "action": "update_products", "product_ids": [...], "updates": { "is_flash_sale": true, "flash_sale_ends": "ISO_DATE", "discount_percent": X } }
- Remove flash/discount: Return JSON action { "action": "update_products", "product_ids": [...], "updates": { "is_flash_sale": false, "discount_percent": 0, "flash_sale_ends": null } }
- Add MULTIPLE categories at once: Return JSON action { "action": "add_categories", "categories": [{"name": "X", "level": 1, "parent_id": null}, ...] }
- Add single category: Return JSON action { "action": "add_category", "name": "X", "level": 1, "parent_id": null }
- Delete products: Return JSON action { "action": "delete_products", "product_ids": [...] }
- Deactivate products: Return JSON action { "action": "update_products", "product_ids": [...], "updates": { "is_active": false } }
- Add MULTIPLE products: Return JSON action { "action": "add_products", "products": [{"title": "X", "price": 0, "brand": "Y", "gender": "men", "category_id": "...", ...}, ...] }

For BULK operations, process ALL items in a single action. Do NOT split into multiple actions.
Wrap ANY action in <ACTION_JSON>...</ACTION_JSON> tags. You can include explanation text before/after the tags.
If no action needed, just reply with text.`;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'admin-helper',
          messages: [
            { role: 'system', content: `You are an AI admin assistant for "Stopy Shoes" store with FULL management access. You can add/remove discounts, manage flash sales, manage categories, deactivate products, etc. Use the provided data and return action JSON when admin asks to make changes. Reply in English or Roman Urdu based on user language.\n\n${context}` },
            ...newMessages.slice(-6),
          ],
        },
      });

      if (error) throw error;
      const reply = typeof data === 'string' ? data : data?.reply || data?.content || 'No response';
      
      // Parse and execute actions
      const actionMatch = reply.match(/<ACTION_JSON>([\s\S]*?)<\/ACTION_JSON>/);
      if (actionMatch) {
        try {
          const action = JSON.parse(actionMatch[1]);
          await executeAction(action);
        } catch (e) {
          console.error('Action parse error:', e);
        }
      }
      
      const cleanReply = reply.replace(/<ACTION_JSON>[\s\S]*?<\/ACTION_JSON>/g, '').trim();
      setMessages(prev => [...prev, { role: 'assistant', content: cleanReply || '✅ Action completed!' }]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const executeAction = async (action: any) => {
    try {
      if (action.action === 'update_products' && action.product_ids?.length) {
        for (const id of action.product_ids) {
          await supabase.from('products').update(action.updates).eq('id', id);
        }
        toast({ title: `✅ Updated ${action.product_ids.length} products` });
      } else if (action.action === 'delete_products' && action.product_ids?.length) {
        for (const id of action.product_ids) {
          await supabase.from('product_variants').delete().eq('product_id', id);
          await supabase.from('products').delete().eq('id', id);
        }
        toast({ title: `✅ Deleted ${action.product_ids.length} products` });
      } else if (action.action === 'add_category') {
        await supabase.from('categories').insert({
          name: action.name, level: action.level || 1, parent_id: action.parent_id || null,
          slug: action.name.toLowerCase().replace(/\s+/g, '-'), is_active: true,
        });
        toast({ title: `✅ Category "${action.name}" added` });
      } else if (action.action === 'add_categories' && action.categories?.length) {
        for (const cat of action.categories) {
          await supabase.from('categories').insert({
            name: cat.name, level: cat.level || 1, parent_id: cat.parent_id || null,
            slug: cat.name.toLowerCase().replace(/\s+/g, '-'), is_active: true,
          });
        }
        toast({ title: `✅ Added ${action.categories.length} categories` });
      } else if (action.action === 'add_products' && action.products?.length) {
        for (const prod of action.products) {
          await supabase.from('products').insert({
            title: prod.title, price: prod.price || 0, brand: prod.brand || null,
            gender: prod.gender || 'unisex', category_id: prod.category_id || null,
            is_active: true, description: prod.description || null,
            original_price: prod.original_price || null,
            discount_percent: prod.discount_percent || 0,
          });
        }
        toast({ title: `✅ Added ${action.products.length} products` });
      }
    } catch (e: any) {
      toast({ title: 'Action failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><Sparkles className="h-5 w-5" /> AI Business Helper (Full Access)</h2>
      <p className="text-sm text-muted-foreground">Ask AI anything — sales, inventory, marketing, or give commands to manage products, discounts, categories</p>

      <div className="flex gap-2 flex-wrap">
        {quickActions.map(q => (
          <Button key={q} variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(q)}>{q}</Button>
        ))}
      </div>

      <div className="bg-card border rounded-xl min-h-[400px] max-h-[500px] overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Start a conversation with AI — it can manage your store!</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-4 py-2.5"><Loader2 className="h-4 w-4 animate-spin" /></div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Ask AI or give commands..." rows={2} className="flex-1"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
        <Button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AdminAiHelper;
