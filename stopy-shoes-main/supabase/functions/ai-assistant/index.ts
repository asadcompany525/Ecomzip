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

    // Return chat response
    const content = result.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    return new Response(JSON.stringify({ reply: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
