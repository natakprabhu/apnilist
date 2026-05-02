import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'https://www.apnilist.co.in';
const BUCKET = 'sitemaps';
const SITEMAP_KEY = 'sitemap.xml';

const FALLBACK_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug, urlPath } = await req.json();

    if (!slug && !urlPath) {
      return new Response(
        JSON.stringify({ error: 'slug or urlPath required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const path = urlPath || `/articles/${slug}`;
    const fullUrl = `${BASE_URL}${path}`;
    const today = new Date().toISOString().split('T')[0];

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Try to download the existing sitemap from storage
    let xml = FALLBACK_SITEMAP;
    const { data: existing, error: dlError } = await supabase.storage
      .from(BUCKET)
      .download(SITEMAP_KEY);

    if (!dlError && existing) {
      xml = await existing.text();
    } else {
      console.log('No existing sitemap in storage, starting fresh.');
    }

    // If URL already exists, return early
    if (xml.includes(`<loc>${fullUrl}</loc>`)) {
      return new Response(
        JSON.stringify({ success: true, message: 'URL already in sitemap', url: fullUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newEntry = `  <url>\n    <loc>${fullUrl}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;

    // Insert before closing </urlset>
    if (xml.includes('</urlset>')) {
      xml = xml.replace('</urlset>', `${newEntry}</urlset>`);
    } else {
      xml = `${FALLBACK_SITEMAP.replace('</urlset>', newEntry + '</urlset>')}`;
    }

    const { error: upError } = await supabase.storage
      .from(BUCKET)
      .upload(SITEMAP_KEY, xml, {
        contentType: 'application/xml',
        upsert: true,
      });

    if (upError) throw upError;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(SITEMAP_KEY);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'URL added to sitemap',
        url: fullUrl,
        sitemapUrl: pub.publicUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('add-to-sitemap error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
