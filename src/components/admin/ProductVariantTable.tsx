import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Upload } from 'lucide-react';
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
  productType: 'shoes' | 'bags';
  gender: string;
}

const ProductVariantTable = ({ variants, setVariants, sizes, productType, gender }: Props) => {
  const [uploading, setUploading] = useState<number | null>(null);
  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const addVariant = () => {
    setVariants(prev => [...prev, {
      color: '', color_hex: '#000000',
      sizes: Object.fromEntries(sizes.map(s => [s, 0])),
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

  const handleKeyDown = (e: React.KeyboardEvent, variantIndex: number, sizeIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to next size in same variant, or first size of next variant
      const nextSizeIndex = sizeIndex + 1;
      if (nextSizeIndex < sizes.length) {
        const key = `${variantIndex}-${sizes[nextSizeIndex]}`;
        inputRefs.current[key]?.focus();
        inputRefs.current[key]?.select();
      } else if (variantIndex + 1 < variants.length) {
        const key = `${variantIndex + 1}-${sizes[0]}`;
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
    if (productType === 'bags') return 'Size';
    if (gender === 'men') return 'Men Sizes';
    if (gender === 'women') return 'Women Sizes';
    if (gender === 'kids') return 'Kids Sizes';
    return 'Size';
  };

  const getTotalForVariant = (v: VariantRow) => Object.values(v.sizes).reduce((a, b) => a + b, 0);
  const grandTotal = variants.reduce((sum, v) => sum + getTotalForVariant(v), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{getSizeLabel()} — Enter qty per size per color (Enter = next)</p>
        <Button variant="outline" size="sm" onClick={addVariant} className="gap-1">
          <Plus className="h-3 w-3" /> Add Color
        </Button>
      </div>

      {variants.length === 0 ? (
        <div className="text-center p-6 border-2 border-dashed rounded-xl text-muted-foreground">
          <p>No colors/variants added yet. Click "Add Color" or use AI</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="p-2 text-left min-w-[120px]">Color</th>
                <th className="p-2 text-left min-w-[60px]">Hex</th>
                {sizes.map(s => (
                  <th key={s} className="p-2 text-center min-w-[60px]">{s}</th>
                ))}
                <th className="p-2 text-center min-w-[60px]">Total</th>
                <th className="p-2 text-center min-w-[80px]">Images</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant, vi) => (
                <tr key={vi} className="border-b hover:bg-accent/30">
                  <td className="p-2">
                    <Input
                      value={variant.color}
                      onChange={e => updateVariant(vi, 'color', e.target.value)}
                      placeholder="Red, Blue..."
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="color"
                      value={variant.color_hex}
                      onChange={e => updateVariant(vi, 'color_hex', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0"
                    />
                  </td>
                  {sizes.map((size, si) => (
                    <td key={size} className="p-1">
                      <input
                        ref={el => { inputRefs.current[`${vi}-${size}`] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={variant.sizes[size] || ''}
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          updateQty(vi, size, parseInt(val) || 0);
                        }}
                        onFocus={e => e.target.select()}
                        onKeyDown={e => handleKeyDown(e, vi, si)}
                        className="h-8 text-xs text-center w-14 border rounded-md bg-background px-1 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </td>
                  ))}
                  <td className="p-2 text-center font-bold text-primary">
                    {getTotalForVariant(variant)}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      {variant.images.slice(0, 2).map((img, i) => (
                        <img key={i} src={img} alt="" className="w-6 h-6 rounded object-cover" />
                      ))}
                      <label className="w-6 h-6 border border-dashed rounded flex items-center justify-center cursor-pointer hover:bg-accent text-[8px]">
                        <Upload className="h-3 w-3" />
                        <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleVariantImageUpload(vi, e)} />
                      </label>
                      {uploading === vi && <span className="text-[10px]">...</span>}
                    </div>
                  </td>
                  <td className="p-2">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeVariant(vi)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-bold">
                <td colSpan={2} className="p-2 text-right">Total Stock:</td>
                {sizes.map(size => (
                  <td key={size} className="p-2 text-center">
                    {variants.reduce((sum, v) => sum + (v.sizes[size] || 0), 0)}
                  </td>
                ))}
                <td className="p-2 text-center text-primary">{grandTotal}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProductVariantTable;
