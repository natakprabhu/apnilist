CREATE TABLE public.product_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  whats_in_box jsonb NOT NULL DEFAULT '[]'::jsonb,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  offers_amazon jsonb NOT NULL DEFAULT '[]'::jsonb,
  offers_flipkart jsonb NOT NULL DEFAULT '[]'::jsonb,
  avg_rating numeric,
  total_ratings integer,
  total_reviews integer,
  review_summary text,
  source text NOT NULL DEFAULT 'ai',
  enriched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_details_product_id ON public.product_details(product_id);

ALTER TABLE public.product_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read product_details"
  ON public.product_details FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert product_details"
  ON public.product_details FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update product_details"
  ON public.product_details FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete product_details"
  ON public.product_details FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER product_details_updated_at
  BEFORE UPDATE ON public.product_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();