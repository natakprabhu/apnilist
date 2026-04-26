import { Link, useParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";

interface CategoryArticle {
  slug: string;
  title: string;
  description: string;
}

const CATEGORIES: Record<string, { label: string; description: string; articles: CategoryArticle[] }> = {
  chimney: {
    label: "Kitchen Chimneys",
    description: "Find the best kitchen chimneys in India. Compare filterless, auto-clean, and baffle filter chimneys with real prices from Amazon and Flipkart.",
    articles: [
      { slug: "best-filterless-chimney", title: "Top 10 Filterless Chimneys", description: "No filter maintenance needed — best for heavy cooking." },
      { slug: "best-auto-clean-chimney", title: "Top 10 Auto-Clean Chimneys", description: "Low-maintenance auto-clean chimneys for Indian kitchens." },
    ],
  },
  "washing-machine": {
    label: "Washing Machines",
    description: "Compare the best washing machines in India — front load, fully automatic, semi-automatic, and smart washing machines with live price tracking.",
    articles: [
      { slug: "best-front-load-washing-machine", title: "Top 10 Front Load Washing Machines", description: "Energy-efficient front loaders for deep cleaning." },
      { slug: "best-fully-automatic-washing-machine", title: "Top 10 Fully Automatic Washing Machines", description: "Set it and forget it — top fully automatic picks." },
      { slug: "best-semi-automatic-washing-machine", title: "Top 10 Semi-Automatic Washing Machines", description: "Budget-friendly semi-auto machines for everyday use." },
      { slug: "best-smart-washing-machine", title: "Top 10 Smart Washing Machines", description: "Wi-Fi enabled smart washing machines with app control." },
    ],
  },
  laptop: {
    label: "Laptops",
    description: "Explore the best laptops in India for gaming, work, and students. Compare prices on Amazon and Flipkart with full specs and expert reviews.",
    articles: [
      { slug: "best-gaming-laptop", title: "Top 10 Gaming Laptops", description: "High refresh rate, powerful GPU picks for gamers." },
      { slug: "best-ultrabook-laptop", title: "Top 10 Thin & Light Ultrabooks", description: "Slim, lightweight laptops for professionals on the go." },
      { slug: "best-laptop-under-40000", title: "Top 10 Student Laptops under ₹40,000", description: "Best value laptops for students and everyday use." },
    ],
  },
  mobile: {
    label: "Mobile Phones",
    description: "Find the best smartphones in India. From camera phones to gaming phones and foldable phones — compare live prices on Amazon and Flipkart.",
    articles: [
      { slug: "best-camera-phone", title: "Top 10 Camera-Centric Phones", description: "Best phones for photography and video recording." },
      { slug: "best-gaming-phone", title: "Top 10 Gaming Phones", description: "High-performance phones built for mobile gaming." },
      { slug: "best-foldable-phone", title: "Top 10 Foldable Flip Phones", description: "Premium foldable smartphones available in India." },
    ],
  },
  tv: {
    label: "Televisions",
    description: "Compare the best TVs in India — OLED, QLED, and budget 4K TVs. Track prices on Amazon and Flipkart to buy at the lowest price.",
    articles: [
      { slug: "best-oled-qled-tv", title: "Top 10 OLED & QLED TVs", description: "Premium display technology for the ultimate viewing experience." },
      { slug: "best-budget-4k-tv", title: "Top 10 Budget 4K TVs", description: "Best affordable 4K TVs under ₹30,000 in India." },
    ],
  },
  refrigerator: {
    label: "Refrigerators",
    description: "Find the best refrigerators in India. Compare convertible, side-by-side, and double door fridges with live Amazon and Flipkart prices.",
    articles: [
      { slug: "best-convertible-refrigerator", title: "Top 10 Convertible Refrigerators", description: "Flexible storage refrigerators with convertible modes." },
      { slug: "best-side-by-side-refrigerator", title: "Top 10 Side-by-Side Refrigerators", description: "Large capacity side-by-side fridges for big families." },
    ],
  },
  "air-purifier": {
    label: "Air Purifiers",
    description: "Breathe clean air with the best air purifiers in India. Compare HEPA, car, and room air purifiers with real prices and expert reviews.",
    articles: [
      { slug: "best-hepa-air-purifier", title: "Top 10 True HEPA Air Purifiers", description: "Hospital-grade HEPA filtration for home use." },
      { slug: "best-car-air-purifier", title: "Top 10 Car Air Purifiers", description: "Compact air purifiers designed for your car." },
    ],
  },
  "vacuum-cleaner": {
    label: "Vacuum Cleaners",
    description: "Find the best vacuum cleaners in India — robot, cordless stick, and wet-dry vacuums. Compare prices and reviews from top brands.",
    articles: [
      { slug: "best-robot-vacuum-cleaner", title: "Top 10 Robot Vacuum Cleaners", description: "Hands-free automatic robot vacuums for Indian homes." },
      { slug: "best-cordless-vacuum-cleaner", title: "Top 10 Cordless Stick Vacuums", description: "Lightweight cordless vacuums for quick daily cleaning." },
      { slug: "best-wet-dry-vacuum-cleaner", title: "Top 10 Wet & Dry Vacuum Cleaners", description: "Versatile wet-dry vacs for deep cleaning." },
    ],
  },
};

const CategoryPage = () => {
  const { category } = useParams<{ category: string }>();
  const data = category ? CATEGORIES[category] : null;

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Category Not Found</h1>
            <Link to="/articles" className="text-primary underline">Browse all articles</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={`Best ${data.label} in India 2026`}
        description={data.description}
        canonical={`/category/${category}`}
        type="website"
      />
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <nav className="text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:underline">Home</Link>
            {" › "}
            <Link to="/articles" className="hover:underline">Articles</Link>
            {" › "}
            <span>{data.label}</span>
          </nav>

          <h1 className="text-4xl font-bold mb-4">Best {data.label} in India (2026)</h1>
          <p className="text-lg text-muted-foreground mb-10">{data.description}</p>

          <div className="grid gap-6">
            {data.articles.map((article) => (
              <Link
                key={article.slug}
                to={`/articles/${article.slug}`}
                className="block border rounded-xl p-6 hover:border-primary hover:shadow-md transition-all"
              >
                <h2 className="text-xl font-semibold mb-2 text-primary">{article.title}</h2>
                <p className="text-muted-foreground">{article.description}</p>
                <span className="mt-3 inline-block text-sm font-medium text-primary">
                  Read guide →
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-12 p-6 bg-primary/5 rounded-xl border border-primary/20">
            <h2 className="text-xl font-bold mb-2">Track Prices on Any {data.label.replace(/s$/, "")}</h2>
            <p className="text-muted-foreground mb-4">
              Set a price alert and ApniList will notify you when the price drops on Amazon or Flipkart.
            </p>
            <Link
              to="/price-tracker"
              className="inline-block bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition"
            >
              Start Tracking Prices
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoryPage;
