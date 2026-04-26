import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import TopArticlesSection from "@/components/home/TopArticlesSection";
import MostTrackedSection from "@/components/home/MostTrackedSection";
import GoogleReviewsSection from "@/components/home/GoogleReviewsSection";
import TelegramSubscribeSection from "@/components/home/TelegramSubscribeSection";
import EmailCaptureSection from "@/components/home/EmailCaptureSection";
import { SEO } from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title="Smart Price Tracking & Product Reviews"
        description="Track prices, get alerts, and discover expert product reviews. Compare Amazon & Flipkart prices and never miss a deal."
        canonical="/"
      />
      <Header />

      <main className="flex-1">
        {/* Hero H1 — primary SEO signal for homepage */}
        <section className="bg-gradient-to-br from-primary/10 to-primary/5 py-12 text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
            Smart Price Tracker for Amazon & Flipkart India
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Track price history, get instant drop alerts, and read expert product reviews — never overpay again.
          </p>
        </section>

        <HowItWorksSection />
        <TelegramSubscribeSection />
        <TopArticlesSection />
        <MostTrackedSection />
        <EmailCaptureSection />
        <GoogleReviewsSection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;