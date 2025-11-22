-- Add admin RLS policies for products table
-- Admins can insert products
CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  )
);

-- Admins can update products
CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  )
);

-- Admins can delete products
CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  )
);