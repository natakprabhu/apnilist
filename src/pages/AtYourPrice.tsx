import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ExternalLink, TrendingDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PriceHistoryChart from "@/components/PriceHistoryChart";

interface AtYourPriceProduct {
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
  targetPrice: number;
  currentPrice: number;
  lowestPrice: number;
  mrp: number;
  percentageDrop: number;
  cheapestStore: 'amazon' | 'flipkart';
  buyLink: string;
}

const AtYourPrice = () => {
  const [products, setProducts] = useState<AtYourPriceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const fetchQualifiedProducts = async () => {
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

      const qualifiedProducts: AtYourPriceProduct[] = [];

      for (const item of wishlistItems || []) {
        const { data: history } = await supabase
          .from('product_price_history')
          .select('created_at, amazon_price, flipkart_price')
          .eq('product_id', item.product_id)
          .order('created_at', { ascending: false });

        const { data: alert } = await supabase
          .from('price_alerts')
          .select('target_price')
          .eq('user_id', user.id)
          .eq('product_id', item.product_id)
          .maybeSingle();

        if (!history || history.length === 0) continue;

        const latestHistory = history[0];
        const currentAmazonPrice = latestHistory.amazon_price || 0;
        const currentFlipkartPrice = latestHistory.flipkart_price || 0;
        const currentPrice = Math.min(
          currentAmazonPrice > 0 ? currentAmazonPrice : Infinity,
          currentFlipkartPrice > 0 ? currentFlipkartPrice : Infinity
        );

        if (currentPrice === Infinity) continue;

        // Calculate lowest price ever
        const lowestPrice = Math.min(
          ...history.map(h => {
            const prices = [h.amazon_price, h.flipkart_price].filter(p => p && p > 0);
            return prices.length > 0 ? Math.min(...prices) : Infinity;
          }).filter(p => p !== Infinity)
        );

        // Calculate MRP (assume highest price is MRP)
        const mrp = Math.max(
          ...history.map(h => {
            const prices = [h.amazon_price, h.flipkart_price].filter(p => p && p > 0);
            return prices.length > 0 ? Math.max(...prices) : 0;
          })
        );

        const percentageDrop = ((mrp - currentPrice) / mrp) * 100;
        
        // Check if product qualifies
        const priceDropped10Percent = currentPrice <= lowestPrice * 0.9;
        const targetPriceMet = alert?.target_price && currentPrice <= alert.target_price;

        if (priceDropped10Percent || targetPriceMet) {
          const cheapestStore = currentAmazonPrice > 0 && currentAmazonPrice <= currentFlipkartPrice 
            ? 'amazon' 
            : 'flipkart';
          
          const buyLink = cheapestStore === 'amazon' 
            ? item.products.amazon_link 
            : item.products.flipkart_link;

          qualifiedProducts.push({
            id: item.id,
            product: item.products,
            priceHistory: history,
            targetPrice: alert?.target_price || 0,
            currentPrice,
            lowestPrice,
            mrp,
            percentageDrop,
            cheapestStore,
            buyLink: buyLink || '#',
          });
        }
      }

      setProducts(qualifiedProducts);
    } catch (error) {
      console.error('Error fetching qualified products:', error);
      toast({
        title: "Error",
        description: "Failed to load products at your price",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchQualifiedProducts();
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">At Your Price</CardTitle>
              <p className="text-sm text-muted-foreground">
                Products that have dropped 10% below their lowest price or met your target price
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-2">No products at your price yet</p>
                    <p className="text-sm text-muted-foreground">
                      Set target prices in Price Tracker to get notified
                    </p>
                  </div>
                ) : (
                  products.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            <img
                              src={item.product.image || '/placeholder.svg'}
                              alt={item.product.name}
                              className="w-full md:w-32 h-32 object-cover rounded-lg"
                            />
                          </div>

                          {/* Product Details */}
                          <div className="flex-1 space-y-4">
                            <div>
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <h3 className="font-semibold text-lg">{item.product.name}</h3>
                                <Badge className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1">
                                  <TrendingDown className="h-3 w-3" />
                                  At Your Price
                                </Badge>
                              </div>
                            </div>

                            {/* Price Information Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">MRP</p>
                                <p className="text-lg font-semibold line-through text-muted-foreground">
                                  ₹{item.mrp.toLocaleString('en-IN')}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Current Price</p>
                                <p className="text-lg font-bold text-primary">
                                  ₹{item.currentPrice.toLocaleString('en-IN')}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Percentage Drop</p>
                                <p className="text-lg font-bold text-green-600">
                                  {item.percentageDrop.toFixed(1)}% OFF
                                </p>
                              </div>
                              {item.targetPrice > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Your Target Price</p>
                                  <p className="text-lg font-semibold">
                                    ₹{item.targetPrice.toLocaleString('en-IN')}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-muted-foreground">Buy From</p>
                                <p className="text-lg font-semibold capitalize">
                                  {item.cheapestStore}
                                </p>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3">
                              <Button 
                                asChild
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <a 
                                  href={item.buyLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2"
                                >
                                  Buy Now on {item.cheapestStore === 'amazon' ? 'Amazon' : 'Flipkart'}
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline">View Price Trend</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                  <DialogHeader>
                                    <DialogTitle>Price History</DialogTitle>
                                  </DialogHeader>
                                  <PriceHistoryChart data={item.priceHistory} />
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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

export default AtYourPrice;
