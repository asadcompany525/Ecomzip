import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_ORIGIN_HOSTS = [
  "localhost",
  "127.0.0.1",
  "replit.dev",
  "replit.app",
  "replit.co",
  "lovable.app",
  "lovable.dev",
  "vercel.app",
  "netlify.app",
  "stopy.shop",
  "stopy-shoes.com",
];

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const HEAVY_RATE_LIMIT_MAX = 8;
const HEAVY_TYPES = new Set([
  "product-ai",
  "size-advisor",
  "virtual-tryon-start",
  "virtual-tryon-poll",
]);
const MAX_BODY_BYTES = 256 * 1024;
const MAX_MESSAGE_CHARS = 8_000;
const MAX_MESSAGES = 40;
const MAX_IMAGE_URL_LENGTH = 2_000_000;

const ipBuckets = new Map<string, { hits: number[]; heavyHits: number[] }>();
const blockedIps = new Map<string, number>();

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const real = req.headers.get("x-real-ip") || "";
  const ip = fwd.split(",")[0]?.trim() || real || "unknown";
  return ip;
}

function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  if (!origin) return true;
  try {
    const u = new URL(origin);
    const host = u.hostname;
    return ALLOWED_ORIGIN_HOSTS.some(
      (h) => host === h || host.endsWith(`.${h}`),
    );
  } catch {
    return false;
  }
}

function checkRateLimit(ip: string, isHeavy: boolean): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const blockedUntil = blockedIps.get(ip);
  if (blockedUntil && blockedUntil > now) {
    return { ok: false, retryAfter: Math.ceil((blockedUntil - now) / 1000) };
  }
  if (blockedUntil && blockedUntil <= now) blockedIps.delete(ip);

  let bucket = ipBuckets.get(ip);
  if (!bucket) {
    bucket = { hits: [], heavyHits: [] };
    ipBuckets.set(ip, bucket);
  }
  bucket.hits = bucket.hits.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  bucket.heavyHits = bucket.heavyHits.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (bucket.hits.length >= RATE_LIMIT_MAX_REQUESTS) {
    blockedIps.set(ip, now + 5 * 60_000);
    return { ok: false, retryAfter: 300 };
  }
  if (isHeavy && bucket.heavyHits.length >= HEAVY_RATE_LIMIT_MAX) {
    return { ok: false, retryAfter: 60 };
  }

  bucket.hits.push(now);
  if (isHeavy) bucket.heavyHits.push(now);

  if (ipBuckets.size > 10_000) {
    for (const [k, v] of ipBuckets) {
      if (v.hits.length === 0 && v.heavyHits.length === 0) ipBuckets.delete(k);
      if (ipBuckets.size <= 5_000) break;
    }
  }

  return { ok: true };
}

