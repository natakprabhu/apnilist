import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TrendingDown, TrendingUp, Bell, Eye, Trash2, ExternalLink, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PriceHistoryChart from "./PriceHistoryChart";

interface PriceHistory {
  created_at: string;
  amazon_price: number | null;
  flipkart_price: number | null;
}

interface PriceTrackerCardProps {
  product: {
    id: string;
    name: string;
    image: string | null;
    amazon_link: string | null;
    flipkart_link: string | null;
  };
  priceHistory: PriceHistory[];
  targetPrice?: number;
  alertEnabled?: boolean;
  onRemove?: () => void;
  onTargetPriceSet?: () => void;
}

const PriceTrackerCard = ({ 
  product, 
  priceHistory, 
  targetPrice: initialTargetPrice,
  alertEnabled: initialAlertEnabled,
  onRemove,
  onTargetPriceSet 
}: PriceTrackerCardProps) => {
  const [targetPrice, setTargetPrice] = useState(initialTargetPrice?.toString() || "");
  const [alertEnabled, setAlertEnabled] = useState(initialAlertEnabled ?? true);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const latestPrice = priceHistory[0];
  const currentAmazonPrice = latestPrice?.amazon_price || 0;
  const currentFlipkartPrice = latestPrice?.flipkart_price || 0;

  // Find lowest prices and their dates
  const amazonPrices = priceHistory.filter(p => p.amazon_price).map(p => ({ price: p.amazon_price!, date: p.created_at }));
  const flipkartPrices = priceHistory.filter(p => p.flipkart_price).map(p => ({ price: p.flipkart_price!, date: p.created_at }));
  
  const lowestAmazonEntry = amazonPrices.length > 0 ? amazonPrices.reduce((min, curr) => curr.price < min.price ? curr : min) : null;
  const lowestFlipkartEntry = flipkartPrices.length > 0 ? flipkartPrices.reduce((min, curr) => curr.price < min.price ? curr : min) : null;
  
  const lowestPrice = Math.min(
    lowestAmazonEntry?.price || Infinity, 
    lowestFlipkartEntry?.price || Infinity
  );
  
  const lowestPriceDate = lowestPrice === lowestAmazonEntry?.price 
    ? lowestAmazonEntry?.date 
    : lowestFlipkartEntry?.date;

  const currentLowestPrice = Math.min(currentAmazonPrice || Infinity, currentFlipkartPrice || Infinity);
  
  // Determine cheapest store
  const cheapestStore = currentAmazonPrice > 0 && currentFlipkartPrice > 0
    ? (currentAmazonPrice < currentFlipkartPrice ? 'amazon' : 'flipkart')
    : currentAmazonPrice > 0 ? 'amazon' : 'flipkart';
  
  const dropPercentage = lowestPrice !== Infinity && currentLowestPrice !== Infinity 
    ? ((currentLowestPrice - lowestPrice) / lowestPrice * 100).toFixed(1)
    : "0";

  const getBuyingAdvice = () => {
    if (lowestPrice === Infinity || currentLowestPrice === Infinity) {
      return { 
        badge: "No Data", 
        variant: "outline" as const,
        advice: "Insufficient price data to provide recommendation"
      };
    }
    
    const threshold = lowestPrice * 1.05; // 5% above lowest
    
    if (currentLowestPrice <= threshold) {
      return { 
        badge: "Best Time to Buy", 
        variant: "default" as const,
        advice: `Current price is at or near the lowest. Great time to purchase!`
      };
    }
    
    const diff = ((currentLowestPrice - lowestPrice) / lowestPrice) * 100;
    return { 
      badge: "Hold & Wait", 
      variant: "destructive" as const,
      advice: `Current price is ${diff.toFixed(1)}% higher than lowest. Consider waiting for a better deal.`
    };
  };

  const advice = getBuyingAdvice();

  const handleTargetPriceChange = (increment: number) => {
    const current = Number(targetPrice) || 0;
    const newValue = Math.max(0, current + increment);
    setTargetPrice(newValue.toString());
  };

  const handleSetTargetPrice = async () => {
    if (!targetPrice || isNaN(Number(targetPrice))) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid target price",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('price_alerts')
        .upsert({
          user_id: user.id,
          product_id: product.id,
          target_price: Number(targetPrice),
          alert_enabled: alertEnabled,
        }, {
          onConflict: 'user_id,product_id'
        });

      if (error) throw error;

      toast({
        title: "Target Price Set",
        description: `We'll notify you when the price drops to ₹${targetPrice}`,
      });
      onTargetPriceSet?.();
    } catch (error) {
      console.error('Error setting target price:', error);
      toast({
        title: "Error",
        description: "Failed to set target price",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Product Image */}
        <div className="flex-shrink-0">
          <img 
            src={product.image || "/placeholder.svg"} 
            alt={product.name}
            className="w-32 h-32 object-cover rounded-lg"
          />
        </div>
        
        <div className="flex-1 space-y-4">
          {/* Header with Title and Recommendation Badge */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-foreground mb-2">{product.name}</h3>
              <Badge variant={advice.variant} className="text-sm px-3 py-1">
                {advice.badge}
              </Badge>
            </div>
            {onRemove && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onRemove}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Buying Advice */}
          <p className="text-sm text-muted-foreground">{advice.advice}</p>

          {/* Current Prices and Lowest Price */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Price */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase">Current Price</p>
              <p className="text-2xl font-bold text-foreground">
                ₹{currentLowestPrice !== Infinity ? currentLowestPrice.toLocaleString() : 'N/A'}
              </p>
            </div>

            {/* Lowest Price */}
            {lowestPrice !== Infinity && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Lowest Price</p>
                <p className="text-2xl font-bold text-primary">₹{lowestPrice.toLocaleString()}</p>
                {lowestPriceDate && (
                  <p className="text-xs text-muted-foreground">
                    on {format(new Date(lowestPriceDate), 'dd/MM/yyyy')}
                  </p>
                )}
              </div>
            )}

            {/* Price Drop */}
            {Number(dropPercentage) !== 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Price Change</p>
                <div className="flex items-center gap-2">
                  {Number(dropPercentage) < 0 ? (
                    <>
                      <TrendingDown className="h-5 w-5 text-primary" />
                      <p className="text-2xl font-bold text-primary">{Math.abs(Number(dropPercentage))}%</p>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-5 w-5 text-destructive" />
                      <p className="text-2xl font-bold text-destructive">+{dropPercentage}%</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Store Comparison */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold mb-3">Buy from:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentAmazonPrice > 0 && (
                <div className={`p-3 rounded-lg border ${cheapestStore === 'amazon' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Amazon</p>
                      <p className="text-xl font-bold text-foreground">₹{currentAmazonPrice.toLocaleString()}</p>
                    </div>
                    {cheapestStore === 'amazon' && (
                      <Badge variant="default" className="text-xs">Cheapest</Badge>
                    )}
                  </div>
                  {product.amazon_link && (
                    <Button 
                      variant={cheapestStore === 'amazon' ? 'default' : 'outline'}
                      size="sm" 
                      className="w-full gap-2"
                      asChild
                    >
                      <a href={product.amazon_link} target="_blank" rel="noopener noreferrer">
                        Buy on Amazon
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {currentFlipkartPrice > 0 && (
                <div className={`p-3 rounded-lg border ${cheapestStore === 'flipkart' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Flipkart</p>
                      <p className="text-xl font-bold text-foreground">₹{currentFlipkartPrice.toLocaleString()}</p>
                    </div>
                    {cheapestStore === 'flipkart' && (
                      <Badge variant="default" className="text-xs">Cheapest</Badge>
                    )}
                  </div>
                  {product.flipkart_link && (
                    <Button 
                      variant={cheapestStore === 'flipkart' ? 'default' : 'outline'}
                      size="sm" 
                      className="w-full gap-2"
                      asChild
                    >
                      <a href={product.flipkart_link} target="_blank" rel="noopener noreferrer">
                        Buy on Flipkart
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Target Price and Actions */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold mb-3">Set Price Alert</p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleTargetPriceChange(-100)}
                  className="h-9 w-9"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  placeholder="Target price"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-32"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleTargetPriceChange(100)}
                  className="h-9 w-9"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <Button 
                onClick={handleSetTargetPrice}
                disabled={isUpdating}
                size="default"
                className="gap-2"
              >
                <Bell className="h-4 w-4" />
                Set Alert
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="default" className="gap-2">
                    <Eye className="h-4 w-4" />
                    See Trend
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>{product.name}</DialogTitle>
                  </DialogHeader>
                  <PriceHistoryChart data={priceHistory} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PriceTrackerCard;