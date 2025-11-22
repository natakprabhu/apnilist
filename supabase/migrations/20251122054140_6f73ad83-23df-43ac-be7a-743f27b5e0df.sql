-- Add rating column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating numeric(2,1) CHECK (rating >= 0 AND rating <= 5);

COMMENT ON COLUMN products.rating IS 'Product rating from 0 to 5';
