import { Share2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { FaWhatsapp, FaXTwitter } from "react-icons/fa6";

interface ShareButtonProps {
  productName: string;
  currentPrice: number;
  mrp?: number;
  url?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

const ShareButton = ({ 
  productName, 
  currentPrice, 
  mrp,
  url = window.location.href,
  variant = "outline",
  size = "sm"
}: ShareButtonProps) => {
  const percentageOff = mrp ? Math.round(((mrp - currentPrice) / mrp) * 100) : 0;
  
  const shareText = mrp 
    ? `🔥 Amazing deal! ${productName} at ₹${currentPrice.toLocaleString('en-IN')} (${percentageOff}% OFF from ₹${mrp.toLocaleString('en-IN')})! Check it out:`
    : `Check out this great deal on ${productName} at ₹${currentPrice.toLocaleString('en-IN')}!`;

  const handleShare = (platform: string) => {
    let shareUrl = "";
    
    switch (platform) {
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + " " + url)}`;
        window.open(shareUrl, "_blank");
        break;
        
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
        window.open(shareUrl, "_blank");
        break;
        
      case "email":
        const subject = `Great Deal: ${productName}`;
        const body = `${shareText}\n\n${url}`;
        shareUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = shareUrl;
        break;
        
      case "copy":
        navigator.clipboard.writeText(`${shareText} ${url}`);
        toast.success("Link copied to clipboard!");
        break;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Share2 className="h-4 w-4 mr-2" />
          Share Deal
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleShare("whatsapp")}>
          <FaWhatsapp className="h-4 w-4 mr-2 text-green-600" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("twitter")}>
          <FaXTwitter className="h-4 w-4 mr-2" />
          Twitter / X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("email")}>
          <Mail className="h-4 w-4 mr-2" />
          Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("copy")}>
          <Share2 className="h-4 w-4 mr-2" />
          Copy Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareButton;