import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Product = {
  id: string;
  name: string;
  image: string | null;
  category_id: string | null;
};

const Deals = () => {
  const [deals, setDeals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, image, category_id")
          .limit(12);

        if (error) throw error;
        setDeals(data || []);
      } catch (error) {
        console.error("Error fetching deals:", error);
        toast({
          title: "Error",
          description: "Failed to load deals",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, [toast]);

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
          <div className="flex items-center gap-3 mb-8">
            <Flame className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Today's Best Deals</h1>
          </div>
          
          {/* Deals Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading deals...</p>
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No deals available at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deals.map((deal) => (
                <Card key={deal.id} className="group hover:shadow-hover transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="relative mb-4">
                      <img
                        src={deal.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500"}
                        alt={deal.name}
                        className="w-full h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-3 line-clamp-2">{deal.name}</h3>
                    
                    <Button 
                      className="w-full"
                    >
                      View Product
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Deals;
