-- Dummy Data for Price Tracker Demo
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/alyidbbieegylgvdqmis/sql/new

-- Step 1: Insert sample products
INSERT INTO products (name, slug, image, short_description, category_id, amazon_link, flipkart_link, pros, cons, badge)
VALUES 
  (
    'Samsung Galaxy S24 Ultra',
    'samsung-galaxy-s24-ultra',
    'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
    'Flagship smartphone with advanced camera and AI features',
    (SELECT id FROM categories WHERE name = 'TV' LIMIT 1),
    'https://amazon.in/samsung-s24',
    'https://flipkart.com/samsung-s24',
    '["Excellent camera quality", "Fast processor", "Long battery life", "Beautiful display"]'::jsonb,
    '["Expensive", "Heavy device"]'::jsonb,
    'Best Seller'
  ),
  (
    'Dell XPS 15 (2024)',
    'dell-xps-15-2024',
    'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400',
    'Premium laptop for professionals and creators',
    (SELECT id FROM categories WHERE name = 'TV' LIMIT 1),
    'https://amazon.in/dell-xps-15',
    'https://flipkart.com/dell-xps-15',
    '["Powerful performance", "Great display", "Premium build quality", "Good keyboard"]'::jsonb,
    '["Expensive", "Average battery life", "Limited ports"]'::jsonb,
    'Editor''s Choice'
  ),
  (
    'LG 55" 4K OLED TV',
    'lg-55-4k-oled-tv',
    'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400',
    'Stunning 4K OLED display with smart features',
    (SELECT id FROM categories WHERE name = 'TV' LIMIT 1),
    'https://amazon.in/lg-oled-tv',
    'https://flipkart.com/lg-oled-tv',
    '["Amazing picture quality", "Deep blacks", "Great for movies", "Smart TV features"]'::jsonb,
    '["Expensive", "Risk of burn-in"]'::jsonb,
    'Premium Pick'
  );

-- Step 2: Add price history for existing products (last 90 days with price variations)
-- For product: De'Longhi Magnifica S (Coffee Maker)
INSERT INTO product_price_history (product_id, amazon_price, amazon_discount, flipkart_price, flipkart_discount, created_at)
SELECT 
  '225ea661-5087-49c3-a34b-b705761fd948'::uuid,
  45000 + (random() * 5000)::numeric,
  10 + (random() * 15)::numeric,
  44000 + (random() * 6000)::numeric,
  8 + (random() * 12)::numeric,
  now() - (n || ' days')::interval
FROM generate_series(0, 90, 3) n;

-- For product: Philips 3200 Series
INSERT INTO product_price_history (product_id, amazon_price, amazon_discount, flipkart_price, flipkart_discount, created_at)
SELECT 
  '126dee71-067f-4942-b544-fe18793b0af2'::uuid,
  52000 + (random() * 8000)::numeric,
  12 + (random() * 18)::numeric,
  51000 + (random() * 7000)::numeric,
  10 + (random() * 15)::numeric,
  now() - (n || ' days')::interval
FROM generate_series(0, 90, 3) n;

-- For product: Nespresso Essenza Mini
INSERT INTO product_price_history (product_id, amazon_price, amazon_discount, flipkart_price, flipkart_discount, created_at)
SELECT 
  'fedf502a-94ac-4c15-b272-60c57b8f9a50'::uuid,
  8500 + (random() * 2000)::numeric,
  15 + (random() * 20)::numeric,
  8300 + (random() * 1800)::numeric,
  12 + (random() * 18)::numeric,
  now() - (n || ' days')::interval
FROM generate_series(0, 90, 3) n;

-- Step 3: Add newly created products to price history
-- (Run this AFTER Step 1 completes)
DO $$
DECLARE
  samsung_id uuid;
  dell_id uuid;
  lg_id uuid;
