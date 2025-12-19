import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CommentSection } from "@/components/CommentSection";
import { Calendar, User, Lightbulb, TrendingUp, ShoppingCart, Heart, ExternalLink, TrendingDown, Info, ThumbsUp, ThumbsDown, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryImage } from "@/lib/categoryImages";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import { Progress } from "@/components/ui/progress"; // Make sure to have this component or use standard HTML progress

// --- INTERFACES ---

interface Product {
  id: string;
  name: string;
  slug: string | null;
  short_description: string | null;
  image: string | null;
  pros: string[];
  cons: string[];
  amazon_link: string | null;
  flipkart_link: string | null;
  badge: string | null;
  category_id: string | null;
  tags: string[];
  rating?: number;
}

interface ArticleProduct {
  rank: number;
  product_id: string;
  products: Product;
}

interface PriceHistory {
  id: string;
  product_id: string;
  created_at: string | null;
  amazon_price: number | null;
  flipkart_price: number | null;
  amazon_discount: number | null;
  flipkart_discount: number | null;
  original_price: number | null;
}

interface DealAnalysis {
  score: number; // 0-100
  verdict: string; // e.g., "Deal Mirage", "Great Deal"
  reasons: { label: string; value: number | string; isGood: boolean }[];
  stats: {
    highest: number;
    lowest: number;
    average: number;
    current: number;
  };
}

interface DisplayProduct {
  rank: number;
  product: Product;
  latestPrice: PriceHistory | null;
  previousPrice: PriceHistory | null;
  priceHistory: PriceHistory[];
  analysis: DealAnalysis | null;
}

interface SmartPick {
  id: string;
  recommendation: string;
}

interface RelatedArticle {
  id: string;
  title: string;
  url: string;
  slug?: string;
  featured_image?: string | null;
  excerpt?: string | null;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image: string | null;
  author: string | null;
  category: string | null;
  category_id: string | null;
  date: string;
  created_at: string;
  tags: string[] | null;
  smart_pick_recommendations: SmartPick[] | null;
  related_articles: RelatedArticle[] | null;
}

interface TopSaleItem {
  model_name: string;
  sales_count: number;
}

// --- HELPER FUNCTIONS ---

const getBestPrice = (amazonPrice: number | null, flipkartPrice: number | null): number => {
  if (!amazonPrice && !flipkartPrice) return 0;
  if (!amazonPrice) return flipkartPrice || 0;
  if (!flipkartPrice) return amazonPrice || 0;
  return Math.min(amazonPrice, flipkartPrice);
};

const calculateDealAnalysis = (history: PriceHistory[], currentPrice: number): DealAnalysis | null => {
  if (!history || history.length === 0 || currentPrice <= 0) return null;

  // Flatten all prices from history to get stats
  const allPrices = history
    .flatMap(h => [h.amazon_price, h.flipkart_price])
    .filter((p): p is number => p !== null && p > 0);

  if (allPrices.length === 0) return null;

  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const avgPrice = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length);
  
  // Basic Logic for Deal Score (Mock logic based on request)
  // In a real scenario, this would be more complex
  let score = 50; 
  const reasons: { label: string; value: number | string; isGood: boolean }[] = [];

  // Compare with Last Sale (Mocking "Last Sale" as the previous price entry for simplicity)
  // Ideally, "Last Sale" refers to a specific sales event price.
  const previousEntry = history[1]; // 0 is current, 1 is previous
  const lastSalePrice = previousEntry ? Math.min(previousEntry.amazon_price || Infinity, previousEntry.flipkart_price || Infinity) : avgPrice;
  const validLastSalePrice = lastSalePrice === Infinity ? avgPrice : lastSalePrice;

  if (currentPrice > validLastSalePrice) {
    score -= 20;
    reasons.push({ label: "Higher than Last Sale", value: `₹${validLastSalePrice.toLocaleString()}`, isGood: false });
  } else if (currentPrice < validLastSalePrice) {
    score += 20;
    reasons.push({ label: "Lower than Last Sale", value: `₹${validLastSalePrice.toLocaleString()}`, isGood: true });
  } else {
    reasons.push({ label: "Equal to Last Sale", value: `₹${validLastSalePrice.toLocaleString()}`, isGood: false }); // Neutral
  }

  // Compare with All Time Low
  if (currentPrice > minPrice) {
    score -= 10;
    reasons.push({ label: "Above All Time Low", value: `₹${minPrice.toLocaleString()}`, isGood: false });
  } else if (currentPrice <= minPrice) {
    score += 30;
    reasons.push({ label: "All Time Low Price!", value: `₹${minPrice.toLocaleString()}`, isGood: true });
  }

  // Compare with Average
  if (currentPrice > avgPrice) {
    score -= 10;
    reasons.push({ label: "Above Average Price", value: `₹${avgPrice.toLocaleString()}`, isGood: false });
  } else {
    score += 10;
    reasons.push({ label: "Below Average Price", value: `₹${avgPrice.toLocaleString()}`, isGood: true });
  }

  // Clamp Score
  score = Math.max(0, Math.min(100, score));

  let verdict = "Average Deal";
  if (score < 30) verdict = "Deal Mirage 🌵";
  else if (score > 70) verdict = "Great Deal 🔥";
  else if (score > 50) verdict = "Good Deal 👍";

  return {
    score,
    verdict,
    reasons,
    stats: {
      highest: maxPrice,
      lowest: minPrice,
      average: avgPrice,
      current: currentPrice
    }
  };
};

