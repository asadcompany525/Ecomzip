// ============================================================
// tryonCanvas — AI Style Preview
// Product image directly paste NAHI karta — instead product ke
// dominant colors extract karke user ke body pe naturally blend karta hai
// Result: User apne body shape mein product ka style/color wear karta nazar aata hai
// ============================================================

export type TryOnCategory = 'shoes' | 'clothing' | 'bags' | 'generic';

function loadCanvasImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

export function detectTryOnCategory(productName: string, productCategory?: string): TryOnCategory {
  const text = `${productName} ${productCategory || ''}`.toLowerCase();
  if (/(shoe|sneaker|boot|sandal|heel|loafer|footwear|joota|chappal)/.test(text)) return 'shoes';
  if (/(bag|purse|handbag|tote|clutch|backpack|wallet)/.test(text)) return 'bags';
  if (/(shirt|tshirt|t-shirt|jacket|kurta|kameez|dress|trouser|jean|hoodie|coat|skirt|blouse|outfit)/.test(text)) return 'clothing';
  return 'generic';
}

// Product image se dominant non-background colors extract karo
function extractProductColors(img: HTMLImageElement): Array<{ r: number; g: number; b: number }> {
  const sc = document.createElement('canvas');
  sc.width = 100; sc.height = 100;
  const sctx = sc.getContext('2d')!;
  sctx.drawImage(img, 0, 0, 100, 100);
  const d = sctx.getImageData(0, 0, 100, 100).data;

  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (a < 100) continue;
    // White / near-white background skip karo
    if (r > 230 && g > 230 && b > 230) continue;
    // Very light desaturated (grey background) skip karo
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const lum = (r + g + b) / 3;
    if (sat < 0.08 && lum > 195) continue;

    const br = Math.round(r / 32) * 32;
    const bg = Math.round(g / 32) * 32;
    const bb = Math.round(b / 32) * 32;
    const key = `${br},${bg},${bb}`;
    const e = buckets.get(key);
    if (e) { e.r += r; e.g += g; e.b += b; e.n++; }
    else buckets.set(key, { r, g, b, n: 1 });
  }

  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
  if (sorted.length === 0) return [{ r: 60, g: 60, b: 60 }];
  return sorted.slice(0, 4).map(c => ({ r: Math.round(c.r / c.n), g: Math.round(c.g / c.n), b: Math.round(c.b / c.n) }));
}

// Color ki luminance check karo
function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b);
}

// Saturation check karo
function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

// Elliptical clip path banao natural clothing area ke liye
function clipEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  rx: number, ry: number
) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.closePath();
}

