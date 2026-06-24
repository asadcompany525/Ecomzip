import { useState } from 'react';
import { Ruler, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type CategoryType = 'shoes' | 'bags' | 'clothing' | 'generic' | 'electronics';

interface SizeGuideProps {
  categoryType: CategoryType;
  sizeLabel?: string;
}

const SHOES_DATA = [
  { eu: '36', uk: '3.5', us: '5.5', cm: '22.5' },
  { eu: '37', uk: '4',   us: '6',   cm: '23.2' },
  { eu: '38', uk: '5',   us: '7',   cm: '24.0' },
  { eu: '39', uk: '5.5', us: '7.5', cm: '24.6' },
  { eu: '40', uk: '6.5', us: '8.5', cm: '25.4' },
  { eu: '41', uk: '7',   us: '9',   cm: '26.0' },
  { eu: '42', uk: '8',   us: '10',  cm: '26.7' },
  { eu: '43', uk: '9',   us: '11',  cm: '27.5' },
  { eu: '44', uk: '9.5', us: '11.5',cm: '28.2' },
  { eu: '45', uk: '10.5',us: '12.5',cm: '29.0' },
  { eu: '46', uk: '11',  us: '13',  cm: '29.6' },
];

const KIDS_SHOES_DATA = [
  { eu: '20', uk: '4',  us: '4.5', cm: '12.5' },
  { eu: '22', uk: '5',  us: '5.5', cm: '13.7' },
  { eu: '24', uk: '6.5',us: '7',   cm: '15.0' },
  { eu: '26', uk: '8',  us: '8.5', cm: '16.3' },
  { eu: '28', uk: '10', us: '10.5',cm: '17.5' },
  { eu: '30', uk: '11.5',us: '12', cm: '18.8' },
  { eu: '32', uk: '13', us: '1',   cm: '20.0' },
  { eu: '34', uk: '2',  us: '2.5', cm: '21.2' },
  { eu: '35', uk: '2.5',us: '3',   cm: '22.0' },
];

const CLOTHING_DATA = [
  { size: 'XS',   chest: '80-84', waist: '60-64', hip: '84-88', height: '155-160' },
  { size: 'S',    chest: '84-88', waist: '64-68', hip: '88-92', height: '160-165' },
  { size: 'M',    chest: '88-92', waist: '68-72', hip: '92-96', height: '165-170' },
  { size: 'L',    chest: '92-96', waist: '72-76', hip: '96-100',height: '170-175' },
  { size: 'XL',   chest: '96-100',waist: '76-80', hip: '100-104',height:'175-180' },
  { size: 'XXL',  chest: '100-104',waist: '80-85',hip: '104-108',height:'178-183' },
  { size: 'XXXL', chest: '104-110',waist: '85-90',hip: '108-114',height:'180-185' },
  { size: '4XL',  chest: '110-116',waist: '90-96',hip: '114-120',height:'182-187' },
  { size: '5XL',  chest: '116-122',waist: '96-102',hip:'120-126',height:'184-188' },
];

const BAGS_DATA = [
  { size: 'XS / Mini',   dim: '15×10×5 cm',  capacity: '~1–2 L',  best: 'Evening clutch, card holder' },
  { size: 'S / Small',   dim: '22×16×8 cm',  capacity: '~3–5 L',  best: 'Crossbody, small shoulder bag' },
  { size: 'M / Medium',  dim: '30×22×12 cm', capacity: '~8–12 L', best: 'Daily tote, work bag' },
  { size: 'L / Large',   dim: '38×28×16 cm', capacity: '~15–20 L',best: 'Shopping, weekend bag' },
  { size: 'XL / Travel', dim: '50×35×20 cm', capacity: '~25–35 L',best: 'Overnight travel, gym bag' },
];

const TROUSER_DATA = [
  { waist: '26', hip: '34', inseam: '30', label: 'XS' },
  { waist: '28', hip: '36', inseam: '30', label: 'S' },
  { waist: '30', hip: '38', inseam: '31', label: 'M' },
  { waist: '32', hip: '40', inseam: '31', label: 'L' },
  { waist: '34', hip: '42', inseam: '32', label: 'XL' },
  { waist: '36', hip: '44', inseam: '32', label: 'XXL' },
  { waist: '38', hip: '46', inseam: '33', label: 'XXXL' },
  { waist: '40', hip: '48', inseam: '33', label: '4XL' },
  { waist: '42', hip: '50', inseam: '34', label: '5XL' },
];

export default function SizeGuide({ categoryType, sizeLabel }: SizeGuideProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'women' | 'men' | 'kids' | 'trouser'>('men');

  const isKidsShoes = sizeLabel?.toLowerCase().includes('kids');
  const isTrouser = sizeLabel?.toLowerCase().includes('waist');

  const tabs =
    categoryType === 'shoes'
      ? isKidsShoes
        ? [{ id: 'kids', label: '👦 Kids' }]
        : [{ id: 'men', label: '👟 Men' }, { id: 'women', label: '👠 Women' }]
      : categoryType === 'clothing'
      ? isTrouser
        ? [{ id: 'trouser', label: '👖 Trousers' }]
        : [{ id: 'men', label: '👕 Men' }, { id: 'women', label: '👗 Women' }]
      : [];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
      >
        <Ruler className="h-3.5 w-3.5" />
        Size Guide
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Ruler className="h-4 w-4 text-primary" />
              Size Guide
              {categoryType === 'shoes' && ' — Shoes'}
              {categoryType === 'clothing' && ' — Clothing'}
              {categoryType === 'bags' && ' — Bags'}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              All measurements are in centimetres (cm)
            </p>
          </DialogHeader>

          <div className="px-5 py-4 space-y-5">

            {/* ---- SHOES ---- */}
            {categoryType === 'shoes' && (
              <>
                {!isKidsShoes && (
                  <div className="flex gap-2 mb-1">
                    {[{ id: 'men', label: '👟 Men' }, { id: 'women', label: '👠 Women' }].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id as any)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${tab === t.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border text-muted-foreground hover:border-primary'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="rounded-xl border overflow-hidden text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-primary/10">
                        <th className="py-2 px-3 text-left font-semibold">EU</th>
                        <th className="py-2 px-3 text-left font-semibold">UK</th>
                        <th className="py-2 px-3 text-left font-semibold">US</th>
                        <th className="py-2 px-3 text-left font-semibold">Foot Length (cm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isKidsShoes ? KIDS_SHOES_DATA : SHOES_DATA).map((row, i) => {
                        const usSize = tab === 'women' && !isKidsShoes
                          ? String(Number(row.us) + 1.5)
                          : row.us;
                        return (
                          <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                            <td className="py-2 px-3 font-bold text-primary">{row.eu}</td>
                            <td className="py-2 px-3">{row.uk}</td>
                            <td className="py-2 px-3">{usSize}</td>
                            <td className="py-2 px-3">{row.cm} cm</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">📏 How to measure your foot:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Place foot flat on a piece of paper</li>
                    <li>Trace around your foot with a pen</li>
                    <li>Measure from heel to the longest toe</li>
                    <li>Add 0.5–1 cm for comfort</li>
                  </ol>
                  <p className="mt-1 text-amber-700">If you're between sizes, we recommend sizing up.</p>
                </div>
              </>
            )}

            {/* ---- CLOTHING ---- */}
            {categoryType === 'clothing' && (
              <>
                {!isTrouser ? (
                  <>
                    <div className="flex gap-2 mb-1">
                      {[{ id: 'men', label: '👕 Men' }, { id: 'women', label: '👗 Women' }].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setTab(t.id as any)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${tab === t.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border text-muted-foreground hover:border-primary'}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="rounded-xl border overflow-hidden text-xs">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-primary/10">
                            <th className="py-2 px-3 text-left font-semibold">Size</th>
                            <th className="py-2 px-3 text-left font-semibold">Chest (cm)</th>
                            <th className="py-2 px-3 text-left font-semibold">Waist (cm)</th>
                            <th className="py-2 px-3 text-left font-semibold">Hip (cm)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {CLOTHING_DATA.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                              <td className="py-2 px-3 font-bold text-primary">{row.size}</td>
                              <td className="py-2 px-3">{row.chest}</td>
                              <td className="py-2 px-3">
                                {tab === 'women'
                                  ? String(Number(row.waist.split('-')[0]) - 4) + '–' + String(Number(row.waist.split('-')[1]) - 4)
                                  : row.waist}
                              </td>
                              <td className="py-2 px-3">{row.hip}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 space-y-1">
                      <p className="font-semibold">📐 How to take measurements:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li><span className="font-medium">Chest:</span> Around the fullest part of chest</li>
                        <li><span className="font-medium">Waist:</span> Around the narrowest part of your waist</li>
                        <li><span className="font-medium">Hip:</span> Around the fullest part of hips</li>
                      </ul>
                      <p className="mt-1 text-blue-700">For a relaxed fit, go one size up.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border overflow-hidden text-xs">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-primary/10">
                            <th className="py-2 px-3 text-left font-semibold">Waist</th>
                            <th className="py-2 px-3 text-left font-semibold">Hip (cm)</th>
                            <th className="py-2 px-3 text-left font-semibold">Inseam</th>
                            <th className="py-2 px-3 text-left font-semibold">Label</th>
                          </tr>
                        </thead>
                        <tbody>
                          {TROUSER_DATA.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                              <td className="py-2 px-3 font-bold text-primary">{row.waist}"</td>
                              <td className="py-2 px-3">{row.hip} cm</td>
                              <td className="py-2 px-3">{row.inseam}"</td>
                              <td className="py-2 px-3 text-muted-foreground">{row.label}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                      <p className="font-semibold mb-1">📐 Trouser fit tip:</p>
                      <p>Measure waist at navel level. For a relaxed fit choose 1 size up. Inseam is inside leg from crotch to ankle.</p>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ---- BAGS ---- */}
            {categoryType === 'bags' && (
              <>
                <div className="rounded-xl border overflow-hidden text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-primary/10">
                        <th className="py-2 px-3 text-left font-semibold">Size</th>
                        <th className="py-2 px-3 text-left font-semibold">Approx. Dims</th>
                        <th className="py-2 px-3 text-left font-semibold">Capacity</th>
                        <th className="py-2 px-3 text-left font-semibold">Best For</th>
                      </tr>
                    </thead>
                    <tbody>
                      {BAGS_DATA.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                          <td className="py-2 px-3 font-bold text-primary whitespace-nowrap">{row.size}</td>
                          <td className="py-2 px-3 whitespace-nowrap">{row.dim}</td>
                          <td className="py-2 px-3 whitespace-nowrap">{row.capacity}</td>
                          <td className="py-2 px-3 text-muted-foreground">{row.best}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-800 space-y-1">
                  <p className="font-semibold">👜 Choosing the right bag size:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Daily essentials only → Small / Medium</li>
                    <li>Laptop + documents → Large (check laptop compartment size)</li>
                    <li>Travel → XL or dedicated luggage</li>
                  </ul>
                </div>
              </>
            )}

            {/* ---- GENERIC ---- */}
            {(categoryType === 'generic' || categoryType === 'electronics') && (
              <div className="text-sm text-muted-foreground text-center py-6">
                Please refer to the product description for specific measurements.
              </div>
            )}

            <div className="text-[10px] text-muted-foreground border-t pt-3">
              Sizes may vary slightly by brand. When in doubt, contact us on WhatsApp for help.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
