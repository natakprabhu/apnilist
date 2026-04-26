import { useState } from "react";
import { Mail, Bell, TrendingDown, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const EmailCaptureSection = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      // Store in localStorage for now; replace with Supabase insert when ready
      const existing = JSON.parse(localStorage.getItem("price_alert_emails") || "[]");
      if (!existing.includes(email)) {
        existing.push(email);
        localStorage.setItem("price_alert_emails", JSON.stringify(existing));
      }
      setSubmitted(true);
      toast({ title: "You're in! 🎉", description: "We'll email you the best deals and price drops." });
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    { icon: TrendingDown, text: "Weekly price drop roundup" },
    { icon: Bell, text: "Exclusive deal alerts" },
    { icon: ShieldCheck, text: "No spam, unsubscribe anytime" },
  ];

  return (
    <section className="py-12 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        <Card className="p-8 border-primary/20 shadow-lg">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 shadow-md shadow-primary/30">
            <Mail className="w-7 h-7 text-primary-foreground" />
          </div>

          {submitted ? (
            <>
              <h2 className="text-2xl font-bold mb-2">You're on the list! 🎉</h2>
              <p className="text-muted-foreground">
                We'll send you the best deals and price drops straight to your inbox.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Get the Best Deals in Your Inbox
              </h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of smart shoppers who save money on Amazon & Flipkart every week.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-6">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button type="submit" disabled={loading} className="shrink-0">
                  {loading ? "Subscribing..." : "Get Deals"}
                </Button>
              </form>

              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                {perks.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <Icon className="w-4 h-4 text-primary" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </section>
  );
};

export default EmailCaptureSection;
