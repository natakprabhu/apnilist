import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

type Product = {
  id: string;
  name: string;
  image: string | null;
  amazon_link: string | null;
  flipkart_link: string | null;
  rating: number | null;
  amazon_price?: number | null;
  flipkart_price?: number | null;
  amazon_discount?: number | null;
  flipkart_discount?: number | null;
};

const MostTrackedSection = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, image, amazon_link, flipkart_link, rating")
        .limit(6);

      if (productsData) {
        // Fetch latest prices for each product
        const productsWithPrices = await Promise.all(
          productsData.map(async (product) => {
            const { data: priceData } = await supabase
              .from("product_price_history")
              .select("amazon_price, flipkart_price, amazon_discount, flipkart_discount")
              .eq("product_id", product.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              ...product,
              amazon_price: priceData?.amazon_price,
              flipkart_price: priceData?.flipkart_price,
              amazon_discount: priceData?.amazon_discount,
              flipkart_discount: priceData?.flipkart_discount,
            };
          })
        );
        setProducts(productsWithPrices);
      }
    };

    fetchProducts();
  }, []);

  return (
    <section className="py-10 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">🔥 Most Tracked Products</h2>
          <Link to="/deals">
            <Button variant="ghost" size="sm" className="text-primary">
              View All <ExternalLink className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {products.map((product) => {
            // Determine best price
            const lowestPrice = product.amazon_price && product.flipkart_price 
              ? Math.min(product.amazon_price, product.flipkart_price)
              : product.amazon_price || product.flipkart_price;
            
            const maxDiscount = Math.max(
              product.amazon_discount || 0,
              product.flipkart_discount || 0
            );

            return (
              <div 
                key={product.id} 
                className="group bg-background rounded-lg p-3 hover:shadow-md transition-all duration-300 border border-transparent hover:border-primary/20"
              >
                {/* Image */}
                <div className="relative w-full aspect-square mb-3 bg-muted/30 rounded-md overflow-hidden">
                  <img
                    src={product.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200"}
                    alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  {maxDiscount > 0 && (
                    <Badge className="absolute top-1 left-1 bg-red-500 text-white text-xs px-1.5 py-0.5">
                      {maxDiscount}% OFF
                    </Badge>
                  )}
                </div>

                {/* Product Info */}
                <h3 className="font-medium text-sm line-clamp-2 mb-1 min-h-[40px] leading-tight">
                  {product.name}
                </h3>

                {/* Rating */}
                {product.rating && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <span>⭐</span>
                    <span>{product.rating}</span>
                  </div>
                )}

                {/* Price */}
                {lowestPrice ? (
                  <p className="font-bold text-primary text-sm">
                    ₹{lowestPrice.toLocaleString()}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Price N/A</p>
                )}

                {/* Buy Buttons - Compact */}
                <div className="flex gap-1 mt-2">
                  {product.amazon_link && (
                    <a 
                      href={product.amazon_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 text-center text-xs py-1.5 px-2 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors dark:bg-orange-900/30 dark:text-orange-300"
                    >
                      Amazon
                    </a>
                  )}
                  {product.flipkart_link && (
                    <a 
                      href={product.flipkart_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 text-center text-xs py-1.5 px-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      Flipkart
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MostTrackedSection;