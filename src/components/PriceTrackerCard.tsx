import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TrendingDown, TrendingUp, Bell, Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

  const lowestAmazon = Math.min(...priceHistory.map(p => p.amazon_price || Infinity).filter(p => p !== Infinity));
  const lowestFlipkart = Math.min(...priceHistory.map(p => p.flipkart_price || Infinity).filter(p => p !== Infinity));
  const lowestPrice = Math.min(lowestAmazon, lowestFlipkart);

  const currentLowestPrice = Math.min(currentAmazonPrice || Infinity, currentFlipkartPrice || Infinity);
  const dropPercentage = lowestPrice !== Infinity && currentLowestPrice !== Infinity 
    ? ((lowestPrice - currentLowestPrice) / lowestPrice * 100).toFixed(1)
    : "0";

  const getBuyingAdvice = () => {
    if (currentLowestPrice === lowestPrice) {
      return { text: "Best Time to Buy", variant: "default" as const };
    }
    const diff = ((currentLowestPrice - lowestPrice) / lowestPrice) * 100;
    if (diff < 10) {
      return { text: "Good Deal", variant: "secondary" as const };
    }
    return { text: "Hold & Wait", variant: "outline" as const };
  };

  const advice = getBuyingAdvice();

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
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex gap-4">
        <img 
          src={product.image || "/placeholder.svg"} 
          alt={product.name}
          className="w-24 h-24 object-cover rounded-lg"
        />
        
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-foreground line-clamp-2">{product.name}</h3>
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

          <div className="flex gap-4">
            {currentAmazonPrice > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Amazon</p>
                <p className="text-lg font-bold text-foreground">₹{currentAmazonPrice.toLocaleString()}</p>
              </div>
            )}
            {currentFlipkartPrice > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Flipkart</p>
                <p className="text-lg font-bold text-foreground">₹{currentFlipkartPrice.toLocaleString()}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {lowestPrice !== Infinity && (
              <Badge variant="secondary" className="gap-1">
                <TrendingDown className="h-3 w-3" />
                Lowest: ₹{lowestPrice.toLocaleString()}
              </Badge>
            )}
            {Number(dropPercentage) > 0 && (
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {dropPercentage}% from lowest
              </Badge>
            )}
            <Badge variant={advice.variant}>{advice.text}</Badge>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Target price"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="max-w-32"
            />
            <Button 
              onClick={handleSetTargetPrice}
              disabled={isUpdating}
              size="sm"
              className="gap-1"
            >
              <Bell className="h-4 w-4" />
              Set Alert
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Eye className="h-4 w-4" />
                  Full Trend
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
    </Card>
  );
};

export default PriceTrackerCard;