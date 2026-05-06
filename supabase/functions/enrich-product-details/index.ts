// Enrich a product with rich details (specs, highlights, description, gallery,
// offers, ratings) using Lovable AI Gateway, then upsert into product_details.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TOOL = {
  type: "function",
  function: {
    name: "save_product_details",
    description: "Return rich, accurate product details.",
    parameters: {
      type: "object",
      properties: {
        specs: {
          type: "object",
          description:
            "Key-value specs (brand, model, color, RAM, storage, display, processor, battery, weight, dimensions, warranty, etc.). Keep keys human readable.",
          additionalProperties: { type: "string" },
        },
        highlights: {
          type: "array",
          items: { type: "string" },
          description: "5-8 short marketing highlight bullets.",
        },
        description: {
          type: "string",
          description: "2-4 paragraph product description in plain text.",
        },
        whats_in_box: {
          type: "array",
          items: { type: "string" },
          description: "Items typically included in the box.",
        },
        gallery: {
          type: "array",
          items: { type: "string" },
          description: "Optional public image URLs. Empty array if unsure.",
        },
        offers_amazon: {
          type: "array",
          items: { type: "string" },
          description: "Common Amazon bank/exchange offers (generic).",
        },
        offers_flipkart: {
          type: "array",
          items: { type: "string" },
          description: "Common Flipkart bank/exchange offers (generic).",
        },
        avg_rating: { type: "number", description: "Approx avg rating 0-5." },
        total_ratings: { type: "integer" },
        total_reviews: { type: "integer" },
        review_summary: {
          type: "string",
          description: "1-2 sentence summary of typical buyer reviews.",
        },
      },
      required: ["specs", "highlights", "description"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { product_id } = await req.json();
    if (!product_id) {
      return new Response(JSON.stringify({ error: "product_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: product, error: pErr } = await admin
      .from("products")
      .select("id, name, slug, short_description, image")
      .eq("id", product_id)
      .maybeSingle();
    if (pErr || !product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Generate accurate, India-market product details for the following product. Be factual; if a spec is uncertain, omit it rather than invent.

Product name: ${product.name}
${product.short_description ? `Existing description: ${product.short_description}` : ""}
Primary image URL (include in gallery): ${product.image || "(none)"}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a meticulous Indian e-commerce product researcher. Return concise, factual product info." },
          { role: "user", content: prompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "save_product_details" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      if (aiRes.status === 429 || aiRes.status === 402) {
        return new Response(JSON.stringify({ error: aiRes.status === 429 ? "Rate limited, try again shortly." : "AI credits exhausted." }), {
          status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const details = JSON.parse(call.function.arguments);

    // Ensure primary image is in gallery
    const gallery: string[] = Array.isArray(details.gallery) ? details.gallery : [];
    if (product.image && !gallery.includes(product.image)) gallery.unshift(product.image);

    const row = {
      product_id: product.id,
      specs: details.specs || {},
      highlights: details.highlights || [],
      description: details.description || null,
      whats_in_box: details.whats_in_box || [],
      gallery,
      offers_amazon: details.offers_amazon || [],
      offers_flipkart: details.offers_flipkart || [],
      avg_rating: details.avg_rating ?? null,
      total_ratings: details.total_ratings ?? null,
      total_reviews: details.total_reviews ?? null,
      review_summary: details.review_summary ?? null,
      source: "ai",
      enriched_at: new Date().toISOString(),
    };

    const { error: upErr } = await admin
      .from("product_details")
      .upsert(row, { onConflict: "product_id" });
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ success: true, product_id: product.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-product-details error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
