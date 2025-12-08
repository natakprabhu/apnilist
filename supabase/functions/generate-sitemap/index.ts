import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all published articles
    const { data: articles, error } = await supabase
      .from('articles')
      .select('slug, updated_at, created_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching articles:', error);
      throw error;
    }

    const baseUrl = 'https://apnilist.lovable.app';
    const today = new Date().toISOString().split('T')[0];

    // Helper function to format date to W3C format (YYYY-MM-DD)
    const formatDate = (dateStr: string): string => {
      try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
      } catch {
        return today;
      }
    };

    // Generate sitemap XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages (only public pages - no auth required)
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/articles', priority: '0.9', changefreq: 'daily' },
      { url: '/deals', priority: '0.8', changefreq: 'daily' },
    ];

    staticPages.forEach((page) => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    // Article pages
    articles?.forEach((article) => {
      const lastmod = formatDate(article.updated_at || article.created_at);
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/articles/${article.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    console.log('Sitemap generated successfully with', articles?.length || 0, 'articles');

    return new Response(xml, { 
      headers: corsHeaders,
      status: 200 
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});