import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2, TrendingDown, Bell, Eye, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import ShareButton from "@/components/ShareButton";

interface WishlistProduct {
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
    id: string;
    target_price: number;
    alert_enabled: boolean;
  };
}

const Wishlist = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadWishlist();
    }
  }, [user]);

  const loadWishlist = async () => {
    try {
      const { data: wishlistData, error: wishlistError } = await supabase
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
        .eq('user_id', user?.id);

      if (wishlistError) throw wishlistError;

      const itemsWithHistory = await Promise.all(
        (wishlistData || []).map(async (item: any) => {
          const { data: history } = await supabase
            .from('product_price_history')
            .select('created_at, amazon_price, flipkart_price')
            .eq('product_id', item.product_id)
            .order('created_at', { ascending: false })
            .limit(30);

          const { data: alert } = await supabase
            .from('price_alerts')
            .select('id, target_price, alert_enabled')
            .eq('user_id', user?.id)
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

      setWishlistItems(itemsWithHistory);
    } catch (error) {
      console.error('Error loading wishlist:', error);
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (wishlistId: string, productName: string) => {
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', wishlistId);

      if (error) throw error;

      toast.success(`${productName} removed from wishlist`);
      loadWishlist();
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error("Failed to remove from wishlist");
    }
  };

  const handleTrackPrice = (productId: string) => {
    navigate('/price-tracker');
  };

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
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">My Wishlist</h1>
            <p className="text-muted-foreground">
              Manage your saved products and track price changes
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : wishlistItems.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">Your wishlist is empty</p>
                  <Button onClick={() => navigate('/articles')}>
                    Browse Articles
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {wishlistItems.map((item) => {
                const latestPrice = item.priceHistory[0];
                const currentAmazonPrice = latestPrice?.amazon_price || 0;
                const currentFlipkartPrice = latestPrice?.flipkart_price || 0;
                const currentLowestPrice = Math.min(
                  currentAmazonPrice > 0 ? currentAmazonPrice : Infinity,
                  currentFlipkartPrice > 0 ? currentFlipkartPrice : Infinity
                );

                const allPrices = item.priceHistory.flatMap(h => 
                  [h.amazon_price, h.flipkart_price].filter(p => p && p > 0)
                );
                const lowestEverPrice = allPrices.length > 0 ? Math.min(...allPrices) : Infinity;
                const highestPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;

                const cheapestStore = currentAmazonPrice > 0 && currentFlipkartPrice > 0
                  ? (currentAmazonPrice < currentFlipkartPrice ? 'amazon' : 'flipkart')
                  : currentAmazonPrice > 0 ? 'amazon' : 'flipkart';

                const buyLink = cheapestStore === 'amazon' 
                  ? item.product.amazon_link 
                  : item.product.flipkart_link;

                return (
                  <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          <img
                            src={item.product.image || '/placeholder.svg'}
                            alt={item.product.name}
                            className="w-32 h-32 object-cover rounded-lg"
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-lg mb-2">{item.product.name}</h3>
                              {item.alert && item.alert.alert_enabled && (
                                <Badge variant="outline" className="text-xs">
                                  <Bell className="h-3 w-3 mr-1" />
                                  Alert set: ₹{item.alert.target_price.toLocaleString('en-IN')}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Price Info */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase">Current Price</p>
                              <p className="text-xl font-bold text-foreground">
                                ₹{currentLowestPrice !== Infinity ? currentLowestPrice.toLocaleString('en-IN') : 'N/A'}
                              </p>
                            </div>
                            {lowestEverPrice !== Infinity && (
                              <div>
                                <p className="text-xs text-muted-foreground uppercase">Lowest Ever</p>
                                <p className="text-xl font-bold text-primary">
                                  ₹{lowestEverPrice.toLocaleString('en-IN')}
                                </p>
                              </div>
                            )}
                            {highestPrice > 0 && currentLowestPrice !== Infinity && (
                              <div>
                                <p className="text-xs text-muted-foreground uppercase">You Save</p>
                                <p className="text-xl font-bold text-green-600">
                                  {Math.round(((highestPrice - currentLowestPrice) / highestPrice) * 100)}%
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            {buyLink && (
                              <Button asChild size="sm">
                                <a href={buyLink} target="_blank" rel="noopener noreferrer">
                                  Buy Now
                                  <ExternalLink className="h-3 w-3 ml-2" />
                                </a>
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTrackPrice(item.product.id)}
                            >
                              <TrendingDown className="h-4 w-4 mr-2" />
                              Track Price
                            </Button>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Trend
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>{item.product.name}</DialogTitle>
                                </DialogHeader>
                                <PriceHistoryChart data={item.priceHistory} />
                              </DialogContent>
                            </Dialog>

                            <ShareButton
                              productName={item.product.name}
                              currentPrice={currentLowestPrice !== Infinity ? currentLowestPrice : 0}
                              mrp={highestPrice}
                              variant="outline"
                              size="sm"
                            />

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(item.id, item.product.name)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Wishlist;