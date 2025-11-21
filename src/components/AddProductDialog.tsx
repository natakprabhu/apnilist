import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2 } from "lucide-react";

interface AddProductDialogProps {
  onProductAdded: () => void;
}

const AddProductDialog = ({ onProductAdded }: AddProductDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    image: "",
    amazonLink: "",
    flipkartLink: "",
    amazonPrice: "",
    flipkartPrice: "",
    description: "",
  });

  const handleAddProduct = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter product name",
        variant: "destructive",
      });
      return;
    }

    if (!formData.amazonLink && !formData.flipkartLink) {
      toast({
        title: "Error",
        description: "Please provide at least one product link (Amazon or Flipkart)",
        variant: "destructive",
      });
      return;
    }

    if (!formData.amazonPrice && !formData.flipkartPrice) {
      toast({
        title: "Error",
        description: "Please provide at least one price",
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

      // Check if product already exists by name or link
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .or(`name.eq.${formData.name}${formData.amazonLink ? `,amazon_link.eq.${formData.amazonLink}` : ''}${formData.flipkartLink ? `,flipkart_link.eq.${formData.flipkartLink}` : ''}`)
        .maybeSingle();

      let productId: string;

      if (existingProduct) {
        productId = existingProduct.id;
      } else {
        // Insert new product
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert({
            name: formData.name,
            image: formData.image || null,
            amazon_link: formData.amazonLink || null,
            flipkart_link: formData.flipkartLink || null,
            short_description: formData.description || null,
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
            amazon_price: formData.amazonPrice ? parseFloat(formData.amazonPrice) : null,
            flipkart_price: formData.flipkartPrice ? parseFloat(formData.flipkartPrice) : null,
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

      setFormData({
        name: "",
        image: "",
        amazonLink: "",
        flipkartLink: "",
        amazonPrice: "",
        flipkartPrice: "",
        description: "",
      });
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Product for Price Tracking</DialogTitle>
          <DialogDescription>
            Enter product details manually to start tracking prices
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              placeholder="e.g., iPhone 15 Pro 256GB"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Product Image URL</Label>
            <Input
              id="image"
              placeholder="https://..."
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief product description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amazon-link">Amazon Link</Label>
              <Input
                id="amazon-link"
                placeholder="https://amazon.in/..."
                value={formData.amazonLink}
                onChange={(e) => setFormData({ ...formData, amazonLink: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amazon-price">Amazon Price (₹)</Label>
              <Input
                id="amazon-price"
                type="number"
                placeholder="99999"
                value={formData.amazonPrice}
                onChange={(e) => setFormData({ ...formData, amazonPrice: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="flipkart-link">Flipkart Link</Label>
              <Input
                id="flipkart-link"
                placeholder="https://flipkart.com/..."
                value={formData.flipkartLink}
                onChange={(e) => setFormData({ ...formData, flipkartLink: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flipkart-price">Flipkart Price (₹)</Label>
              <Input
                id="flipkart-price"
                type="number"
                placeholder="99999"
                value={formData.flipkartPrice}
                onChange={(e) => setFormData({ ...formData, flipkartPrice: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            * Required fields. Provide at least one platform link and price.
          </p>
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
