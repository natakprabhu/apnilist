import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2 } from "lucide-react";

interface AddProductDialogProps {
  onProductAdded: () => void;
}

const AddProductDialog = ({ onProductAdded }: AddProductDialogProps) => {
  const [open, setOpen] = useState(false);
  const [productLink, setProductLink] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAddProduct = async () => {
    if (!productLink.trim()) {
      toast({
        title: "Error",
        description: "Please enter a product link",
        variant: "destructive",
      });
      return;
    }

    // Validate if it's Amazon or Flipkart link
    const isAmazon = productLink.includes('amazon.');
    const isFlipkart = productLink.includes('flipkart.');
    
    if (!isAmazon && !isFlipkart) {
      toast({
        title: "Invalid Link",
        description: "Please provide a valid Amazon or Flipkart product link",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to add products",
          variant: "destructive",
        });
        return;
      }

      // Call edge function to scrape product details
      const { data, error } = await supabase.functions.invoke('scrape-product', {
        body: { 
          url: productLink,
          platform: isAmazon ? 'amazon' : 'flipkart'
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to scrape product details');
      }

      const productData = data.product;

      // Check if product already exists by name or link
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .or(`name.eq.${productData.name},amazon_link.eq.${productData.amazon_link},flipkart_link.eq.${productData.flipkart_link}`)
        .maybeSingle();

      let productId: string;

      if (existingProduct) {
        productId = existingProduct.id;
      } else {
        // Insert new product
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert({
            name: productData.name,
            image: productData.image,
            amazon_link: isAmazon ? productLink : null,
            flipkart_link: isFlipkart ? productLink : null,
            short_description: productData.description,
          })
          .select()
          .single();

        if (productError) throw productError;
        productId = newProduct.id;

        // Add initial price history
        await supabase
          .from('product_price_history')
          .insert({
            product_id: productId,
            amazon_price: isAmazon ? productData.price : null,
            flipkart_price: isFlipkart ? productData.price : null,
          });
      }

      // Check if already in wishlist
      const { data: wishlistItem } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (!wishlistItem) {
        // Add to wishlist
        const { error: wishlistError } = await supabase
          .from('wishlist')
          .insert({
            user_id: user.id,
            product_id: productId,
          });

        if (wishlistError) throw wishlistError;
      }

      toast({
        title: "Success",
        description: "Product added to your price tracker!",
      });

      setProductLink("");
      setOpen(false);
      onProductAdded();
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product to Track
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Product for Price Tracking</DialogTitle>
          <DialogDescription>
            Paste an Amazon or Flipkart product link to start tracking its price automatically
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="product-link">Product Link</Label>
            <Input
              id="product-link"
              placeholder="https://www.amazon.in/... or https://www.flipkart.com/..."
              value={productLink}
              onChange={(e) => setProductLink(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              We'll automatically extract product details and start tracking prices across platforms
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAddProduct} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Adding..." : "Add Product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductDialog;
