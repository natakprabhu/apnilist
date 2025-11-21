import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PriceTrackerCard from "@/components/PriceTrackerCard";
import AddProductDialog from "@/components/AddProductDialog";
import { Loader2 } from "lucide-react";

interface TrackedProduct {
  id: string;
  product: {
    id: string;
    name: string;
    image: string | null;
    amazon_link: string | null;
    flipkart_link: string | null;
  };
  priceHistory: Array<{
    created_at: string;
    amazon_price: number | null;
    flipkart_price: number | null;
  }>;
  alert?: {
    target_price: number;
    alert_enabled: boolean;
  };
}

const PriceTracker = () => {
  const [trackedProducts, setTrackedProducts] = useState<TrackedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTrackedProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: wishlistItems, error: wishlistError } = await supabase
        .from('wishlist')
        .select(`
          id,
          product_id,
          products (
            id,
            name,
            image,
            amazon_link,
            flipkart_link
          )
        `)
        .eq('user_id', user.id);

      if (wishlistError) throw wishlistError;

      const productsWithHistory = await Promise.all(
        (wishlistItems || []).map(async (item: any) => {
          const { data: history } = await supabase
            .from('product_price_history')
            .select('created_at, amazon_price, flipkart_price')
            .eq('product_id', item.product_id)
            .order('created_at', { ascending: false });

          const { data: alert } = await supabase
            .from('price_alerts')
            .select('target_price, alert_enabled')
            .eq('user_id', user.id)
            .eq('product_id', item.product_id)
            .maybeSingle();

          return {
            id: item.id,
            product: item.products,
            priceHistory: history || [],
            alert: alert || undefined,
          };
        })
      );

      setTrackedProducts(productsWithHistory);
    } catch (error) {
      console.error('Error fetching tracked products:', error);
      toast({
        title: "Error",
        description: "Failed to load tracked products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackedProducts();
  }, []);

  const handleRemoveProduct = async (wishlistId: string) => {
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', wishlistId);

      if (error) throw error;

      toast({
        title: "Product Removed",
        description: "Product removed from price tracking",
      });
      fetchTrackedProducts();
    } catch (error) {
      console.error('Error removing product:', error);
      toast({
        title: "Error",
        description: "Failed to remove product",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">Price Tracker</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Monitor prices across Amazon, Flipkart and more. Get alerts when prices drop!
                  </p>
                </div>
                <AddProductDialog onProductAdded={fetchTrackedProducts} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : trackedProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-2">No products being tracked</p>
                    <p className="text-sm text-muted-foreground">
                      Add products to your wishlist to start tracking prices
                    </p>
                  </div>
                ) : (
                  trackedProducts.map((item) => (
                    <PriceTrackerCard
                      key={item.id}
                      product={item.product}
                      priceHistory={item.priceHistory}
                      targetPrice={item.alert?.target_price}
                      alertEnabled={item.alert?.alert_enabled}
                      onRemove={() => handleRemoveProduct(item.id)}
                      onTargetPriceSet={fetchTrackedProducts}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PriceTracker;
