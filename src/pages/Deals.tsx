import { useEffect, useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Flame, ExternalLink, Search, ChevronLeft, ChevronRight, Award, Bell, ArrowUpDown, X, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type Category = {
  id: string;
  name: string;
  slug: string;
};

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("default");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [maxPriceInData, setMaxPriceInData] = useState(500000);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Price alert dialog state
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [settingAlert, setSettingAlert] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const { data: categoriesData } = await supabase
          .from("categories")
          .select("id, name, slug")
          .order("name");
        
        if (categoriesData) setCategories(categoriesData);

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
          
          // Calculate max price for slider
          const prices = productsWithPrices.flatMap(p => [p.amazon_price, p.flipkart_price].filter(Boolean) as number[]);
          if (prices.length > 0) {
            const maxPrice = Math.ceil(Math.max(...prices) / 10000) * 10000;
            setMaxPriceInData(maxPrice);
            setPriceRange([0, maxPrice]);
          }
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

    fetchData();
  }, [toast]);

  // Helper to get lowest price of a product
  const getLowestPrice = (product: Product): number | null => {
    const prices = [product.amazon_price, product.flipkart_price].filter(Boolean) as number[];
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  // Helper to get max discount of a product
  const getMaxDiscount = (product: Product): number => {
    return Math.max(product.amazon_discount || 0, product.flipkart_discount || 0);
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery.trim() !== "" || 
    selectedCategory !== "all" || 
    sortBy !== "default" || 
    priceRange[0] !== 0 || 
    priceRange[1] !== maxPriceInData;

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSortBy("default");
    setPriceRange([0, maxPriceInData]);
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = allProducts;
    
    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.category_id === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query)
      );
    }
    
    // Filter by price range
    filtered = filtered.filter(product => {
      const lowestPrice = getLowestPrice(product);
      if (!lowestPrice) return true; // Show products without price
      return lowestPrice >= priceRange[0] && lowestPrice <= priceRange[1];
    });
    
    // Sort products
    if (sortBy === "price-low") {
      filtered = [...filtered].sort((a, b) => {
        const priceA = getLowestPrice(a) ?? Infinity;
        const priceB = getLowestPrice(b) ?? Infinity;
        return priceA - priceB;
      });
    } else if (sortBy === "price-high") {
      filtered = [...filtered].sort((a, b) => {
        const priceA = getLowestPrice(a) ?? 0;
        const priceB = getLowestPrice(b) ?? 0;
        return priceB - priceA;
      });
    } else if (sortBy === "discount") {
      filtered = [...filtered].sort((a, b) => {
        return getMaxDiscount(b) - getMaxDiscount(a);
      });
    }
    
    return filtered;
  }, [allProducts, searchQuery, selectedCategory, sortBy, priceRange]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy, priceRange]);

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

  const handleSetPriceAlert = (product: Product) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to set price alerts",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    
    setSelectedProduct(product);
    const lowestPrice = product.amazon_price && product.flipkart_price 
      ? Math.min(product.amazon_price, product.flipkart_price)
      : product.amazon_price || product.flipkart_price;
    setTargetPrice(lowestPrice ? Math.floor(lowestPrice * 0.9).toString() : "");
    setAlertDialogOpen(true);
  };

  const submitPriceAlert = async () => {
    if (!selectedProduct || !targetPrice || !user) return;
    
    setSettingAlert(true);
    try {
      // First, add product to wishlist (for price tracker page)
      const { data: existingWishlistItem } = await supabase
        .from("wishlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", selectedProduct.id)
        .maybeSingle();

      if (!existingWishlistItem) {
        const { error: wishlistError } = await supabase
          .from("wishlist")
          .insert({
            user_id: user.id,
            product_id: selectedProduct.id,
          });
        
        if (wishlistError && wishlistError.code !== '23505') {
          throw wishlistError;
        }
      }

      // Then, create the price alert
      const { error } = await supabase
        .from("price_alerts")
        .insert({
          user_id: user.id,
          product_id: selectedProduct.id,
          target_price: parseFloat(targetPrice),
          alert_enabled: true,
        });

      if (error) throw error;

      toast({
        title: "Price Alert Set!",
        description: `Product added to Price Tracker. We'll notify you when it drops to ₹${parseInt(targetPrice).toLocaleString()}`,
      });
      setAlertDialogOpen(false);
    } catch (error: any) {
      if (error.code === '23505') {
        toast({
          title: "Alert Already Exists",
          description: "You already have an alert for this product. Check your Price Tracker.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to set price alert",
          variant: "destructive",
        });
      }
    } finally {
      setSettingAlert(false);
    }
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
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center gap-3">
              <Flame className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Today's Best Deals</h1>
                <p className="text-muted-foreground text-sm">
                  {filteredProducts.length} products found
                </p>
              </div>
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Category Filter */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort By Dropdown */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-48">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="discount">Highest Discount</SelectItem>
                  </SelectContent>
                </Select>

                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Price Range Slider */}
              <div className="bg-muted/30 p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Price Range</Label>
                  <span className="text-sm text-muted-foreground">
                    ₹{priceRange[0].toLocaleString()} - ₹{priceRange[1].toLocaleString()}
                  </span>
                </div>
                <Slider
                  value={priceRange}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  min={0}
                  max={maxPriceInData}
                  step={1000}
                  className="w-full"
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>₹0</span>
                  <span>₹{maxPriceInData.toLocaleString()}</span>
                </div>
              </div>

              {/* Clear All Filters Button */}
              {hasActiveFilters && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="w-fit"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              )}
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
                {searchQuery || selectedCategory !== "all" ? "No products match your filters" : "No deals available at the moment"}
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
                  const maxDiscount = getMaxDiscount(product);
                  const isHotDeal = maxDiscount >= 30;

                  return (
                    <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                      {/* Hot Deal Indicator */}
                      {isHotDeal && (
                        <div className="absolute top-0 left-0 z-10 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 text-xs font-bold flex items-center gap-1 rounded-br-lg shadow-md">
                          <Zap className="h-3 w-3" />
                          HOT DEAL
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="relative mb-4">
                          <img
                            src={product.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500"}
                            alt={product.name}
                            className="w-full h-48 object-contain rounded-lg bg-muted/30"
                          />
                          {/* Prominent Discount Badge */}
                          {maxDiscount > 0 && (
                            <Badge className={`absolute top-2 left-2 text-sm font-bold px-2 py-1 ${
                              isHotDeal 
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 animate-pulse' 
                                : 'bg-green-600 text-white'
                            }`}>
                              {maxDiscount}% OFF
                            </Badge>
                          )}
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
                          <div className="relative flex items-center justify-between p-2 bg-muted/50 rounded border border-border mb-3">
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
                          <p className="text-sm text-muted-foreground text-center py-2 mb-3">
                            Price not available
                          </p>
                        )}

                        {/* Price Alert Button */}
                        {(product.amazon_price || product.flipkart_price) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => handleSetPriceAlert(product)}
                          >
                            <Bell className="h-4 w-4 mr-2" />
                            Set Price Alert
                          </Button>
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

      {/* Price Alert Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Price Alert</DialogTitle>
            <DialogDescription>
              {selectedProduct && (
                <>
                  Get notified when <strong>{selectedProduct.name}</strong> drops to your target price.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Target Price (₹)</label>
            <Input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="Enter your target price"
              min="1"
            />
            {selectedProduct && (
              <p className="text-xs text-muted-foreground mt-2">
                Current lowest price: ₹{(
                  selectedProduct.amazon_price && selectedProduct.flipkart_price 
                    ? Math.min(selectedProduct.amazon_price, selectedProduct.flipkart_price)
                    : selectedProduct.amazon_price || selectedProduct.flipkart_price || 0
                ).toLocaleString()}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlertDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitPriceAlert} disabled={settingAlert || !targetPrice}>
              {settingAlert ? "Setting..." : "Set Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Deals;