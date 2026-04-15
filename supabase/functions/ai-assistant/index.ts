import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { messages, type, imageUrl, message, history } = body;

    // Handle OTP email — tries Gmail SMTP first, then Resend, then logs as fallback
    if (type === "send-otp-email") {
      const { email, otp, name } = body;
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      const GMAIL_USER = Deno.env.get("GMAIL_USER");
      const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

      const htmlBody = `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fff;border-radius:12px;border:1px solid #eee">
          <div style="text-align:center;margin-bottom:24px">
            <h2 style="color:#f97316;margin:0">Stopy Shoes</h2>
            <p style="color:#666;font-size:13px;margin:4px 0">Pakistan's #1 Shoes & Bags Store</p>
          </div>
          <p style="font-size:15px;color:#333">Hi <strong>${name || 'there'}</strong>,</p>
          <p style="font-size:14px;color:#555">Your one-time verification code is:</p>
          <div style="text-align:center;margin:24px 0">
            <span style="display:inline-block;background:#f97316;color:#fff;font-size:36px;font-weight:bold;letter-spacing:10px;padding:14px 28px;border-radius:10px">${otp}</span>
          </div>
          <p style="font-size:13px;color:#888">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p style="font-size:12px;color:#aaa;text-align:center">Stopy Shoes — stopychoices.com</p>
        </div>`;

      // 1. Try Gmail SMTP via nodemailer-compatible approach (RFC 2822 raw SMTP over fetch to Gmail API)
      if (GMAIL_USER && GMAIL_APP_PASSWORD) {
        try {
          // Use Gmail SMTP via raw TCP (Deno native SMTP)
          const encoder = new TextEncoder();
          const boundary = `stopy_${Date.now()}`;
          const rawEmail = [
            `From: Stopy Shoes <${GMAIL_USER}>`,
            `To: ${email}`,
            `Subject: ${otp} — Your Stopy Shoes Verification Code`,
            `MIME-Version: 1.0`,
            `Content-Type: text/html; charset=UTF-8`,
            ``,
            htmlBody,
          ].join("\r\n");

          // Encode as base64url for Gmail API
          const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

          // Use Gmail API with app password auth via SMTP relay
          // Since Deno Edge Functions can't do raw TCP, use Gmail SMTP via fetch to smtp2go or similar
          // Fallback: use a lightweight SMTP-over-HTTPS approach
          console.log(`[OTP-Gmail] Would send via ${GMAIL_USER} to ${email} | Code: ${otp}`);
          
          // Actually send via Gmail SMTP using Deno's net (TCP)
          const smtpConn = await Deno.connectTls({ hostname: "smtp.gmail.com", port: 465 });
          const dec = new TextDecoder();
          const read = async () => dec.decode(await smtpConn.read(new Uint8Array(4096)) ?? new Uint8Array());
          const write = async (s: string) => await smtpConn.write(encoder.encode(s + "\r\n"));
          
          await read(); // 220 greeting
          await write(`EHLO stopy.edge`);
          await read();
          await write(`AUTH LOGIN`);
          await read();
          await write(btoa(GMAIL_USER));
          await read();
          await write(btoa(GMAIL_APP_PASSWORD));
          const authResp = await read();
          if (!authResp.includes('235')) throw new Error(`Gmail auth failed: ${authResp}`);
          
          await write(`MAIL FROM:<${GMAIL_USER}>`);
          await read();
          await write(`RCPT TO:<${email}>`);
          await read();
          await write(`DATA`);
          await read();
          await write(rawEmail + "\r\n.");
          await read();
          await write(`QUIT`);
          smtpConn.close();
          
          console.log(`[OTP-Gmail-SMTP] Sent to ${email}`);
          return new Response(JSON.stringify({ success: true, provider: "gmail_smtp" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (gmailErr) {
          console.error("[OTP-Gmail] Error:", gmailErr);
          // Fall through to Resend
        }
      }

      // 2. Try Resend API
      if (RESEND_API_KEY) {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Stopy Shoes <noreply@stopychoices.com>",
            to: [email],
            subject: `${otp} — Your Stopy Shoes Verification Code`,
            html: htmlBody,
          }),
        });
        const emailResult = await emailRes.json();
        if (!emailRes.ok) {
          console.error("Resend error:", emailResult);
          return new Response(JSON.stringify({ error: "Email delivery failed", detail: emailResult }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true, id: emailResult.id, provider: "resend" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. Fallback: log the OTP code (dev mode)
      console.log(`[OTP-DEV] To: ${email} | Code: ${otp} | Configure GMAIL_USER+GMAIL_APP_PASSWORD or RESEND_API_KEY for real delivery`);
      return new Response(JSON.stringify({ success: true, debug: true, note: "OTP logged server-side. Set GMAIL_USER+GMAIL_APP_PASSWORD or RESEND_API_KEY env vars to enable real delivery." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle password reset using Supabase Admin API
    if (type === "reset_password") {
      const { email: resetEmail, newPassword } = body;
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: "Service role key not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(resetEmail)}`, {
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY },
      });
      const listData = await listRes.json();
      const userId = listData.users?.[0]?.id;
      if (!userId) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
      if (updateData.error) {
        return new Response(JSON.stringify({ error: updateData.error }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── True AI Virtual Try-On via Replicate ────────────────────────────────
    if (type === "virtual-tryon-start") {
      const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
      if (!REPLICATE_API_KEY) {
        return new Response(JSON.stringify({ error: "REPLICATE_API_KEY is not configured in Supabase secrets." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { userImageUrl, productImageUrl, categoryType } = body;

      // Map store category → fashn/tryon category
      let tryonCategory = "tops";
      if (categoryType === "shoes" || categoryType === "generic") tryonCategory = "bottoms";

      const predRes = await fetch("https://api.replicate.com/v1/models/fashn/tryon/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${REPLICATE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            model_image: userImageUrl,
            garment_image: productImageUrl,
            category: tryonCategory,
            num_inference_steps: 30,
            guidance_scale: 2.0,
          },
        }),
      });

      if (!predRes.ok) {
        const errText = await predRes.text();
        return new Response(JSON.stringify({ error: `Replicate error: ${errText}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const prediction = await predRes.json();
      return new Response(JSON.stringify({ predictionId: prediction.id, status: prediction.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "virtual-tryon-poll") {
      const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
      if (!REPLICATE_API_KEY) {
        return new Response(JSON.stringify({ error: "REPLICATE_API_KEY not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { predictionId } = body;
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { Authorization: `Token ${REPLICATE_API_KEY}` },
      });
      const pred = await pollRes.json();

      if (pred.status === "succeeded") {
        const outputUrl = Array.isArray(pred.output) ? pred.output[0] : pred.output;
        return new Response(JSON.stringify({ status: "succeeded", outputUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (pred.status === "failed" || pred.status === "canceled") {
        return new Response(JSON.stringify({ status: "failed", error: pred.error || "Generation failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ status: pred.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let useToolCalling = false;
    let tools: any[] = [];
    let toolChoice: any = undefined;

    if (type === "chat-support") {
      systemPrompt = `You are a helpful customer support assistant for Stopy Shoes - Pakistan's #1 Shoes & Bags Store. 
You help customers with product inquiries, order status, returns, delivery info, payment methods (COD, JazzCash, EasyPaisa, Bank Transfer), and size guide.
Always be polite, respond in the user's language (English or Urdu), and keep answers concise.
If the customer asks about order tracking, ask for their order number.
If they ask about returns, explain 7-day return policy.
If they ask about delivery, explain free delivery above Rs. 3000, standard delivery Rs. 200.`;
    } else if (type === "admin-assistant") {
      systemPrompt = `You are an AI admin assistant for Stopy Shoes e-commerce platform.
You help with sales analysis, restocking suggestions, dead stock identification, product descriptions, category suggestions, and order insights.
Be data-driven and actionable.`;
    } else if (type === "product-ai") {
      systemPrompt = `You are a product analysis AI for Stopy Shoes Pakistan.
Analyze the product image/title and generate structured product details.
For shoes: suggest appropriate sizes (36-45 for men, 36-41 for women, 28-35 for kids).
For bags: suggest sizes like Small, Medium, Large, XL.
Always suggest Pakistani market competitive prices in PKR.
Generate a detailed description of at least 30 lines covering material, comfort, style, use cases, care instructions etc.`;
      
      useToolCalling = true;
      tools = [{
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
                items: { type: "object", properties: { name: { type: "string" }, hex: { type: "string" } }, required: ["name", "hex"] }
              },
              suggestedSizes: { type: "array", items: { type: "string" } },
              returnPolicy: { type: "string" },
              claimDuration: { type: "string" },
              claimPolicy: { type: "string" }
            },
            required: ["title", "description", "category", "subCategory", "gender", "productType", "suggestedPrice", "suggestedSizes", "suggestedColors"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "suggest_product_details" } };
    }

    // Build messages
    const aiMessages: any[] = [{ role: "system", content: systemPrompt }];
    
    if (imageUrl && type === "product-ai") {
      aiMessages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: messages?.[0]?.content || "Analyze this product image and suggest details for a Pakistani shoes/bags store." }
        ]
      });
    } else if (imageUrl && type === "size-advisor") {
      // Vision-based size advisor: AI analyzes the foot/body photo
      aiMessages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: messages?.[0]?.content || "Analyze this foot/body photo and recommend the correct size from the available sizes." }
        ]
      });
    } else if (type === "chat-support") {
      // Handle both old format (message+history) and new format (messages array)
      if (history && message) {
        aiMessages.push(...history.map((h: any) => ({ role: h.role, content: h.content })));
        aiMessages.push({ role: "user", content: message });
      } else if (messages) {
        aiMessages.push(...messages);
      }
    } else if (messages) {
      aiMessages.push(...messages);
    }

    const requestBody: any = {
      model: "google/gemini-2.5-flash",
      messages: aiMessages,
    };

    if (useToolCalling) {
      requestBody.tools = tools;
      requestBody.tool_choice = toolChoice;
      requestBody.stream = false;
    } else {
      requestBody.stream = false;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    
    // Handle tool calls for product-ai
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const args = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = result.choices?.[0]?.message?.content || "";

    // Return chat response
    return new Response(JSON.stringify({ reply: content || "Sorry, I couldn't generate a response." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
