import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Upload, X, ImageOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

interface VariantRow {
  id?: string;
  color: string;
  color_hex: string;
  sizes: Record<string, number>;
  images: string[];
}

interface Props {
  variants: VariantRow[];
  setVariants: React.Dispatch<React.SetStateAction<VariantRow[]>>;
  sizes: string[];
  productType: string;
  gender: string;
  onRemoveSize?: (size: string) => void;
}

const ProductVariantTable = ({ variants, setVariants, sizes: defaultSizes, productType, gender, onRemoveSize }: Props) => {
  const [uploading, setUploading] = useState<number | null>(null);
  const [newSize, setNewSize] = useState('');
  const [customSizes, setCustomSizes] = useState<string[]>([]);
  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const allSizes = [...defaultSizes, ...customSizes.filter(s => !defaultSizes.includes(s))];

  const addCustomSize = () => {
    const s = newSize.trim();
    if (!s) return;
    if (allSizes.includes(s)) { setNewSize(''); return; }
    setCustomSizes(prev => [...prev, s]);
    setVariants(prev => prev.map(v => ({ ...v, sizes: { ...v.sizes, [s]: 1 } })));
    setNewSize('');
  };

  const removeDefaultSize = (size: string) => {
    setVariants(prev => prev.map(v => {
      const ns = { ...v.sizes }; delete ns[size]; return { ...v, sizes: ns };
    }));
    if (onRemoveSize) onRemoveSize(size);
  };

  const removeCustomSize = (size: string) => {
    setCustomSizes(prev => prev.filter(s => s !== size));
    setVariants(prev => prev.map(v => {
      const ns = { ...v.sizes }; delete ns[size]; return { ...v, sizes: ns };
    }));
  };

  const addVariant = () => {
    setVariants(prev => [...prev, {
      color: '', color_hex: '#000000',
      sizes: Object.fromEntries(allSizes.map(s => [s, 1])),
      images: [],
    }]);
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: string, value: any) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  const updateQty = (variantIndex: number, size: string, qty: number) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v;
      return { ...v, sizes: { ...v.sizes, [size]: Math.max(0, qty) } };
    }));
  };

  const removeVariantImage = (variantIndex: number, imgIndex: number) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v;
      return { ...v, images: v.images.filter((_, j) => j !== imgIndex) };
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, variantIndex: number, sizeIndex: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const nextSi = sizeIndex + 1;
      if (nextSi < allSizes.length) {
        const key = `${variantIndex}-${allSizes[nextSi]}`;
        inputRefs.current[key]?.focus();
        inputRefs.current[key]?.select();
      } else if (variantIndex + 1 < variants.length) {
        const key = `${variantIndex + 1}-${allSizes[0]}`;
        inputRefs.current[key]?.focus();
        inputRefs.current[key]?.select();
      }
    }
  };

  const handleVariantImageUpload = async (variantIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(variantIndex);
    const urls: string[] = [...variants[variantIndex].images];
    for (const file of Array.from(files)) {
      const path = `variants/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('products').upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from('products').getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    updateVariant(variantIndex, 'images', urls);
    setUploading(null);
  };

  const getSizeLabel = () => {
    const t = productType.toLowerCase();
    if (t.includes('bag') || t.includes('purse') || t.includes('wallet') || t.includes('clutch') || t.includes('tote') || t.includes('backpack')) return 'Size / Capacity';
    if (gender === 'kids') return 'Kids Sizes';
    if (gender === 'women') return 'Women Sizes';
    if (gender === 'men') return 'Men Sizes';
    return 'Sizes';
  };

  const getTotalForVariant = (v: VariantRow) => Object.values(v.sizes).reduce((a, b) => a + b, 0);
  const grandTotal = variants.reduce((sum, v) => sum + getTotalForVariant(v), 0);

  return (
    <div className="space-y-3">
      {/* Top bar: label + Add Color */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          {getSizeLabel()} — qty per size per color
        </p>
        <Button variant="outline" size="sm" onClick={addVariant} className="gap-1.5 shrink-0 text-xs">
          <Plus className="h-3 w-3" /> Add Color
        </Button>
      </div>

      {/* Active size chips + Add Size row */}
      <div className="space-y-2">
        {allSizes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {defaultSizes.map(s => (
              <span key={s} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full border border-primary/20 font-semibold">
                {s}
                <button type="button" onClick={() => removeDefaultSize(s)} className="hover:text-destructive transition-colors ml-0.5 leading-none">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            {customSizes.map(s => (
              <span key={s} className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-700 font-semibold">
                {s}
                <button type="button" onClick={() => removeCustomSize(s)} className="hover:text-destructive transition-colors ml-0.5 leading-none">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add custom size — own row, never cut off */}
        <div className="flex items-center gap-2">
          <Input
            value={newSize}
            onChange={e => setNewSize(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomSize())}
            placeholder="Add custom size (e.g. 46, XL, One Size)…"
            className="h-8 text-xs flex-1 min-w-0"
          />
          <Button size="sm" variant="outline" onClick={addCustomSize} className="h-8 px-3 gap-1 shrink-0 text-xs whitespace-nowrap">
            <Plus className="h-3 w-3" /> Add Size
          </Button>
        </div>
      </div>

      {/* Variant cards */}
      {variants.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
              <Plus className="h-5 w-5 opacity-40" />
            </div>
            <p className="text-sm font-medium">No colors added yet</p>
            <p className="text-xs opacity-60">Click <strong>Add Color</strong> or pick from suggestions above</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {variants.map((variant, vi) => {
            const total = getTotalForVariant(variant);
            return (
              <div
                key={vi}
                className="border rounded-xl overflow-hidden"
                style={{ borderLeftWidth: 3, borderLeftColor: variant.color_hex || '#000' }}
              >
                {/* Color header row */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/20">
                  {/* Color picker */}
                  <div className="relative shrink-0">
                    <input
                      type="color"
                      value={variant.color_hex}
                      onChange={e => updateVariant(vi, 'color_hex', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-border/50 p-0.5 bg-background"
                      title="Pick color"
                    />
                  </div>

                  {/* Color name */}
                  <Input
                    value={variant.color}
                    onChange={e => updateVariant(vi, 'color', e.target.value)}
                    placeholder="Color name (e.g. Black, Red, Navy…)"
                    className="h-8 text-xs flex-1 min-w-0 font-medium"
                  />

                  {/* Variant images */}
                  <div className="flex items-center gap-1 shrink-0">
                    {variant.images.slice(0, 3).map((img, i) => (
                      <div key={i} className="relative w-7 h-7">
                        <img src={img} alt="" className="w-7 h-7 rounded object-cover border" />
                        <button
                          type="button"
                          onClick={() => removeVariantImage(vi, i)}
                          className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive text-white rounded-full flex items-center justify-center text-[8px] leading-none"
                        >×</button>
                      </div>
                    ))}
                    {uploading === vi ? (
                      <div className="w-7 h-7 border border-dashed rounded flex items-center justify-center text-[9px] text-muted-foreground">...</div>
                    ) : (
                      <label className="w-7 h-7 border border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-accent transition-colors" title="Upload color images">
                        <Upload className="h-3 w-3 text-muted-foreground" />
                        <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleVariantImageUpload(vi, e)} />
                      </label>
                    )}
                  </div>

                  {/* Total badge */}
                  <div className="shrink-0 text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 min-w-[2.5rem] text-center">
                    {total}
                  </div>

                  {/* Delete */}
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeVariant(vi)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Size grid — flex-wrap, no horizontal scroll */}
                {allSizes.length > 0 ? (
                  <div className="px-3 py-2.5 flex flex-wrap gap-2">
                    {allSizes.map((size, si) => {
                      const qty = variant.sizes[size] ?? 1;
                      const isEmpty = qty === 0;
                      return (
                        <div
                          key={size}
                          className={`flex flex-col items-center gap-0.5 ${isEmpty ? 'opacity-40' : ''}`}
                        >
                          <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground leading-none px-1">
                            {size}
                          </span>
                          <input
                            ref={el => { inputRefs.current[`${vi}-${size}`] = el; }}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={qty === 0 ? '' : qty}
                            placeholder="1"
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              updateQty(vi, size, parseInt(val) || 0);
                            }}
                            onFocus={e => e.target.select()}
                            onKeyDown={e => handleKeyDown(e, vi, si)}
                            className={`w-11 h-9 text-sm text-center rounded-lg font-semibold border-2 bg-background focus:outline-none focus:ring-0 transition-colors ${
                              isEmpty
                                ? 'border-muted text-muted-foreground'
                                : 'border-border focus:border-primary'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-2 text-xs text-muted-foreground italic">
                    Set sizes above to enter stock quantities
                  </div>
                )}
              </div>
            );
          })}

          {/* Grand total footer */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-xl border">
            <span className="text-xs font-semibold text-muted-foreground">
              {variants.length} color{variants.length !== 1 ? 's' : ''} · {allSizes.length} size{allSizes.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Total Stock:</span>
              <span className="text-sm font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-0.5">
                {grandTotal}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductVariantTable;
