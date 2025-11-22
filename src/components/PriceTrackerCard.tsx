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
import ShareButton from "./ShareButton";

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
    
    // Check if price dropped 10% below lowest price ever
    const priceDropped10Percent = currentLowestPrice <= lowestPrice * 0.9;
    
    // Check if target price is met
    const targetPriceMet = targetPrice && currentLowestPrice <= Number(targetPrice);
    
    if (priceDropped10Percent) {
      return { 
        badge: "Best Time to Buy", 
        variant: "default" as const,
        advice: `Price dropped 10% below lowest ever! Excellent deal - don't miss it!`
      };
    }
    
    if (targetPriceMet) {
      return { 
        badge: "Best Time to Buy", 
        variant: "default" as const,
        advice: `Your target price of ₹${targetPrice} has been met! Time to buy!`
      };
    }
    
    const diff = ((currentLowestPrice - lowestPrice) / lowestPrice) * 100;
    return { 
      badge: "Hold & Wait", 
      variant: "destructive" as const,
      advice: `Current price is ${diff.toFixed(1)}% above lowest. Wait for a better deal or set a target price.`
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
    <Card className="p-3 hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Product Image */}
        <div className="flex-shrink-0">
          <img 
            src={product.image || "/placeholder.svg"} 
            alt={product.name}
            className="w-20 h-20 object-cover rounded-lg"
          />
        </div>
        
        <div className="flex-1 space-y-2">
          {/* Header with Title and Recommendation Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-base text-foreground mb-1">{product.name}</h3>
              <Badge variant={advice.variant} className="text-xs px-2 py-0.5">
                {advice.badge}
              </Badge>
            </div>
            {onRemove && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onRemove}
                className="text-muted-foreground hover:text-destructive h-7 w-7"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Buying Advice */}
          <p className="text-xs text-muted-foreground">{advice.advice}</p>

          {/* Current Prices and Lowest Price */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {/* Current Price */}
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase">Current</p>
              <p className="text-lg font-bold text-foreground">
                ₹{currentLowestPrice !== Infinity ? currentLowestPrice.toLocaleString() : 'N/A'}
              </p>
            </div>

            {/* Lowest Price */}
            {lowestPrice !== Infinity && (
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase">Lowest</p>
                <p className="text-lg font-bold text-primary">₹{lowestPrice.toLocaleString()}</p>
                {lowestPriceDate && (
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(lowestPriceDate), 'dd/MM/yy')}
                  </p>
                )}
              </div>
            )}

            {/* Price Drop */}
            {Number(dropPercentage) !== 0 && (
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase">Change</p>
                <div className="flex items-center gap-1">
                  {Number(dropPercentage) < 0 ? (
                    <>
                      <TrendingDown className="h-4 w-4 text-primary" />
                      <p className="text-lg font-bold text-primary">{Math.abs(Number(dropPercentage))}%</p>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 text-destructive" />
                      <p className="text-lg font-bold text-destructive">+{dropPercentage}%</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Store Comparison */}
          <div className="border-t pt-2">
            <p className="text-xs font-semibold mb-2">Buy from:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentAmazonPrice > 0 && (
                <div className={`p-2 rounded-lg border ${cheapestStore === 'amazon' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Amazon</p>
                      <p className="text-sm font-bold text-foreground">₹{currentAmazonPrice.toLocaleString()}</p>
                    </div>
                    {cheapestStore === 'amazon' && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">Cheapest</Badge>
                    )}
                  </div>
                  {product.amazon_link && (
                    <Button 
                      variant={cheapestStore === 'amazon' ? 'default' : 'outline'}
                      size="sm" 
                      className="w-full gap-1 h-7 text-xs"
                      asChild
                    >
                      <a href={product.amazon_link} target="_blank" rel="noopener noreferrer">
                        Buy
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {currentFlipkartPrice > 0 && (
                <div className={`p-2 rounded-lg border ${cheapestStore === 'flipkart' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Flipkart</p>
                      <p className="text-sm font-bold text-foreground">₹{currentFlipkartPrice.toLocaleString()}</p>
                    </div>
                    {cheapestStore === 'flipkart' && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">Cheapest</Badge>
                    )}
                  </div>
                  {product.flipkart_link && (
                    <Button 
                      variant={cheapestStore === 'flipkart' ? 'default' : 'outline'}
                      size="sm" 
                      className="w-full gap-1 h-7 text-xs"
                      asChild
                    >
                      <a href={product.flipkart_link} target="_blank" rel="noopener noreferrer">
                        Buy
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Target Price and Actions */}
          <div className="border-t pt-2">
            <p className="text-xs font-semibold mb-2">Set Price Alert</p>
            <div className="flex flex-wrap items-center gap-1">
              <div className="flex items-center gap-0.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleTargetPriceChange(-100)}
                  className="h-7 w-7"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  placeholder="Target"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-24 h-7 text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleTargetPriceChange(100)}
                  className="h-7 w-7"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              
              <Button 
                onClick={handleSetTargetPrice}
                disabled={isUpdating}
                size="sm"
                className="gap-1 h-7 text-xs"
              >
                <Bell className="h-3 w-3" />
                Set
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 h-7 text-xs">
                    <Eye className="h-3 w-3" />
                    Trend
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>{product.name}</DialogTitle>
                  </DialogHeader>
                  <PriceHistoryChart data={priceHistory} />
                </DialogContent>
              </Dialog>

              <ShareButton
                productName={product.name}
                currentPrice={currentLowestPrice !== Infinity ? currentLowestPrice : 0}
                mrp={lowestPrice !== Infinity ? Math.max(lowestPrice * 1.3, currentLowestPrice) : undefined}
                variant="outline"
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PriceTrackerCard;