BEGIN
  SELECT id INTO samsung_id FROM products WHERE slug = 'samsung-galaxy-s24-ultra';
  SELECT id INTO dell_id FROM products WHERE slug = 'dell-xps-15-2024';
  SELECT id INTO lg_id FROM products WHERE slug = 'lg-55-4k-oled-tv';

  -- Samsung S24 Ultra price history
  INSERT INTO product_price_history (product_id, amazon_price, amazon_discount, flipkart_price, flipkart_discount, created_at)
  SELECT 
    samsung_id,
    124999 + (random() * 10000)::numeric,
    8 + (random() * 12)::numeric,
    122999 + (random() * 12000)::numeric,
    7 + (random() * 10)::numeric,
    now() - (n || ' days')::interval
  FROM generate_series(0, 90, 3) n;

  -- Dell XPS 15 price history
  INSERT INTO product_price_history (product_id, amazon_price, amazon_discount, flipkart_price, flipkart_discount, created_at)
  SELECT 
    dell_id,
    189999 + (random() * 20000)::numeric,
    10 + (random() * 15)::numeric,
    185999 + (random() * 18000)::numeric,
    9 + (random() * 12)::numeric,
    now() - (n || ' days')::interval
  FROM generate_series(0, 90, 3) n;

  -- LG OLED TV price history
  INSERT INTO product_price_history (product_id, amazon_price, amazon_discount, flipkart_price, flipkart_discount, created_at)
  SELECT 
    lg_id,
    149999 + (random() * 25000)::numeric,
    15 + (random() * 20)::numeric,
    145999 + (random() * 22000)::numeric,
    12 + (random() * 18)::numeric,
    now() - (n || ' days')::interval
  FROM generate_series(0, 90, 3) n;
END $$;

-- Step 4: Add products to wishlist for the current user
-- IMPORTANT: Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users
-- You can find your user ID by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- For the logged-in user (b0abe36e-0d02-401d-b52d-7563673c0aeb from the session)
INSERT INTO wishlist (user_id, product_id)
VALUES 
  ('b0abe36e-0d02-401d-b52d-7563673c0aeb', '225ea661-5087-49c3-a34b-b705761fd948'),
  ('b0abe36e-0d02-401d-b52d-7563673c0aeb', '126dee71-067f-4942-b544-fe18793b0af2'),
  ('b0abe36e-0d02-401d-b52d-7563673c0aeb', 'fedf502a-94ac-4c15-b272-60c57b8f9a50')
ON CONFLICT (user_id, product_id) DO NOTHING;

-- Add newly created products to wishlist (run after products are created)
INSERT INTO wishlist (user_id, product_id)
SELECT 
  'b0abe36e-0d02-401d-b52d-7563673c0aeb',
  id
FROM products 
WHERE slug IN ('samsung-galaxy-s24-ultra', 'dell-xps-15-2024', 'lg-55-4k-oled-tv')
ON CONFLICT (user_id, product_id) DO NOTHING;

-- Step 5: Add price alerts for some products
INSERT INTO price_alerts (user_id, product_id, target_price, alert_enabled)
VALUES 
  ('b0abe36e-0d02-401d-b52d-7563673c0aeb', '225ea661-5087-49c3-a34b-b705761fd948', 42000, true),
  ('b0abe36e-0d02-401d-b52d-7563673c0aeb', 'fedf502a-94ac-4c15-b272-60c57b8f9a50', 7500, true)
ON CONFLICT (user_id, product_id) DO UPDATE 
SET target_price = EXCLUDED.target_price, alert_enabled = EXCLUDED.alert_enabled;

-- Verify the data was inserted
SELECT 'Products added:' as status, COUNT(*) as count FROM products WHERE slug IN ('samsung-galaxy-s24-ultra', 'dell-xps-15-2024', 'lg-55-4k-oled-tv');
SELECT 'Price history entries:' as status, COUNT(*) as count FROM product_price_history;
SELECT 'Wishlist items for user:' as status, COUNT(*) as count FROM wishlist WHERE user_id = 'b0abe36e-0d02-401d-b52d-7563673c0aeb';
SELECT 'Price alerts:' as status, COUNT(*) as count FROM price_alerts WHERE user_id = 'b0abe36e-0d02-401d-b52d-7563673c0aeb';