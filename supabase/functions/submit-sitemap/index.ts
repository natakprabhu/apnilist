const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sitemapUrl = 'https://alyidbbieegylgvdqmis.supabase.co/functions/v1/generate-sitemap';
    const results = [];

    // Submit to Google Search Console
    const googleUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    try {
      const googleResponse = await fetch(googleUrl);
      results.push({
        service: 'Google Search Console',
        status: googleResponse.ok ? 'success' : 'failed',
        statusCode: googleResponse.status,
      });
      console.log('Google submission:', googleResponse.status);
    } catch (error) {
      console.error('Google submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        service: 'Google Search Console',
        status: 'error',
        error: errorMessage,
      });
    }

    // Submit to Bing Webmaster Tools
    const bingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    try {
      const bingResponse = await fetch(bingUrl);
      results.push({
        service: 'Bing Webmaster Tools',
        status: bingResponse.ok ? 'success' : 'failed',
        statusCode: bingResponse.status,
      });
      console.log('Bing submission:', bingResponse.status);
    } catch (error) {
      console.error('Bing submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        service: 'Bing Webmaster Tools',
        status: 'error',
        error: errorMessage,
      });
    }

    return new Response(
      JSON.stringify({
        message: 'Sitemap submission completed',
        results,
        sitemapUrl,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error submitting sitemap:', error);
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
