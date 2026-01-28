-- Add a field to track which articles have been converted to static HTML
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS static_html_generated boolean DEFAULT false;

-- Create an index for faster queries on unprocessed articles
CREATE INDEX IF NOT EXISTS idx_articles_static_html_generated 
ON public.articles(static_html_generated) 
WHERE static_html_generated = false;