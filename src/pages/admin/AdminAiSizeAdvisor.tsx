import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Ruler, Loader2, Upload, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';

const SIZE_CHARTS = {
  'Men': { '38': { uk: '5', eu: '38', cm: '24' }, '39': { uk: '6', eu: '39', cm: '24.5' }, '40': { uk: '6.5', eu: '40', cm: '25' }, '41': { uk: '7', eu: '41', cm: '25.5' }, '42': { uk: '8', eu: '42', cm: '26.5' }, '43': { uk: '9', eu: '43', cm: '27.5' }, '44': { uk: '10', eu: '44', cm: '28.5' }, '45': { uk: '11', eu: '45', cm: '29.5' } },
  'Women': { '35': { uk: '2', eu: '35', cm: '22' }, '36': { uk: '3', eu: '36', cm: '22.5' }, '37': { uk: '4', eu: '37', cm: '23.5' }, '38': { uk: '5', eu: '38', cm: '24' }, '39': { uk: '6', eu: '39', cm: '24.5' }, '40': { uk: '6.5', eu: '40', cm: '25' }, '41': { uk: '7', eu: '41', cm: '25.5' } },
  'Kids': { '28': { uk: 'C10', eu: '28', cm: '17.5' }, '29': { uk: 'C11', eu: '29', cm: '18' }, '30': { uk: 'C12', eu: '30', cm: '18.5' }, '31': { uk: 'C13', eu: '31', cm: '19' }, '32': { uk: '1', eu: '32', cm: '20' }, '33': { uk: '1.5', eu: '33', cm: '20.5' }, '34': { uk: '2', eu: '34', cm: '21.5' }, '35': { uk: '3', eu: '35', cm: '22' } },
};

