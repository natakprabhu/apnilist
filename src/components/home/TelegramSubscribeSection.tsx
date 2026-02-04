import { Send, Bell, Zap, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const TELEGRAM_CHANNEL_LINK = "https://t.me/apnilist"; // Replace with your actual Telegram channel link

const TelegramSubscribeSection = () => {
  const features = [
    { icon: Zap, text: "Instant Price Drop Alerts" },
    { icon: Gift, text: "Exclusive Daily Deals" },
    { icon: Bell, text: "Product Launch Updates" },
  ];

  return (
    <section className="py-12 bg-gradient-to-r from-[#0088cc]/10 via-[#0088cc]/5 to-[#0088cc]/10">
      <div className="container mx-auto px-4">
        <Card className="relative overflow-hidden border-[#0088cc]/30 bg-background/80 backdrop-blur">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#0088cc]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#0088cc]/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8">
            {/* Telegram Icon */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#0088cc] flex items-center justify-center shadow-lg shadow-[#0088cc]/30">
                <Send className="w-10 h-10 md:w-12 md:h-12 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Join Our Telegram Channel
              </h2>
              <p className="text-muted-foreground mb-4">
                Never miss a deal! Get instant notifications for price drops, exclusive offers, and product updates directly on Telegram.
              </p>
              
              {/* Features */}
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
                {features.map((feature, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 text-sm text-foreground bg-muted/50 px-3 py-1.5 rounded-full"
                  >
                    <feature.icon className="w-4 h-4 text-[#0088cc]" />
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex-shrink-0">
              <Button 
                asChild
                size="lg"
                className="bg-[#0088cc] hover:bg-[#0077b5] text-white font-semibold px-8 py-6 text-lg rounded-full shadow-lg shadow-[#0088cc]/30 transition-all hover:scale-105"
              >
                <a 
                  href={TELEGRAM_CHANNEL_LINK} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Subscribe Now
                </a>
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Free • No spam • Unsubscribe anytime
              </p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default TelegramSubscribeSection;
