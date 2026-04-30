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

    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return userImageUrl;

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0b0f17');
    grad.addColorStop(1, '#1a1f2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const userScale = Math.max(canvas.width / userImg.width, canvas.height / userImg.height);
    const userW = userImg.width * userScale;
    const userH = userImg.height * userScale;
    ctx.drawImage(userImg, (canvas.width - userW) / 2, (canvas.height - userH) / 2, userW, userH);

    const layout = {
      shoes: { w: 520, y: 820, opacity: 0.95 },
      bags: { w: 380, y: 430, opacity: 0.92 },
      clothing: { w: 540, y: 330, opacity: 0.78 },
      generic: { w: 450, y: 560, opacity: 0.88 },
    }[categoryType];

    const productW = layout.w;
    const productH = productImg.height * (productW / productImg.width);
    const productX = (canvas.width - productW) / 2;

    ctx.save();
    ctx.globalAlpha = layout.opacity;
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 14;
    ctx.drawImage(productImg, productX, layout.y, productW, productH);
    ctx.restore();

    const stripeGrad = ctx.createLinearGradient(0, canvas.height - 90, 0, canvas.height);
    stripeGrad.addColorStop(0, 'rgba(0,0,0,0)');
    stripeGrad.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = stripeGrad;
    ctx.fillRect(0, canvas.height - 90, canvas.width, 90);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('Virtual Try-On Preview', 28, canvas.height - 32);

    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    return userImageUrl;
  }
}
