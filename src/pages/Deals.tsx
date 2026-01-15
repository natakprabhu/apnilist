import { useEffect, useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Flame, ExternalLink, Search, ChevronLeft, ChevronRight, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Product = {
  id: string;
  name: string;
  image: string | null;
  category_id: string | null;
  amazon_link: string | null;
  flipkart_link: string | null;
  rating: number | null;
  amazon_price?: number | null;
  flipkart_price?: number | null;
  amazon_discount?: number | null;
  flipkart_discount?: number | null;
};

const ITEMS_PER_PAGE = 12;

const Deals = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch all products with their details
        const { data: productsData, error } = await supabase
          .from("products")
          .select("id, name, image, category_id, amazon_link, flipkart_link, rating")
          .order("created_at", { ascending: false });

        if (error) throw error;

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
          setAllProducts(productsWithPrices);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [toast]);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return allProducts;
    const query = searchQuery.toLowerCase();
    return allProducts.filter(product => 
      product.name.toLowerCase().includes(query)
    );
  }, [allProducts, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title="Today's Best Deals"
        description="Discover today's best deals on electronics, home appliances, and more. Find the latest discounts and offers from top brands."
        canonical="/deals"
      />
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <Flame className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Today's Best Deals</h1>
                <p className="text-muted-foreground text-sm">
                  {filteredProducts.length} products found
                </p>
              </div>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Products Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading deals...</p>
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "No products match your search" : "No deals available at the moment"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedProducts.map((product) => {
                  const hasBothPrices = product.amazon_price && product.flipkart_price;
                  const amazonIsBest = hasBothPrices && product.amazon_price! < product.flipkart_price!;
                  const flipkartIsBest = hasBothPrices && product.flipkart_price! < product.amazon_price!;
                  const lowestPrice = product.amazon_price && product.flipkart_price 
                    ? Math.min(product.amazon_price, product.flipkart_price)
                    : product.amazon_price || product.flipkart_price;

                  return (
                    <Card key={product.id} className="group hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="relative mb-4">
                          <img
                            src={product.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500"}
                            alt={product.name}
                            className="w-full h-48 object-contain rounded-lg bg-muted/30"
                          />
                          {product.rating && (
                            <Badge className="absolute top-2 right-2 bg-yellow-500 text-white">
                              ⭐ {product.rating}
                            </Badge>
                          )}
                        </div>
                        
                        <h3 className="font-semibold text-sm mb-3 line-clamp-2 min-h-[40px]">{product.name}</h3>
                        
                        {/* Price Display */}
                        {lowestPrice && (
                          <p className="text-lg font-bold text-primary mb-3">
                            Starting ₹{lowestPrice.toLocaleString()}
                          </p>
                        )}

                        {/* Amazon Price */}
                        {product.amazon_price && product.amazon_link && (
                          <div className="relative flex items-center justify-between p-2 bg-muted/50 rounded border border-border mb-2">
                            {amazonIsBest && (
                              <Badge className="absolute -top-2 -right-2 bg-green-600 hover:bg-green-700 text-white text-xs flex items-center gap-1">
                                <Award size={10} />
                                Best
                              </Badge>
                            )}
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground">Amazon</p>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm">₹{product.amazon_price.toLocaleString()}</p>
                                {product.amazon_discount && product.amazon_discount > 0 && (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                                    {product.amazon_discount}% OFF
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs"
                              asChild
                            >
                              <a href={product.amazon_link} target="_blank" rel="noopener noreferrer">
                                Buy
                              </a>
                            </Button>
                          </div>
                        )}

                        {/* Flipkart Price */}
                        {product.flipkart_price && product.flipkart_link && (
                          <div className="relative flex items-center justify-between p-2 bg-muted/50 rounded border border-border">
                            {flipkartIsBest && (
                              <Badge className="absolute -top-2 -right-2 bg-green-600 hover:bg-green-700 text-white text-xs flex items-center gap-1">
                                <Award size={10} />
                                Best
                              </Badge>
                            )}
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground">Flipkart</p>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm">₹{product.flipkart_price.toLocaleString()}</p>
                                {product.flipkart_discount && product.flipkart_discount > 0 && (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                                    {product.flipkart_discount}% OFF
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs"
                              asChild
                            >
                              <a href={product.flipkart_link} target="_blank" rel="noopener noreferrer">
                                Buy
                              </a>
                            </Button>
                          </div>
                        )}

                        {/* No price available */}
                        {!product.amazon_price && !product.flipkart_price && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Price not available
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {getPageNumbers().map((page, index) => (
                    typeof page === 'number' ? (
                      <Button
                        key={index}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(page)}
                        className="min-w-[40px]"
                      >
                        {page}
                      </Button>
                    ) : (
                      <span key={index} className="px-2 text-muted-foreground">
                        {page}
                      </span>
                    )
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Deals;