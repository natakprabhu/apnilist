import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import TopArticlesSection from "@/components/home/TopArticlesSection";
import MostTrackedSection from "@/components/home/MostTrackedSection";
import GoogleReviewsSection from "@/components/home/GoogleReviewsSection";
import TelegramSubscribeSection from "@/components/home/TelegramSubscribeSection";
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
        <HowItWorksSection />
        <TelegramSubscribeSection />
        <TopArticlesSection />
        <MostTrackedSection />
        <GoogleReviewsSection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;