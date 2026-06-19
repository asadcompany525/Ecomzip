// ============================================================
// chatProductContext — AI chat ke liye active product context store karta hai
// ProductDetail page pe jab user AI chat kholta hai to product info yahan set hoti hai
// Usage: setChatProductContext(productData) — getChatProductContext() se retrieve karo
// ============================================================

let _ctx: Record<string, any> | null = null;

// AI chat widget ko current product ka context do
export const setChatProductContext = (ctx: Record<string, any> | null) => {
  _ctx = ctx;
};

// AI assistant current product ke baare mein context le sakta hai
export const getChatProductContext = (): Record<string, any> | null => {
  return _ctx;
};