function jsonResp(payload: any, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeStr(v: unknown, max = 1000): string {
  if (typeof v !== "string") return "";
  return v.length > max ? v.slice(0, max) : v;
}

async function getGeminiKeys(): Promise<string[]> {
  const keys = new Set<string>();
  const fromEnv =
    Deno.env.get("GEMINI_API_KEYS") ||
    Deno.env.get("GEMINI_API_KEY") ||
    Deno.env.get("LOVABLE_API_KEY") ||
    "";
  for (const k of fromEnv.split(/[,\s]+/)) {
    const t = k.trim();
    if (t && t.startsWith("AIza")) keys.add(t);
  }
  if (keys.size === 0) {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (SUPABASE_URL && SRV) {
      try {
        const dbRes = await fetch(
          `${SUPABASE_URL}/rest/v1/site_settings?key=eq.gemini_api_key&select=value`,
          { headers: { apikey: SRV, Authorization: `Bearer ${SRV}` } },
        );
        const dbData = await dbRes.json();
        const raw = String(dbData?.[0]?.value || "").trim();
        for (const k of raw.split(/[,\s]+/)) {
          const t = k.trim();
          if (t && t.startsWith("AIza")) keys.add(t);
        }
      } catch (e) {
        console.error("[AI] DB key fetch failed:", e instanceof Error ? e.message : e);
      }
    }
  }
  return Array.from(keys);
}

let keyCursor = 0;
function rotatedKeys(keys: string[]): string[] {
  if (keys.length === 0) return [];
  const start = keyCursor % keys.length;
  keyCursor = (keyCursor + 1) % keys.length;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

  const ip = getClientIp(req);

  if (!originAllowed(req)) {
    return jsonResp({ error: "Forbidden origin" }, 403);
  }

  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResp({ error: "Payload too large" }, 413);
  }

  let body: any;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return jsonResp({ error: "Payload too large" }, 413);
    body = JSON.parse(raw);
  } catch {
    return jsonResp({ error: "Invalid JSON" }, 400);
  }
  if (!body || typeof body !== "object") return jsonResp({ error: "Invalid body" }, 400);

  const type = safeStr(body.type, 50);

  try {
    if (type === "send-otp-email") {
      const { email, otp, name } = body;
      if (!email || !otp) return jsonResp({ error: "Missing email/otp" }, 400);
      const rl = checkRateLimit(ip, true);
      if (!rl.ok) return jsonResp({ error: "Too many requests", retryAfter: rl.retryAfter }, 429);

      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      const GMAIL_USER = Deno.env.get("GMAIL_USER");
      const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

      const safeOtp = String(otp).replace(/[^0-9A-Za-z]/g, "").slice(0, 10);
      const safeName = safeStr(name, 80).replace(/[<>]/g, "");
      const safeEmail = safeStr(email, 200);

      const htmlBody = `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fff;border-radius:12px;border:1px solid #eee">
          <div style="text-align:center;margin-bottom:24px">
            <h2 style="color:#f97316;margin:0">E Commerce</h2>
            <p style="color:#666;font-size:13px;margin:4px 0">Pakistan's #1 Online Store</p>
          </div>
          <p style="font-size:15px;color:#333">Hi <strong>${safeName || "there"}</strong>,</p>
          <p style="font-size:14px;color:#555">Your one-time verification code is:</p>
          <div style="text-align:center;margin:24px 0">
            <span style="display:inline-block;background:#f97316;color:#fff;font-size:36px;font-weight:bold;letter-spacing:10px;padding:14px 28px;border-radius:10px">${safeOtp}</span>
          </div>
          <p style="font-size:13px;color:#888">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p style="font-size:12px;color:#aaa;text-align:center">E Commerce Store</p>
        </div>`;

      if (GMAIL_USER && GMAIL_APP_PASSWORD) {
        try {
          const encoder = new TextEncoder();
          const rawEmail = [
            `From: E Commerce <${GMAIL_USER}>`,
            `To: ${safeEmail}`,
            `Subject: ${safeOtp} -- Your E Commerce Verification Code`,
            `MIME-Version: 1.0`,
            `Content-Type: text/html; charset=UTF-8`,
            ``,
            htmlBody,
          ].join("\r\n");

          const smtpConn = await Deno.connectTls({ hostname: "smtp.gmail.com", port: 465 });
          const dec = new TextDecoder();
          const read = async () => dec.decode((await smtpConn.read(new Uint8Array(4096))) ?? new Uint8Array());
          const write = async (s: string) => await smtpConn.write(encoder.encode(s + "\r\n"));

          await read();
          await write(`EHLO stopy.edge`);
          await read();
          await write(`AUTH LOGIN`);
          await read();
          await write(btoa(GMAIL_USER));
          await read();
          await write(btoa(GMAIL_APP_PASSWORD));
          const authResp = await read();
          if (!authResp.includes("235")) throw new Error(`Gmail auth failed`);

          await write(`MAIL FROM:<${GMAIL_USER}>`);
          await read();
          await write(`RCPT TO:<${safeEmail}>`);
          await read();
          await write(`DATA`);
          await read();
          await write(rawEmail + "\r\n.");
          await read();
          await write(`QUIT`);
          smtpConn.close();

          return jsonResp({ success: true, provider: "gmail_smtp" });
        } catch (gmailErr) {
          console.error("[OTP-Gmail] Error:", gmailErr instanceof Error ? gmailErr.message : gmailErr);
        }
      }

      if (RESEND_API_KEY) {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `E Commerce <${GMAIL_USER || "noreply@ecommerce.store"}>`,
            to: [safeEmail],
            subject: `${safeOtp} -- Your E Commerce Verification Code`,
            html: htmlBody,
          }),
        });
        const emailResult = await emailRes.json();
        if (!emailRes.ok) {
          console.error("Resend error");
          return jsonResp({ error: "Email delivery failed" }, 500);
        }
        return jsonResp({ success: true, id: emailResult.id, provider: "resend" });
      }

      console.log(`[OTP-DEV] To: ${safeEmail} | Code: ${safeOtp}`);
      return jsonResp({ success: true, debug: true, note: "OTP logged server-side." });
    }

    if (type === "reset_password") {
      const rl = checkRateLimit(ip, true);
      if (!rl.ok) return jsonResp({ error: "Too many requests", retryAfter: rl.retryAfter }, 429);

      const { email: resetEmail, newPassword } = body;
      if (!resetEmail || !newPassword || String(newPassword).length < 8) {
        return jsonResp({ error: "Invalid request" }, 400);
      }
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return jsonResp({ error: "Service unavailable" }, 500);
      }
      const listRes = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(resetEmail)}`,
        { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY } },
      );
      const listData = await listRes.json();
      const userId = listData.users?.[0]?.id;
      if (!userId) return jsonResp({ error: "User not found" }, 404);

      const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const updateData = await updateRes.json();
      if (updateData.error) return jsonResp({ error: "Update failed" }, 400);
      return jsonResp({ success: true });
    }

    if (type === "virtual-tryon-start") {
      const rl = checkRateLimit(ip, true);
      if (!rl.ok) return jsonResp({ error: "Too many requests", retryAfter: rl.retryAfter }, 429);

      const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
      if (!REPLICATE_API_KEY) return jsonResp({ error: "Try-on not configured" }, 500);
      const { userImageUrl, productImageUrl, categoryType, productTitle } = body;
      if (!userImageUrl || !productImageUrl) return jsonResp({ error: "Missing images" }, 400);

      // Map our category to IDM-VTON category enum: upper_body | lower_body | dresses
      // shoes -> lower_body (closest), bags -> upper_body (held/worn on upper), default upper_body
      let idmCategory = "upper_body";
      if (categoryType === "shoes") idmCategory = "lower_body";
      else if (categoryType === "dresses") idmCategory = "dresses";
      else if (categoryType === "bottoms" || categoryType === "pants") idmCategory = "lower_body";

      const description = safeStr(productTitle, 100) || (categoryType === "shoes" ? "footwear" : categoryType === "bags" ? "handbag accessory" : "garment");

      const IDM_VTON_VERSION = "0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985";
      const predRes = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: { Authorization: `Token ${REPLICATE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          version: IDM_VTON_VERSION,
          input: {
            human_img: userImageUrl,
            garm_img: productImageUrl,
            garment_des: description,
            category: idmCategory,
            crop: true,
            steps: 25,
            seed: Math.floor(Math.random() * 1000000),
          },
        }),
      });
      if (!predRes.ok) {
        const errBody = await predRes.text();
        console.error(`[tryon-start] Replicate ${predRes.status}: ${errBody.slice(0, 500)}`);
        if (predRes.status === 402 || /payment|billing/i.test(errBody)) {
          return jsonResp({ error: "Replicate billing required", reply: "Virtual try-on requires a paid Replicate account. Add credit at replicate.com/account/billing." });
        }
        return jsonResp({ error: "Try-on service error", detail: errBody.slice(0, 200), status: predRes.status });
      }
      const prediction = await predRes.json();
      return jsonResp({ predictionId: prediction.id, status: prediction.status });
    }

    if (type === "virtual-tryon-poll") {
      const rl = checkRateLimit(ip, false);
      if (!rl.ok) return jsonResp({ error: "Too many requests", retryAfter: rl.retryAfter }, 429);

      const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
      if (!REPLICATE_API_KEY) return jsonResp({ error: "Try-on not configured" }, 500);
      const { predictionId } = body;
      if (!predictionId || !/^[a-zA-Z0-9_-]{8,80}$/.test(String(predictionId))) {
        return jsonResp({ error: "Invalid prediction ID" }, 400);
      }
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { Authorization: `Token ${REPLICATE_API_KEY}` },
      });
      const pred = await pollRes.json();
      if (pred.status === "succeeded") {
        const outputUrl = Array.isArray(pred.output) ? pred.output[0] : pred.output;
        return jsonResp({ status: "succeeded", outputUrl });
      }
      if (pred.status === "failed" || pred.status === "canceled") {
        return jsonResp({ status: "failed", error: "Generation failed" });
      }
      return jsonResp({ status: pred.status });
    }

    const isHeavy = HEAVY_TYPES.has(type);
    const rl = checkRateLimit(ip, isHeavy);
    if (!rl.ok) {
      return jsonResp(
        {
          error: "Too many requests",
          retryAfter: rl.retryAfter,
          reply: "You're sending requests too fast. Please wait a moment and try again.",
        },
        429,
      );
    }

    const keys = await getGeminiKeys();
    if (keys.length === 0) {
      return jsonResp({
        error: "AI not configured",
        reply: "AI service is currently unavailable. Please ask the admin to configure the Gemini API key in Settings.",
      });
    }

    let systemPrompt = "";
    let useToolCalling = false;
    let tools: any[] = [];
    let toolChoice: any = undefined;

    if (type === "chat-support") {
      systemPrompt = `You are a helpful customer support assistant for an E Commerce Store - Pakistan's Online Store. 
You help customers with product inquiries, order status, returns, delivery info, payment methods (COD, JazzCash, EasyPaisa, Bank Transfer), and size guide.
Always be polite, respond in the user's language (English or Urdu), and keep answers concise.
If the customer asks about order tracking, ask for their order number.
If they ask about returns, explain 7-day return policy.
If they ask about delivery, explain free delivery above Rs. 3000, standard delivery Rs. 200.`;
    } else if (type === "admin-assistant") {
      systemPrompt = `You are an AI admin assistant for an E Commerce platform.
You help with sales analysis, restocking suggestions, dead stock identification, product descriptions, category suggestions, and order insights.
Be data-driven and actionable.`;
    } else if (type === "product-ai") {
      systemPrompt = `You are a product analysis AI for an E Commerce store in Pakistan.
Analyze the product image/title and generate structured product details.
For shoes: suggest appropriate sizes (36-45 for men, 36-41 for women, 28-35 for kids).
For bags: suggest sizes like Small, Medium, Large, XL.
Always suggest Pakistani market competitive prices in PKR.
Generate a detailed description of at least 30 lines covering material, comfort, style, use cases, care instructions etc.`;

      useToolCalling = true;
      tools = [
        {
          type: "function",
          function: {
            name: "suggest_product_details",
            description: "Return structured product details based on image/title analysis",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string", description: "Detailed product description, at least 30 lines" },
                category: { type: "string" },
                subCategory: { type: "string" },
                subSubCategory: { type: "string" },
                brand: { type: "string" },
                gender: { type: "string", enum: ["men", "women", "kids", "unisex"] },
                productType: { type: "string", enum: ["shoes", "bags"] },
                suggestedPrice: { type: "number" },
                suggestedOriginalPrice: { type: "number" },
                tags: { type: "array", items: { type: "string" } },
                suggestedColors: {
                  type: "array",
                  items: { type: "object", properties: { name: { type: "string" }, hex: { type: "string" } }, required: ["name", "hex"] },
                },
                suggestedSizes: { type: "array", items: { type: "string" } },
                returnPolicy: { type: "string" },
                claimDuration: { type: "string" },
                claimPolicy: { type: "string" },
              },
              required: ["title", "description", "category", "subCategory", "gender", "productType", "suggestedPrice", "suggestedSizes", "suggestedColors"],
              additionalProperties: false,
            },
          },
        },
      ];
      toolChoice = { type: "function", function: { name: "suggest_product_details" } };
    }

    const aiMessages: any[] = [{ role: "system", content: systemPrompt }];
    const { messages, imageUrl, message, history } = body;

    if (imageUrl && typeof imageUrl === "string") {
      if (imageUrl.length > MAX_IMAGE_URL_LENGTH) {
        return jsonResp({ error: "Image too large" }, 413);
      }
      if (!/^(https?:|data:image\/)/.test(imageUrl)) {
        return jsonResp({ error: "Invalid image URL" }, 400);
      }
    }

    if (imageUrl && type === "product-ai") {
      aiMessages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: safeStr(messages?.[0]?.content, MAX_MESSAGE_CHARS) || "Analyze this product image and suggest details for a Pakistani shoes/bags store." },
        ],
      });
    } else if (imageUrl && type === "size-advisor") {
      aiMessages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: safeStr(messages?.[0]?.content, MAX_MESSAGE_CHARS) || "Analyze this foot/body photo and recommend the correct size from the available sizes." },
        ],
      });
    } else if (type === "chat-support") {
      if (Array.isArray(history) && message) {
        const trimmedHistory = history.slice(-MAX_MESSAGES);
        for (const h of trimmedHistory) {
          if (h && typeof h === "object" && (h.role === "user" || h.role === "assistant")) {
            aiMessages.push({ role: h.role, content: safeStr(h.content, MAX_MESSAGE_CHARS) });
          }
        }
        aiMessages.push({ role: "user", content: safeStr(message, MAX_MESSAGE_CHARS) });
      } else if (Array.isArray(messages)) {
        const trimmed = messages.slice(-MAX_MESSAGES);
        for (const m of trimmed) {
          if (m && typeof m === "object" && (m.role === "user" || m.role === "assistant" || m.role === "system")) {
            aiMessages.push({ role: m.role, content: safeStr(m.content, MAX_MESSAGE_CHARS) });
          }
        }
      }
    } else if (Array.isArray(messages)) {
      const trimmed = messages.slice(-MAX_MESSAGES);
      for (const m of trimmed) {
        if (m && typeof m === "object" && (m.role === "user" || m.role === "assistant" || m.role === "system")) {
          aiMessages.push({ role: m.role, content: safeStr(m.content, MAX_MESSAGE_CHARS) });
        }
      }
    }

    const baseRequestBody: any = { messages: aiMessages, stream: false };
    if (useToolCalling) {
      baseRequestBody.tools = tools;
      baseRequestBody.tool_choice = toolChoice;
    }

    const modelChain = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash-lite"];
    let response: Response | null = null;
    let lastStatus = 0;
    let badKeys = 0;

    outer: for (const apiKey of rotatedKeys(keys)) {
      let keyHadAuthError = false;
      for (const model of modelChain) {
        const requestBody = { ...baseRequestBody, model };
        const r = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          },
        );
        if (r.ok) {
          response = r;
          break outer;
        }
        lastStatus = r.status;
        const errSnippet = (await r.text()).slice(0, 150);
        console.error(`[AI] key#${apiKey.slice(-4)} model=${model} status=${r.status}`);
        if (r.status === 401 || r.status === 403) {
          keyHadAuthError = true;
          break;
        }
        if (r.status !== 429 && r.status !== 503 && r.status !== 500) break outer;
      }
      if (keyHadAuthError) badKeys++;
    }

    if (!response) {
      if (badKeys === keys.length) {
        return jsonResp({
          error: "All Gemini API keys are invalid",
          reply: "AI service unavailable. The API keys may have expired. Admin: please update them in Settings or environment.",
        });
      }
      if (lastStatus === 429 || lastStatus === 503) {
        return jsonResp({
          error: "All AI models busy",
          reply: "AI is busy right now. Please wait a moment and try again. (Tip: add billing to your Gemini key for unlimited use.)",
        });
      }
      return jsonResp({ error: "AI service error", reply: "AI service encountered an error. Please try again." });
    }

    const result = await response.json();

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        return jsonResp(args);
      } catch {
        return jsonResp({ error: "Invalid AI tool response" }, 502);
      }
    }

    const content = result.choices?.[0]?.message?.content || "";
    return jsonResp({ reply: content || "Sorry, I couldn't generate a response." });
  } catch (e) {
    console.error("AI assistant error:", e instanceof Error ? e.message : e);
    return jsonResp({ error: "Internal error" }, 500);
  }
});
