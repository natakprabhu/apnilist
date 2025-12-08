-- Create storage bucket for sitemaps
INSERT INTO storage.buckets (id, name, public)
VALUES ('sitemaps', 'sitemaps', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to sitemaps
CREATE POLICY "Public can read sitemaps"
ON storage.objects FOR SELECT
USING (bucket_id = 'sitemaps');

-- Allow service role to manage sitemaps (for edge function)
CREATE POLICY "Service role can manage sitemaps"
ON storage.objects FOR ALL
USING (bucket_id = 'sitemaps')
WITH CHECK (bucket_id = 'sitemaps');