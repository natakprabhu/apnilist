import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Award, Bell, ChevronLeft, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { TrackButton } from "@/components/TrackButton";
import PriceHistoryChart from "@/components/PriceHistoryChart";

type Product = {
  id: string;
  name: string;
  slug: string | null;
  image: string | null;
  amazon_link: string | null;
  flipkart_link: string | null;
  rating: number | null;
  pros: any;
  cons: any;
  short_description: string | null;
  badge: string | null;
};

type PriceRow = {
  created_at: string;
  amazon_price: number | null;
  flipkart_price: number | null;
  amazon_discount: number | null;
  flipkart_discount: number | null;
};

type ProductDetails = {
  specs: Record<string, string>;
  highlights: string[];
  description: string | null;
  whats_in_box: string[];
  gallery: string[];
  offers_amazon: string[];
  offers_flipkart: string[];
  avg_rating: number | null;
  total_ratings: number | null;
  total_reviews: number | null;
  review_summary: string | null;
};

const toArray = (v: any): string[] => Array.isArray(v) ? v : (typeof v === "string" ? [v] : []);

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [history, setHistory] = useState<PriceRow[]>([]);
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTracked, setIsTracked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const [alertOpen, setAlertOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState("");
  const [settingAlert, setSettingAlert] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      setLoading(true);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const query = supabase
        .from("products")
        .select("id, name, slug, image, amazon_link, flipkart_link, rating, pros, cons, short_description, badge");
      const { data: p, error } = await (isUuid ? query.eq("id", slug) : query.eq("slug", slug)).maybeSingle();

      if (error || !p) {
        setLoading(false);
        return;
      }
      setProduct(p as Product);
      setActiveImage(p.image);

      const [{ data: hist }, { data: pd }] = await Promise.all([
        supabase
          .from("product_price_history")
          .select("created_at, amazon_price, flipkart_price, amazon_discount, flipkart_discount")
          .eq("product_id", p.id)
          .order("created_at", { ascending: true })
          .limit(90),
        (supabase as any)
          .from("product_details")
          .select("*")
          .eq("product_id", p.id)
          .maybeSingle(),
      ]);
      setHistory((hist as PriceRow[]) || []);
      if (pd) {
        setDetails(pd as ProductDetails);
        const gal = (pd as any).gallery as string[] | undefined;
        if (gal && gal.length > 0) setActiveImage(gal[0]);
      }

      if (user) {
        const { data: w } = await supabase
          .from("wishlist")
          .select("id")
          .eq("user_id", user.id)
          .eq("product_id", p.id)
          .maybeSingle();
        setIsTracked(!!w);

        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!roleRow);
      }
      setLoading(false);
    };
    load();
  }, [slug, user]);

  const latest = history[history.length - 1];
  const amazonPrice = latest?.amazon_price ?? null;
  const flipkartPrice = latest?.flipkart_price ?? null;
  const amazonDiscount = latest?.amazon_discount ?? null;
  const flipkartDiscount = latest?.flipkart_discount ?? null;
  const lowestPrice = [amazonPrice, flipkartPrice].filter((v): v is number => !!v).sort((a, b) => a - b)[0] ?? null;
  const allTimeLow = history.reduce<number | null>((min, r) => {
    const p = [r.amazon_price, r.flipkart_price].filter((v): v is number => !!v).sort((a, b) => a - b)[0];
    if (!p) return min;
    return min === null || p < min ? p : min;
  }, null);

  const amazonIsBest = amazonPrice && flipkartPrice && amazonPrice < flipkartPrice;
  const flipkartIsBest = amazonPrice && flipkartPrice && flipkartPrice < amazonPrice;

  const handleSetAlert = () => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to set price alerts", variant: "destructive" });
      navigate("/auth");
      return;
    }
    setTargetPrice(lowestPrice ? Math.floor(lowestPrice * 0.9).toString() : "");
    setAlertOpen(true);
  };

  const submitAlert = async () => {
    if (!product || !user || !targetPrice) return;
    setSettingAlert(true);
    try {
      const { data: existing } = await supabase
        .from("wishlist").select("id")
        .eq("user_id", user.id).eq("product_id", product.id).maybeSingle();
      if (!existing) {
        await supabase.from("wishlist").insert({ user_id: user.id, product_id: product.id });
      }
      const { error } = await supabase.from("price_alerts").insert({
        user_id: user.id,
        product_id: product.id,
        target_price: parseFloat(targetPrice),
        alert_enabled: true,
      });
      if (error && error.code !== "23505") throw error;
      setIsTracked(true);
      toast({ title: "Price Alert Set!", description: `We'll notify you when it drops to ₹${parseInt(targetPrice).toLocaleString()}` });
      setAlertOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to set alert", variant: "destructive" });
    } finally {
      setSettingAlert(false);
    }
  };

  const handleEnrich = async () => {
    if (!product) return;
    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-product-details", {
        body: { product_id: product.id },
      });
      if (error) throw error;
      toast({ title: "Enriched", description: "Product details generated." });
      const { data: pd } = await (supabase as any)
        .from("product_details").select("*").eq("product_id", product.id).maybeSingle();
      if (pd) setDetails(pd as ProductDetails);
    } catch (e: any) {
      toast({ title: "Enrich failed", description: e.message || "Try again", variant: "destructive" });
    } finally {
      setEnriching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <p className="text-muted-foreground">Loading product...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link to="/deals" className="text-primary underline">Browse deals</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const pros = toArray(product.pros);
  const cons = toArray(product.cons);

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={`${product.name} - Price in India`}
        description={product.short_description || `Compare prices of ${product.name} on Amazon and Flipkart. Track price drops and set alerts.`}
        canonical={`/product/${product.slug}`}
        type="product"
        image={product.image || undefined}
      />
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image */}
            <Card>
              <CardContent className="p-6 flex items-center justify-center bg-muted/20 min-h-[400px]">
                <img
                  src={product.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"}
                  alt={product.name}
                  className="max-h-[450px] w-auto object-contain"
                />
              </CardContent>
            </Card>

            {/* Details */}
            <div className="space-y-5">
              <div>
                {product.badge && <Badge className="mb-2">{product.badge}</Badge>}
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                {product.rating && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-500 text-white">⭐ {product.rating}</Badge>
                  </div>
                )}
              </div>

              {lowestPrice && (
                <div>
                  <p className="text-sm text-muted-foreground">Best Price</p>
                  <p className="text-4xl font-bold text-primary">₹{lowestPrice.toLocaleString()}</p>
                  {allTimeLow && allTimeLow < lowestPrice && (
                    <p className="text-xs text-muted-foreground mt-1">All-time low: ₹{allTimeLow.toLocaleString()}</p>
                  )}
                </div>
              )}

              {/* Buy buttons */}
              <div className="space-y-3">
                {product.amazon_link && amazonPrice && amazonPrice > 0 && (
                  <div className="relative flex items-center justify-between p-3 border rounded-lg">
                    {amazonIsBest && (
                      <Badge className="absolute -top-2 -right-2 bg-green-600 text-white text-xs flex items-center gap-1">
                        <Award size={10} /> Best
                      </Badge>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Amazon</p>
                      <p className="text-xl font-bold">₹{amazonPrice.toLocaleString()}</p>
                      {amazonDiscount ? <span className="text-xs text-green-600">{amazonDiscount}% OFF</span> : null}
                    </div>
                    <Button asChild className="bg-[#FF9900] hover:bg-[#e68a00] text-white">
                      <a href={product.amazon_link} target="_blank" rel="noopener noreferrer">
                        <ShoppingCart className="w-4 h-4 mr-2" /> Buy on Amazon <ExternalLink className="ml-2 w-3 h-3" />
                      </a>
                    </Button>
                  </div>
                )}
                {product.flipkart_link && flipkartPrice && flipkartPrice > 0 && (
                  <div className="relative flex items-center justify-between p-3 border rounded-lg">
                    {flipkartIsBest && (
                      <Badge className="absolute -top-2 -right-2 bg-green-600 text-white text-xs flex items-center gap-1">
                        <Award size={10} /> Best
                      </Badge>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Flipkart</p>
                      <p className="text-xl font-bold">₹{flipkartPrice.toLocaleString()}</p>
                      {flipkartDiscount ? <span className="text-xs text-green-600">{flipkartDiscount}% OFF</span> : null}
                    </div>
                    <Button asChild className="bg-[#2874F0] hover:bg-[#1f5fcc] text-white">
                      <a href={product.flipkart_link} target="_blank" rel="noopener noreferrer">
                        <ShoppingCart className="w-4 h-4 mr-2" /> Buy on Flipkart <ExternalLink className="ml-2 w-3 h-3" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              {/* Track + Alert */}
              <div className="flex gap-2">
                <TrackButton
                  productId={product.id}
                  productName={product.name}
                  isTracked={isTracked}
                  onTrackChange={(_id, tracked) => setIsTracked(tracked)}
                  className="flex-1"
                />
                <Button variant="outline" className="flex-1" onClick={handleSetAlert}>
                  <Bell className="h-4 w-4 mr-2" /> Set Price Alert
                </Button>
              </div>

              {product.short_description && (
                <p className="text-sm text-muted-foreground">{product.short_description}</p>
              )}
            </div>
          </div>

          {/* Price history */}
          {history.length > 1 && (
            <Card className="mt-8">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-2">Price History</h2>
                <PriceHistoryChart data={history} />
              </CardContent>
            </Card>
          )}

          {/* Pros / Cons */}
          {(pros.length > 0 || cons.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {pros.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-green-600 mb-3">✓ Pros</h3>
                    <ul className="space-y-2">
                      {pros.map((p, i) => (
                        <li key={i} className="text-sm flex gap-2"><span className="text-green-600">•</span>{p}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {cons.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-red-600 mb-3">✗ Cons</h3>
                    <ul className="space-y-2">
                      {cons.map((c, i) => (
                        <li key={i} className="text-sm flex gap-2"><span className="text-red-600">•</span>{c}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>

      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Price Alert</DialogTitle>
            <DialogDescription>
              Get notified when <strong>{product.name}</strong> drops to your target price.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Target Price (₹)</label>
            <Input
              type="number" value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="Enter your target price" min="1"
            />
            {lowestPrice && (
              <p className="text-xs text-muted-foreground mt-2">
                Current lowest price: ₹{lowestPrice.toLocaleString()}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlertOpen(false)}>Cancel</Button>
            <Button onClick={submitAlert} disabled={settingAlert || !targetPrice}>
              {settingAlert ? "Setting..." : "Set Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default ProductDetail;
