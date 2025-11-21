-- Add foreign key constraint between wishlist and products
ALTER TABLE public.wishlist
ADD CONSTRAINT wishlist_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES public.products(id)
ON DELETE CASCADE;