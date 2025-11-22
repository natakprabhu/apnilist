import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingDown, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Product = {
  id: string;
  name: string;
  image: string | null;
  amazon_link: string | null;
  flipkart_link: string | null;
  rating: number | null;
  amazon_price?: number | null;
  flipkart_price?: number | null;
};

const MostTrackedSection = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, image, amazon_link, flipkart_link, rating")
        .limit(3);

      if (productsData) {
        // Fetch latest prices for each product
        const productsWithPrices = await Promise.all(
          productsData.map(async (product) => {
            const { data: priceData } = await supabase
              .from("product_price_history")
              .select("amazon_price, flipkart_price")
              .eq("product_id", product.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              ...product,
              amazon_price: priceData?.amazon_price,
              flipkart_price: priceData?.flipkart_price,
            };
          })
        );
        setProducts(productsWithPrices);
      }
    };

    fetchProducts();
  }, []);

  return (
    <section className="py-12 bg-muted/20">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-8">🔥 Most Tracked Products</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-hover transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-3">
                  <img
                    src={product.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200"}
                    alt={product.name}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-2">{product.name}</h3>
                    {product.rating && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>⭐</span>
                        <span>{product.rating}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {product.amazon_price && product.amazon_link && (
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div>
                          <p className="text-xs text-muted-foreground">Amazon</p>
                          <p className="font-bold text-sm">₹{product.amazon_price.toLocaleString()}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          asChild
                        >
                          <a href={product.amazon_link} target="_blank" rel="noopener noreferrer">
                            Buy
                          </a>
                        </Button>
                      </div>
                    )}

                    {product.flipkart_price && product.flipkart_link && (
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div>
                          <p className="text-xs text-muted-foreground">Flipkart</p>
                          <p className="font-bold text-sm">₹{product.flipkart_price.toLocaleString()}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          asChild
                        >
                          <a href={product.flipkart_link} target="_blank" rel="noopener noreferrer">
                            Buy
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MostTrackedSection;