export default function AdminAiSizeAdvisor() {
  const { brandName } = useStoreSettings();
  const [gender, setGender] = useState('Men');
  const [footLength, setFootLength] = useState('');
  const [footWidth, setFootWidth] = useState('');
  const [footImage, setFootImage] = useState<File | null>(null);
  const [footImagePreview, setFootImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [widgetMode, setWidgetMode] = useState<'admin' | 'customer'>('admin');

  const handleFootImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFootImage(file);
    setFootImagePreview(URL.createObjectURL(file));
  };

  const uploadFootImage = async (): Promise<string | null> => {
    if (!footImage) return null;
    setUploading(true);
    const path = `size-advisor/${Date.now()}-${footImage.name}`;
    const { error } = await supabase.storage.from('products').upload(path, footImage);
    setUploading(false);
    if (error) return null;
    const { data } = supabase.storage.from('products').getPublicUrl(path);
    return data.publicUrl;
  };

  const getRecommendation = async () => {
    if (!footImage && !footLength) {
      toast({ title: 'Upload a foot photo or enter foot length', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      let imageUrl: string | null = null;
      if (footImage) imageUrl = await uploadFootImage();

      const chart = SIZE_CHARTS[gender as keyof typeof SIZE_CHARTS];

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'size-advisor',
          imageUrl,
          messages: [{
            role: 'user',
            content: `You are a shoe size expert for ${brandName || 'our store'} Pakistan.

CUSTOMER INPUT:
- Gender: ${gender}
- Foot Length: ${footLength ? footLength + ' cm' : 'Not provided'}
- Foot Width: ${footWidth ? footWidth + ' cm' : 'Not provided'}
- Foot Image: ${imageUrl ? 'See attached photo' : 'Not provided'}

SIZE CHART for ${gender}:
${JSON.stringify(chart, null, 2)}

TASK: 
1. If foot image provided, estimate foot length and width visually
2. Match measurements to size chart
3. Consider Pakistani sizing conventions
4. Provide primary recommendation and alternate sizes

Return JSON:
{
  "estimatedLength": "25.5 cm",
  "estimatedWidth": "9.5 cm (Medium)",
  "recommendedSize": "41",
  "alternateSize": "42",
  "confidence": 90,
  "reasoning": "Based on foot measurement analysis...",
  "sizeInUK": "7",
  "sizeInEU": "41",
  "fitAdvice": "This size fits true to standard. If between sizes, go up.",
  "widthNote": "Standard width. If wide foot, consider going up half size.",
  "tips": ["Measure in evening when feet are slightly larger", "Wear the socks you plan to use with shoes"]
}

Return ONLY valid JSON.`
          }],
        },
      });

      if (error) throw error;
      let parsed = data;
      if (typeof data === 'string') {
        const m = data.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      }
      setResult(parsed);
      toast({ title: `Recommended Size: ${parsed.recommendedSize}` });
    } catch (e: any) {
      toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Ruler className="h-5 w-5 text-primary" /> AI Virtual Size Advisor
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          AI suggests the correct shoe size based on an uploaded photo of the customer's foot or measurements.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border p-4 space-y-4">
            <div>
              <Label>Gender / Category</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Men">Men (39-45)</SelectItem>
                  <SelectItem value="Women">Women (36-41)</SelectItem>
                  <SelectItem value="Kids">Kids (28-35)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Foot Length (cm)</Label>
                <Input value={footLength} onChange={e => setFootLength(e.target.value)} placeholder="e.g. 25.5" className="mt-1" type="number" step="0.5" />
              </div>
              <div>
                <Label className="text-sm">Foot Width (cm)</Label>
                <Input value={footWidth} onChange={e => setFootWidth(e.target.value)} placeholder="e.g. 9.5" className="mt-1" type="number" step="0.5" />
              </div>
            </div>

            <div>
              <Label className="text-sm">Upload Foot Photo (optional)</Label>
              <div className="mt-1 border-2 border-dashed rounded-xl p-4 text-center">
                {footImagePreview ? (
                  <div className="relative inline-block">
                    <img src={footImagePreview} alt="Foot" className="max-h-32 rounded-lg mx-auto object-cover" />
                    <button onClick={() => { setFootImage(null); setFootImagePreview(''); }}
                      className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">×</button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Photo of customer's foot (side view recommended)</p>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFootImageChange} />
                  </label>
                )}
              </div>
            </div>

            <Button onClick={getRecommendation} disabled={loading || uploading} className="w-full gap-2">
              {loading || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ruler className="h-4 w-4" />}
              {uploading ? 'Uploading...' : loading ? 'AI Analyzing...' : 'Get Size Recommendation'}
            </Button>
          </div>

          {/* Size Chart Reference */}
          <div className="bg-muted/30 rounded-xl border p-4 space-y-2">
            <Label className="text-sm font-semibold">📏 Size Chart — {gender}</Label>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b">
                  <th className="text-left py-1">EU</th>
                  <th className="text-left py-1">UK</th>
                  <th className="text-left py-1">CM</th>
                </tr></thead>
                <tbody>
                  {Object.entries(SIZE_CHARTS[gender as keyof typeof SIZE_CHARTS] || {}).map(([eu, v]) => (
                    <tr key={eu} className="border-b last:border-0">
                      <td className="py-1 font-medium">{eu}</td>
                      <td className="py-1">{v.uk}</td>
                      <td className="py-1">{v.cm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Result */}
        <div>
          {result ? (
            <div className="bg-card rounded-xl border p-5 space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-4 border-primary mb-3">
                  <span className="text-2xl font-black text-primary">{result.recommendedSize}</span>
                </div>
                <p className="text-sm text-muted-foreground">EU Size · UK {result.sizeInUK}</p>
                <div className="flex justify-center gap-2 mt-2">
                  <Badge variant="outline">EU {result.sizeInEU}</Badge>
                  <Badge variant="outline">UK {result.sizeInUK}</Badge>
                  <Badge className="bg-primary/10 text-primary border-primary/20">{result.confidence}% confidence</Badge>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {result.estimatedLength && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/30 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Est. Length</p>
                      <p className="font-semibold">{result.estimatedLength}</p>
                    </div>
                    {result.estimatedWidth && (
                      <div className="bg-muted/30 rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Est. Width</p>
                        <p className="font-semibold">{result.estimatedWidth}</p>
                      </div>
                    )}
                  </div>
                )}

                {result.alternateSize && (
                  <div className="flex items-center gap-2 text-xs bg-muted/20 rounded-lg p-2">
                    <span className="text-muted-foreground">Alternate size:</span>
                    <Badge variant="secondary">{result.alternateSize}</Badge>
                    <span className="text-muted-foreground">if between sizes</span>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Fit Advice</p>
                  <p className="text-xs">{result.fitAdvice}</p>
                </div>

                {result.widthNote && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Width Note</p>
                    <p className="text-xs">{result.widthNote}</p>
                  </div>
                )}

                {result.tips?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">💡 Tips</p>
                    <ul className="space-y-1">
                      {result.tips.map((tip: string, i: number) => (
                        <li key={i} className="flex items-start gap-1 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />{tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-muted/20 rounded-xl border-2 border-dashed p-12 text-center text-muted-foreground">
              <Ruler className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Size recommendation will appear here</p>
              <p className="text-xs mt-1">Enter measurements or upload a foot photo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