export async function createCanvasTryOn(
  userImageUrl: string,
  productImageUrl: string,
  categoryType: TryOnCategory,
): Promise<string> {
  try {
    const [userImg, productImg] = await Promise.all([
      loadCanvasImage(userImageUrl),
      loadCanvasImage(productImageUrl),
    ]);

    const maxW = 900;
    const scale = Math.min(1, maxW / userImg.width);
    const cW = Math.round(userImg.width * scale);
    const cH = Math.round(userImg.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = cW;
    canvas.height = cH;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return userImageUrl;

    // Step 1: User ka photo background mein draw karo
    ctx.drawImage(userImg, 0, 0, cW, cH);

    // Step 2: Product ke dominant colors extract karo
    const colors = extractProductColors(productImg);
    const primary = colors[0];
    const secondary = colors[1] || primary;

    const lum = luminance(primary.r, primary.g, primary.b);
    const sat = saturation(primary.r, primary.g, primary.b);

    // Step 3: Category ke hisaab se body region pe color overlay apply karo
    ctx.save();

    if (categoryType === 'clothing') {
      // Torso area — elliptical shape for natural look
      // Center X = middle, Center Y = 50% down (chest/torso center)
      const cx = cW * 0.5;
      const cy = cH * 0.52;
      const rx = cW * 0.38;  // horizontal radius
      const ry = cH * 0.30;  // vertical radius

      // Radial gradient — product color center se edge tak fade karo
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));

      // Dark product (black, navy, dark grey): multiply style
      // Colored product (red, blue, green etc): color overlay
      // Light product: soft overlay

      const alpha1 = lum < 80 ? 0.72 : (sat > 0.3 ? 0.65 : 0.50);
      const alpha2 = lum < 80 ? 0.30 : (sat > 0.3 ? 0.20 : 0.12);

      grad.addColorStop(0, `rgba(${primary.r},${primary.g},${primary.b},${alpha1})`);
      grad.addColorStop(0.55, `rgba(${primary.r},${primary.g},${primary.b},${alpha1 * 0.6})`);
      grad.addColorStop(0.80, `rgba(${secondary.r},${secondary.g},${secondary.b},${alpha2})`);
      grad.addColorStop(1, `rgba(${primary.r},${primary.g},${primary.b},0)`);

      // Dark products = multiply (darkens naturally like real dark fabric)
      // Colored/light products = color blend (applies hue while keeping body shape)
      if (lum < 100) {
        ctx.globalCompositeOperation = 'multiply';
      } else if (sat > 0.25) {
        ctx.globalCompositeOperation = 'color';
      } else {
        ctx.globalCompositeOperation = 'multiply';
      }

      clipEllipse(ctx, cx, cy, rx, ry);
      ctx.clip();
      ctx.fillStyle = grad;
      ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
      ctx.restore();

      // Second pass — collar/sleeve area subtle fade
      ctx.save();
      if (lum < 100) ctx.globalCompositeOperation = 'multiply';
      else ctx.globalCompositeOperation = 'color';
      const grad2 = ctx.createRadialGradient(cx, cy * 0.7, 0, cx, cy * 0.7, cW * 0.28);
      const a2 = lum < 80 ? 0.40 : 0.30;
      grad2.addColorStop(0, `rgba(${primary.r},${primary.g},${primary.b},${a2})`);
      grad2.addColorStop(1, `rgba(${primary.r},${primary.g},${primary.b},0)`);
      ctx.fillStyle = grad2;
      ctx.beginPath();
      ctx.ellipse(cx, cy * 0.7, cW * 0.28, cH * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

    } else if (categoryType === 'shoes') {
      // Feet area — bottom 22% of image
      const cx = cW * 0.5;
      const cy = cH * 0.88;
      const rx = cW * 0.38;
      const ry = cH * 0.11;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      const alpha = lum < 100 ? 0.70 : 0.60;
      grad.addColorStop(0, `rgba(${primary.r},${primary.g},${primary.b},${alpha})`);
      grad.addColorStop(0.6, `rgba(${primary.r},${primary.g},${primary.b},${alpha * 0.5})`);
      grad.addColorStop(1, `rgba(${primary.r},${primary.g},${primary.b},0)`);

      ctx.globalCompositeOperation = lum < 100 ? 'multiply' : 'color';
      clipEllipse(ctx, cx, cy, rx, ry);
      ctx.clip();
      ctx.fillStyle = grad;
      ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
      ctx.restore();

    } else if (categoryType === 'bags') {
      // Shoulder/arm area — right side
      const cx = cW * 0.65;
      const cy = cH * 0.50;
      const rx = cW * 0.22;
      const ry = cH * 0.20;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      const alpha = lum < 100 ? 0.68 : 0.60;
      grad.addColorStop(0, `rgba(${primary.r},${primary.g},${primary.b},${alpha})`);
      grad.addColorStop(0.65, `rgba(${primary.r},${primary.g},${primary.b},${alpha * 0.4})`);
      grad.addColorStop(1, `rgba(${primary.r},${primary.g},${primary.b},0)`);

      ctx.globalCompositeOperation = lum < 100 ? 'multiply' : 'color';
      clipEllipse(ctx, cx, cy, rx, ry);
      ctx.clip();
      ctx.fillStyle = grad;
      ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
      ctx.restore();

    } else {
      // Generic — center of image
      const cx = cW * 0.5;
      const cy = cH * 0.5;
      const rx = cW * 0.35;
      const ry = cH * 0.30;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      const alpha = lum < 100 ? 0.65 : 0.55;
      grad.addColorStop(0, `rgba(${primary.r},${primary.g},${primary.b},${alpha})`);
      grad.addColorStop(0.7, `rgba(${primary.r},${primary.g},${primary.b},${alpha * 0.4})`);
      grad.addColorStop(1, `rgba(${primary.r},${primary.g},${primary.b},0)`);

      ctx.globalCompositeOperation = lum < 100 ? 'multiply' : 'color';
      clipEllipse(ctx, cx, cy, rx, ry);
      ctx.clip();
      ctx.fillStyle = grad;
      ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
      ctx.restore();
    }

    // Step 4: Bottom label strip
    const labelH = 52;
    const labelGrad = ctx.createLinearGradient(0, cH - labelH, 0, cH);
    labelGrad.addColorStop(0, 'rgba(0,0,0,0)');
    labelGrad.addColorStop(1, 'rgba(0,0,0,0.80)');
    ctx.fillStyle = labelGrad;
    ctx.fillRect(0, cH - labelH, cW, labelH);

    const fontSize = Math.max(12, Math.round(cW / 40));
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillText('✨ AI Style Preview', 14, cH - fontSize - 8);

    // Color swatch show karo
    const swatchSize = 14;
    let swatchX = 14;
    const swatchY = cH - 10;
    colors.slice(0, 4).forEach(c => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(swatchX + swatchSize / 2, swatchY - swatchSize / 2, swatchSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      swatchX += swatchSize + 5;
    });

    // Step 5: Product thumbnail in corner (reference) — small, doesn't overlay body
    const thumbSize = Math.round(Math.min(cW, cH) * 0.13);
    const thumbX = cW - thumbSize - 10;
    const thumbY = 10;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, 8);
    ctx.clip();
    ctx.drawImage(productImg, thumbX + 3, thumbY + 3, thumbSize - 6, thumbSize - 6);
    ctx.restore();

    // Tiny "Product" label above thumbnail
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `${Math.max(9, Math.round(cW / 65))}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText('Style Ref', thumbX + thumbSize, thumbY - 3);
    ctx.textAlign = 'left';
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.93);
  } catch {
    return userImageUrl;
  }
}