const ArticleDetail = () => {
  const { slug } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [displayProducts, setDisplayProducts] = useState<DisplayProduct[]>([]);
  const [smartPick, setSmartPick] = useState<SmartPick | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [salesData, setSalesData] = useState<TopSaleItem[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const [trivia, setTrivia] = useState<{ title?: string; content: string } | null>(null);
  const [triviaLoading, setTriviaLoading] = useState(false);
  
  const [trackedProducts, setTrackedProducts] = useState<Set<string>>(new Set());

  // Fetch tracked products for current user
  useEffect(() => {
    const fetchTrackedProducts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("wishlist")
        .select("product_id")
        .eq("user_id", user.id);

      if (!error && data) {
        setTrackedProducts(new Set(data.map(item => item.product_id)));
      }
    };

    fetchTrackedProducts();
  }, []);

  // Fetch all article data
  useEffect(() => {
    const fetchArticleDetails = async () => {
      if (!slug) return;
      
      setLoading(true);
      setError(null);
      setNotFound(false);
      setCategoryId(null);

      try {
        // --- QUERY 1: Fetch the Article ---
        const { data: articleData, error: articleError } = await supabase
          .from("articles")
          .select(`
            *,
            categories (id, name, slug), 
            smart_pick_recommendations (*),
            related_articles (*)
          `)
          .eq("slug", slug)
          .single();

        if (articleError && articleError.code === 'PGRST116') {
           setNotFound(true);
           throw new Error("Article not found");
        }
        if (articleError) throw articleError;
        if (!articleData) {
            setNotFound(true);
            throw new Error("Article not found");
        }
        
        const fetchedArticle: Article = {
            ...articleData,
            category: articleData.categories?.name || null,
            date: articleData.date || articleData.created_at,
            smart_pick_recommendations: null,
            related_articles: null
        };

        setArticle(fetchedArticle);
        setCategoryId(articleData.category_id || null);
        
        const smartPickData = articleData.smart_pick_recommendations;
        if (smartPickData && Array.isArray(smartPickData) && smartPickData.length > 0) {
          setSmartPick(smartPickData[0] as SmartPick);
        }
        
        const relatedData = articleData.related_articles;
        if (relatedData && Array.isArray(relatedData)) {
          setRelatedArticles(relatedData as RelatedArticle[]);
        }
        if (articleData.category_id) {
          fetchTriviaForCategory(articleData.category_id);
        }
        if (articleData.category_id && articleData.id) {
          fetchRelatedArticlesByCategory(articleData.category_id, articleData.id);
        }

        // --- QUERY 2: Fetch the Article's Products ---
        const { data: productsData, error: productsError } = await supabase
          .from("article_products")
          .select(`
            rank,
            product_id,
            products ( * ) 
          `)
          .eq("article_id", articleData.id)
          .order("rank", { ascending: true });
        
        if (productsError) throw productsError;
        
        const articleProducts = (productsData || []).map(item => {
          const products = item.products as any;
          return {
            rank: item.rank,
            product_id: item.product_id,
            products: {
              ...products,
              pros: Array.isArray(products.pros) ? products.pros : [],
              cons: Array.isArray(products.cons) ? products.cons : [],
              tags: Array.isArray(products.tags) ? products.tags : []
            }
          };
        }) as ArticleProduct[];
        const productIds = articleProducts.map(p => p.product_id);

        if (productIds.length === 0) {
            setDisplayProducts([]);
            return;
        }

        // --- QUERY 3: Fetch Price History ---
        const { data: pricesData, error: pricesError } = await supabase
          .from("product_price_history")
          .select("*")
          .in("product_id", productIds)
          .order("created_at", { ascending: false });
        
        if (pricesError) throw pricesError;

        // --- COMBINE DATA ---
        const priceHistoryMap = new Map<string, PriceHistory[]>();
        for (const price of pricesData || []) {
            if (!priceHistoryMap.has(price.product_id)) {
                priceHistoryMap.set(price.product_id, []);
            }
            priceHistoryMap.get(price.product_id)!.push(price as PriceHistory);
        }

        const finalDisplayProducts: DisplayProduct[] = articleProducts.map(ap => {
            const history = priceHistoryMap.get(ap.product_id) || [];
            
            // --- UPDATED LOGIC: Find latest valid price for each vendor independently ---
            const latestAmazonEntry = history.find(h => h.amazon_price !== null && h.amazon_price > 0);
            const latestFlipkartEntry = history.find(h => h.flipkart_price !== null && h.flipkart_price > 0);

            // Create a composite 'latestPrice' object
            let compositeLatestPrice: PriceHistory | null = null;
            if (history.length > 0) {
                compositeLatestPrice = {
                    ...history[0], // Use the newest record for ID/Timestamp
                    amazon_price: latestAmazonEntry?.amazon_price ?? null,
                    amazon_discount: latestAmazonEntry?.amazon_discount ?? null,
                    flipkart_price: latestFlipkartEntry?.flipkart_price ?? null,
                    flipkart_discount: latestFlipkartEntry?.flipkart_discount ?? null,
                    original_price:
                       history.find(h => h.original_price && h.original_price > 0)?.original_price ?? null, // ✅ NEW
                };
            }

            const currentPrice = getBestPrice(compositeLatestPrice?.amazon_price || null, compositeLatestPrice?.flipkart_price || null);
            const analysis = calculateDealAnalysis(history, currentPrice);

            return {
                rank: ap.rank,
                product: ap.products,
                latestPrice: compositeLatestPrice, 
                previousPrice: history[1] || null,
                priceHistory: history.slice(0, 30),
                analysis
            };
        });

        setDisplayProducts(finalDisplayProducts);

      } catch (err: any) {
        console.log("Error fetching article:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArticleDetails();
  }, [slug]);

  const fetchRelatedArticlesByCategory = async (categoryId: string, currentArticleId: string) => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, featured_image, excerpt")
        .eq("category_id", categoryId)
        .eq("status", "published")
        .neq("id", currentArticleId)
        .limit(3);

      if (error) throw error;

      const formattedArticles: RelatedArticle[] = (data || []).map(article => ({
        id: article.id,
        title: article.title,
        url: `/articles/${article.slug}`,
        slug: article.slug,
        featured_image: article.featured_image,
        excerpt: article.excerpt
      }));
      setRelatedArticles(formattedArticles);
    } catch (err: any) {
      console.error("Error fetching related articles:", err.message);
      setRelatedArticles([]);
    }
  };

  const fetchTriviaForCategory = async (categoryId: string) => {
    try {
      setTriviaLoading(true);
      setTrivia(null);

      const { data, error } = await supabase
        .from("trivia")
        .select("id, title, content")
        .eq("category_id", categoryId);

      if (error) throw error;

      if (data && data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.length);
        const randomTrivia = data[randomIndex];
        setTrivia(randomTrivia);
      } else {
        setTrivia(null);
      }
    } catch (err: any) {
      console.error("Error fetching trivia:", err.message);
      setTrivia(null);
    } finally {
      setTriviaLoading(false);
    }
  };

  useEffect(() => {
    const fetchTopSales = async () => {
      if (!categoryId) {
        setSalesLoading(false);
        setSalesData([]);
        return;
      }

      setSalesLoading(true);
      setSalesError(null);
      try {
        const { data, error } = await supabase
          .from('top_sales')
          .select('model_name, sales_count')
          .eq('category_id', categoryId)
          .order('sales_count', { ascending: false })
          .limit(5);

        if (error) throw error;
        setSalesData((data || []).reverse());
      } catch (err: any) {
        console.error("Error fetching top sales:", err.message);
        setSalesError("Could not load sales data.");
        setSalesData([]);
      } finally {
        setSalesLoading(false);
      }
    };

    fetchTopSales();
  }, [categoryId]);

  if (loading) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <main className="flex-1 py-12">
                <div className="container mx-auto px-4 grid grid-cols-12 gap-8">
                    <div className="col-span-12 md:col-span-8 space-y-8">
                        <Skeleton className="h-48 w-full rounded-lg" />
                        <Skeleton className="h-16 w-full" />
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                        <Separator />
                        <Skeleton className="h-96 w-full rounded-lg" />
                        <Skeleton className="h-96 w-full rounded-lg" />
                    </div>
                    <aside className="col-span-12 md:col-span-4 space-y-6">
                        <Skeleton className="h-64 w-full rounded-lg" />
                        <Skeleton className="h-48 w-full rounded-lg" />
                    </aside>
                </div>
            </main>
            <Footer />
        </div>
    );
  }
  
  if (notFound) return <p className="text-center py-12">Article not found</p>;
  if (error) return <p className="text-center py-12 text-destructive">{error}</p>;
  if (!article) return <p className="text-center py-12">An unexpected error occurred.</p>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO 
        title={article.title}
        description={article.excerpt || article.title}
        canonical={`/articles/${article.slug}`}
        image={article.featured_image || undefined}
        type="article"
        article={{
          publishedTime: article.created_at,
          modifiedTime: article.created_at,
          author: article.author || undefined,
          tags: article.tags || undefined,
        }}
      />
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-8 space-y-8">
            <header className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 rounded-lg shadow-md">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{article.title}</h1>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>By {article.author || "Our Team"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(article.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <p className="mt-4 text-white/90">
                {article.excerpt}
              </p>
              <div
                className="flex flex-wrap gap-2 h-[3.5rem] overflow-y-auto border-0"
                style={{ border: 'none', boxShadow: 'none' }}
              >
                {article.tags && article.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            </header>

            {article.category_id && (
              <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Lightbulb className="h-5 w-5 text-primary" /> 
                    {trivia?.title ? trivia.title : `Did You Know? (${article.category || "Trivia"})`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {triviaLoading && <p className="text-muted-foreground italic">Loading trivia...</p>}
                  {!triviaLoading && trivia && (
                    <div
                      className="prose prose-neutral dark:prose-invert max-w-none text-sm md:text-base leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: trivia.content }}
                    />
                  )}
                  {!triviaLoading && !trivia && (
                    <p className="text-sm text-muted-foreground italic">
                      No trivia available for this category yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <h2 className="text-3xl font-bold">Overall Summary</h2>
            <div
              className="prose prose-orange max-w-none"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            <Separator className="my-8" />

            <section className="space-y-8">
              <h2 className="text-3xl font-bold">Detailed Reviews</h2>
              
              <div className="grid grid-cols-1 gap-8">
                {displayProducts.map((item) => {
                  const { product, latestPrice, priceHistory, rank, analysis } = item;
                  const amazonPrice = latestPrice?.amazon_price || 0;
                  const flipkartPrice = latestPrice?.flipkart_price || 0;
                  const displayOriginalPrice =
                  latestPrice?.original_price && latestPrice.original_price > 0
                    ? latestPrice.original_price
                    : flipkartPrice > 0
                      ? flipkartPrice
                      : amazonPrice > 0
                        ? amazonPrice
                        : 0;

                  const bestPrice = getBestPrice(amazonPrice, flipkartPrice);
                  const discount = amazonPrice > 0 && flipkartPrice > 0 
                    ? Math.max(latestPrice?.amazon_discount || 0, latestPrice?.flipkart_discount || 0)
                    : (latestPrice?.amazon_discount || latestPrice?.flipkart_discount || 0);
                  
                  return (
                    <Card key={product.id} className="overflow-hidden relative border-t-4 border-t-primary shadow-lg hover:shadow-xl transition-shadow duration-300">
                      
                      {/* Track Price Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className={`absolute top-4 right-4 z-10 gap-2 ${
                          trackedProducts.has(product.id) 
                            ? "bg-red-50 border-red-500 text-red-600 hover:bg-red-100" 
                            : "bg-background/80 backdrop-blur-sm"
                        }`}
                        onClick={async () => {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) {
                            toast({
                              title: "Authentication Required",
                              description: "Please log in to track prices",
                              variant: "destructive",
                            });
                            return;
                          }
                          const isTracked = trackedProducts.has(product.id);
                          if (isTracked) {
                            const { error } = await supabase
                              .from("wishlist")
                              .delete()
                              .eq("user_id", user.id)
                              .eq("product_id", product.id);
                            if (!error) {
                              setTrackedProducts(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(product.id);
                                return newSet;
                              });
                              toast({ title: "Removed", description: "Product removed from tracking" });
                            }
                          } else {
                            const { error } = await supabase
                              .from("wishlist")
                              .insert({ user_id: user.id, product_id: product.id });
                            if (!error) {
                              setTrackedProducts(prev => new Set([...prev, product.id]));
                              toast({ title: "Success", description: "Product added to tracking" });
                            }
                          }
                        }}
                      >
                        <Heart className={`h-4 w-4 ${trackedProducts.has(product.id) ? "fill-red-600" : ""}`} /> 
                        <span className="hidden sm:inline">Track</span>
                      </Button>

                      <div className="p-6 flex flex-col md:flex-row gap-6">
                        {/* Image & Deal Score Column */}
                        <div className="md:w-1/3 lg:w-1/4 flex flex-col gap-4">
                          <div className="rounded-lg overflow-hidden bg-white aspect-square relative border">
                            <img 
                              src={product.image || "/placeholder.svg"} 
                              alt={product.name} 
                              className="absolute inset-0 w-full h-full object-contain p-4"
                            />
                            <div className="absolute top-2 left-2 bg-black text-white text-xs font-bold py-1 px-2 rounded shadow-md">
                              #{rank}
                            </div>
                          </div>
                          
                          {/* Deal Analysis Card */}
                          {analysis && (
                            <div className="bg-white rounded-xl border shadow-sm p-4 text-sm space-y-3">
                              <div className="text-center">
                                <h5 className="font-bold text-lg mb-1">{analysis.verdict}</h5>
                                <div className="flex items-center gap-2 justify-center">
                                  <span className="text-xs font-bold text-muted-foreground">Deal Score</span>
                                  <span className={`text-2xl font-black ${
                                    analysis.score < 30 ? "text-red-500" : analysis.score > 70 ? "text-green-500" : "text-yellow-500"
                                  }`}>
                                    {analysis.score}
                                  </span>
                                </div>
                                <Progress value={analysis.score} className="h-2 mt-2" />
                              </div>
                              
                              <Separator />
                              
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score Breakup</p>
                                {analysis.reasons.map((reason, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">{reason.label}</span>
                                    <span className={reason.isGood ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                      {reason.value}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <Separator />

                              <div className="space-y-2 pt-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Highest Price</span>
                                  <span className="font-medium">₹{analysis.stats.highest.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Average Price</span>
                                  <span className="font-medium">₹{analysis.stats.average.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Lowest Price</span>
                                  <span className="font-medium text-green-600">₹{analysis.stats.lowest.toLocaleString()}</span>
                                </div>
                              </div>
                              
                              <p className="text-[10px] text-muted-foreground text-center pt-2 border-t mt-2">
                                *We analyse past prices to tell you if it’s truly a smart deal.
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Details Column */}
                        <div className="md:w-2/3 lg:w-3/4 flex flex-col">
                          
                          {/* Title Header */}
                          <div className="mb-4">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {product.badge && (
                                <Badge variant="default" className="bg-primary text-primary-foreground">
                                  {product.badge}
                                </Badge>
                              )}
                              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200">
                                <span className="text-yellow-600 text-sm">★</span>
                                <span className="font-bold text-sm text-yellow-700">{(product.rating || 0).toFixed(1)}</span>
                              </div>
                            </div>
                            <h3 className="text-2xl font-bold leading-tight">{product.name}</h3>
                            
                            {product.tags && product.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {product.tags.map((tag, tagIndex) => (
                                  <Badge key={tagIndex} variant="outline" className="text-xs text-muted-foreground">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Short Description */}
                          {product.short_description && (
                            <p className="text-muted-foreground text-sm mb-6 leading-relaxed border-l-2 pl-4 border-primary/30">
                              {product.short_description}
                            </p>
                          )}
                          
                          {/* Pros & Cons as "Features" */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="bg-green-50/50 p-4 rounded-lg border border-green-100">
                              <h4 className="font-semibold mb-3 text-green-800 flex items-center gap-2">
                                <ThumbsUp className="h-4 w-4" /> Key Features
                              </h4>
                              <ul className="space-y-2">
                                {product.pros.slice(0, 4).map((pro, i) => (
                                  <li key={i} className="text-sm text-green-900 flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 opacity-70" />
                                    <span>{pro}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="bg-red-50/50 p-4 rounded-lg border border-red-100">
                              <h4 className="font-semibold mb-3 text-red-800 flex items-center gap-2">
                                <ThumbsDown className="h-4 w-4" /> Drawbacks
                              </h4>
                              <ul className="space-y-2">
                                {product.cons.slice(0, 4).map((con, i) => (
                                  <li key={i} className="text-sm text-red-900 flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 opacity-70" />
                                    <span>{con}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          {originalPrice > bestPrice && (
                            <p className="text-sm text-muted-foreground mb-1">
                              MRP:&nbsp;
                              <span className="line-through font-medium">
                                ₹{originalPrice.toLocaleString()}
                              </span>
                            </p>
                          )}

                          {/* Pricing & Actions Section - Enhanced */}
                          <div className="mt-auto bg-card rounded-xl border shadow-sm p-4 md:p-5">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                              <div>
                                {displayOriginalPrice > bestPrice && (
                                      <p className="text-sm text-muted-foreground mb-2">
                                        MRP:&nbsp;
                                        <span className="line-through font-semibold">
                                          ₹{displayOriginalPrice.toLocaleString()}
                                        </span>
                                      </p>
                                    )}

                                <p className="text-sm font-medium text-muted-foreground mb-1">Best Market Price</p>
                                <div className="flex items-baseline gap-3">
                                  <span className="text-4xl font-bold text-foreground">
                                    ₹{bestPrice.toLocaleString()}
                                  </span>
                                  {discount > 0 && (
                                    <Badge variant="destructive" className="text-sm px-2 py-0.5">
                                      {discount}% OFF
                                    </Badge>
                                  )}
                                </div>
                                {/*<div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                  {amazonPrice > 0 && <span>Amazon: ₹{amazonPrice.toLocaleString()}</span>}
                                  {flipkartPrice > 0 && <span>Flipkart: ₹{flipkartPrice.toLocaleString()}</span>}
                                </div>*/}
                              </div>

                              {priceHistory.length > 0 && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary/80">
                                      <TrendingUp className="h-4 w-4" />
                                      View Price History
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl">
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5" />
                                        Price History - {product.name}
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="mt-4">
                                      <PriceHistoryChart data={priceHistory} />
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {product.amazon_link && amazonPrice > 0 ? (
                                <a 
                                  href={product.amazon_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="group relative flex items-center justify-center gap-3 bg-[#FF9900] hover:bg-[#FF9900]/90 text-white px-6 py-4 rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                                >
                                  <ShoppingCart className="h-5 w-5" /> 
                                  <div className="flex flex-col items-start leading-none">
                                    <span className="text-xs font-medium opacity-90">Buy on Amazon</span>
                                    <span className="text-lg font-bold">₹{amazonPrice.toLocaleString()}</span>
                                  </div>
                                  <ExternalLink className="h-4 w-4 absolute right-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                </a>
                              ) : (
                                <Button disabled className="bg-muted text-muted-foreground py-6">
                                  Amazon Unavailable
                                </Button>
                              )}
                              
                              {product.flipkart_link && flipkartPrice > 0 ? (
                                <a 
                                  href={product.flipkart_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="group relative flex items-center justify-center gap-3 bg-[#2874F0] hover:bg-[#2874F0]/90 text-white px-6 py-4 rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                                >
                                  <ShoppingCart className="h-5 w-5" /> 
                                  <div className="flex flex-col items-start leading-none">
                                    <span className="text-xs font-medium opacity-90">Buy on Flipkart</span>
                                    <span className="text-lg font-bold">₹{flipkartPrice.toLocaleString()}</span>
                                  </div>
                                  <ExternalLink className="h-4 w-4 absolute right-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                </a>
                              ) : (
                                <Button disabled className="bg-muted text-muted-foreground py-6">
                                  Flipkart Unavailable
                                </Button>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>

            <Separator className="my-8" />
            <CommentSection articleId={article.id} />
          </div>

          <aside className="col-span-12 md:col-span-4 space-y-6">
            <Card className="bg-white p-4 rounded-lg shadow-md">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                   <TrendingUp className="h-5 w-5 text-primary" />
                   Top Selling Models
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {salesLoading && (
                  <div className="space-y-2 h-[220px]">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-5/6" />
                    <Skeleton className="h-8 w-4/6" />
                    <Skeleton className="h-8 w-3/6" />
                    <Skeleton className="h-8 w-2/6" />
                  </div>
                )}
                {salesError && <p className="text-destructive text-center h-[220px] flex items-center justify-center">{salesError}</p>}
                {!salesLoading && !salesError && salesData.length === 0 && (
                  <p className="text-muted-foreground text-center h-[220px] flex items-center justify-center">
                    No sales data available.
                  </p>
                )}
                {!salesLoading && !salesError && salesData.length > 0 && (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={salesData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="model_name"
                        type="category"
                        width={140}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        interval={0}
                      />
                      <Tooltip
                         formatter={(value: number) => [`${value}`, "Sales"]}
                         cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                         contentStyle={{
                           backgroundColor: 'hsl(var(--background))',
                           borderColor: 'hsl(var(--border))',
                           borderRadius: 'var(--radius)',
                           fontSize: '12px'
                         }}
                      />
                      <Bar dataKey="sales_count" fill="hsl(var(--primary))" radius={4} barSize={20}>
                        <LabelList
                          dataKey="sales_count"
                          position="right"
                          offset={8}
                          fill="hsl(var(--foreground))"
                          fontSize={12}
                          fontWeight="500"
                          formatter={(value: number) => `${value}`}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="bg-white p-4 rounded-lg shadow-md space-y-3">
              <h2 className="text-lg font-bold">Related Articles</h2>
              {relatedArticles && relatedArticles.length > 0 ? (
                <ul className="space-y-3">
                  {relatedArticles.map((related) => (
                    <li key={related.id}>
                      <Link to={`/articles/${related.slug}`} className="flex items-center gap-3 hover:bg-muted p-2 rounded-md transition">
                        <img
                          src={related.featured_image || getCategoryImage(article?.category)}
                          alt={related.title}
                          className="w-16 h-16 rounded-md object-cover"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-foreground line-clamp-2">
                            {related.title}
                          </span>
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {related.excerpt || ""}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No related articles found.</p>
              )}
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ArticleDetail;
