import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TrackButtonProps {
  productId: string;
  productName?: string;
  isTracked: boolean;
  onTrackChange: (productId: string, isTracked: boolean) => void;
  className?: string;
  showLabel?: boolean;
}

export const TrackButton = ({
  productId,
  productName,
  isTracked,
  onTrackChange,
  className = "",
  showLabel = true,
}: TrackButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const handleTrackClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to track prices",
        variant: "destructive",
      });
      return;
    }

    if (isTracked) {
      // Show confirmation dialog before removing
      setShowConfirmDialog(true);
    } else {
      // Add to tracking directly
      await addToTracking(user.id);
    }
  };

  const addToTracking = async (userId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("wishlist")
        .insert({ user_id: userId, product_id: productId });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already Tracking",
            description: "This product is already in your wishlist",
          });
        } else {
          throw error;
        }
      } else {
        onTrackChange(productId, true);
        toast({ title: "Success", description: "Product added to tracking" });
      }
    } catch (error) {
      console.error("Error tracking product:", error);
      toast({
        title: "Error",
        description: "Failed to add product to tracking",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromTracking = async () => {
    setShowConfirmDialog(false);
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (!error) {
        onTrackChange(productId, false);
        toast({ title: "Removed", description: "Product removed from tracking" });
      } else {
        throw error;
      }
    } catch (error) {
      console.error("Error removing product from tracking:", error);
      toast({
        title: "Error",
        description: "Failed to remove product from tracking",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={isLoading}
        className={`gap-2 ${
          isTracked
            ? "bg-red-50 border-red-500 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-700 dark:text-red-400"
            : "bg-background/80 backdrop-blur-sm"
        } ${className}`}
        onClick={handleTrackClick}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart className={`h-4 w-4 ${isTracked ? "fill-red-600 dark:fill-red-400" : ""}`} />
        )}
        {showLabel && (
          <span className="hidden sm:inline">
            {isLoading ? "..." : isTracked ? "Tracking" : "Track"}
          </span>
        )}
      </Button>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Tracking?</AlertDialogTitle>
            <AlertDialogDescription>
              {productName ? (
                <>Are you sure you want to stop tracking <strong>{productName}</strong>? You won't receive price alerts for this product anymore.</>
              ) : (
                "Are you sure you want to stop tracking this product? You won't receive price alerts for it anymore."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeFromTracking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
