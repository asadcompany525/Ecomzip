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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
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

    // Use the actual user image size for natural output
    const maxW = 900;
    const scale = Math.min(1, maxW / userImg.width);
    const cW = Math.round(userImg.width * scale);
    const cH = Math.round(userImg.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = cW;
    canvas.height = cH;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return userImageUrl;

    // Draw user photo as full background
    ctx.drawImage(userImg, 0, 0, cW, cH);

    // Determine product placement based on category
    // These are fraction-based positions (relative to canvas size)
    let productW: number;
    let productX: number;
    let productY: number;
    let productOpacity: number;
    let blendMode: GlobalCompositeOperation = 'source-over';
    let rotate = 0;

    if (categoryType === 'shoes') {
      // Bottom of image — feet area (~bottom 20%)
      productW = cW * 0.45;
      const aspectRatio = productImg.height / productImg.width;
      const productH = productW * aspectRatio;
      productX = (cW - productW) / 2;
      productY = cH - productH - cH * 0.04;
      productOpacity = 0.92;
    } else if (categoryType === 'clothing') {
      // Center torso area (~20% from top, ~55% width)
      productW = cW * 0.55;
      const aspectRatio = productImg.height / productImg.width;
      const productH = productW * aspectRatio;
      productX = (cW - productW) / 2;
      // Place from ~18% down (chest area)
      productY = cH * 0.18;
      productOpacity = 0.85;
      blendMode = 'multiply';
    } else if (categoryType === 'bags') {
      // Side of torso area (~right shoulder)
      productW = cW * 0.32;
      const aspectRatio = productImg.height / productImg.width;
      const productH = productW * aspectRatio;
      productX = cW * 0.55;
      productY = cH * 0.28;
      productOpacity = 0.9;
    } else {
      // Generic — center of image
      productW = cW * 0.45;
      const aspectRatio = productImg.height / productImg.width;
      const productH = productW * aspectRatio;
      productX = (cW - productW) / 2;
      productY = (cH - productH) / 2;
      productOpacity = 0.88;
    }

    const productH = productW * (productImg.height / productImg.width);

    // Draw a subtle drop shadow under the product
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = 'transparent';
    ctx.fillRect(productX, productY, productW, productH);
    ctx.restore();

    // Draw product with blend mode
    ctx.save();
    ctx.globalAlpha = productOpacity;
    ctx.globalCompositeOperation = blendMode;

    if (rotate !== 0) {
      ctx.translate(productX + productW / 2, productY + productH / 2);
      ctx.rotate(rotate);
      ctx.drawImage(productImg, -productW / 2, -productH / 2, productW, productH);
    } else {
      ctx.drawImage(productImg, productX, productY, productW, productH);
    }
    ctx.restore();

    // For clothing: add a second lighter layer on top for shine/texture
    if (categoryType === 'clothing') {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(productImg, productX, productY, productW, productH);
      ctx.restore();
    }

    // Bottom strip label
    const labelH = 46;
    const grad = ctx.createLinearGradient(0, cH - labelH, 0, cH);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, cH - labelH, cW, labelH);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(12, Math.round(cW / 35))}px sans-serif`;
    ctx.fillText('Virtual Try-On Preview', 14, cH - 14);

    // Small product thumbnail in corner
    const thumbSize = Math.round(cW * 0.1);
    const thumbX = cW - thumbSize - 12;
    const thumbY = cH - thumbSize - 12;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    roundRect(ctx, thumbX, thumbY, thumbSize, thumbSize, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
    ctx.restore();
    ctx.drawImage(productImg, thumbX + 3, thumbY + 3, thumbSize - 6, thumbSize - 6);

    return canvas.toDataURL('image/jpeg', 0.93);
  } catch {
    return userImageUrl;
  }
}
