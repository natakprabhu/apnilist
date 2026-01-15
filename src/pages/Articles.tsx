"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Calendar, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryImage } from "@/lib/categoryImages";

type Category = {
  name: string;
  slug: string;
  icon?: string;
};

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  category: string | null;
  date: string | null;
  created_at: string;
};

const ArticlesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded curated categories
  const categories: Category[] = [
    { name: "Chimney", slug: "chimney" },
    { name: "Microwave", slug: "microwave" },
    { name: "Juicer", slug: "juicer" },
    { name: "Water Purifier", slug: "water-purifier" },
    { name: "TV", slug: "tv" },
    { name: "Laptop", slug: "laptop" },
    { name: "Mobile", slug: "mobile" },
    { name: "Coffee Maker", slug: "coffee-maker" },
    { name: "Refrigerator", slug: "refrigerator" },
    { name: "Air Purifier", slug: "air-purifier" },
    { name: "Vacuum Cleaner", slug: "vacuum-cleaner" },
  ];

  // Recommendations JSON
  const recommendations: Record<string, string[]> = {
    mobile: ["phone", "mobile", "smartphone", "android", "ios"],
    laptop: ["laptop", "notebook", "macbook", "dell", "hp", "lenovo"],
    tv: ["tv", "led tv", "smart tv", "oled", "lcd"],
    microwave: ["microwave", "otg", "oven", "convection oven"],
    chimney: ["chimney", "kitchen chimney", "exhaust"],
    juicer: ["juicer", "mixer grinder", "blender", "juice extractor"],
    "water-purifier": ["water purifier", "ro purifier", "uv purifier", "uf purifier"],
    "hair-dryer": ["hair dryer", "blow dryer", "styler"],
    oven: ["oven", "baking oven", "electric oven"],
    blender: ["blender", "smoothie maker", "nutri blender"],
    "coffee-maker": ["coffee maker", "espresso", "filter coffee"],
    dishwasher: ["dishwasher", "automatic dishwasher"],
    refrigerator: ["fridge", "refrigerator", "double door fridge"],
    "air-purifier": ["air purifier", "hepa", "dust purifier"],
    iron: ["iron", "steam iron", "dry iron"],
    "vacuum-cleaner": ["vacuum cleaner", "robot vacuum", "upright vacuum"],
    "led-lights": ["led lights", "bulbs", "tube light"],
    fan: ["fan", "ceiling fan", "table fan", "tower fan"],
    "mixer-grinder": ["mixer grinder", "wet grinder", "kitchen grinder"],
  };

  // Fetch random articles on mount
  useEffect(() => {
    const fetchRandomArticles = async () => {
      try {
        // Fetch all published articles
        const { data, error } = await supabase
          .from("articles")
          .select("id, title, slug, excerpt, featured_image, category, date, created_at")
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          // Shuffle and pick 10-20 random articles
          const shuffled = [...data].sort(() => Math.random() - 0.5);
          const count = Math.min(Math.floor(Math.random() * 11) + 10, shuffled.length); // 10-20 articles
          setArticles(shuffled.slice(0, count));
        }
      } catch (error) {
        console.error("Error fetching articles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRandomArticles();
  }, []);

  // Search logic
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim().length > 0) {
      const filtered: string[] = [];
      const keyword = val.toLowerCase();

      for (const [catSlug, keywords] of Object.entries(recommendations)) {
        if (keywords.some(k => k.toLowerCase().includes(keyword))) {
          const catName = categories.find(c => c.slug === catSlug)?.name;
          if (catName) filtered.push(catName);
        }
      }

      setSuggestions([...new Set(filtered)].slice(0, 8));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (s: string) => {
    const cat = categories.find(c => c.name === s);
    if (cat) navigate(`/search?category=${cat.slug}`);
    setSearchQuery("");
    setShowSuggestions(false);
  };

  const openCategory = (slug: string) => navigate(`/search?category=${slug}`);

  // Highlight matching keyword
  const highlightMatch = (text: string, query: string) => {
    const regex = new RegExp(`(${query})`, "ig");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className="bg-yellow-200 rounded px-1">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title="Explore Products & Reviews"
        description="Explore articles featuring curated top 10 product lists or search for recommendations across categories like mobile, laptop, TV, microwave, and more."
        canonical="/articles"
      />
      <Header />
      <main className="flex-1 py-16 bg-muted/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold mb-3">Explore Products & Reviews</h1>
            <p className="text-muted-foreground mb-6">
              Explore articles featuring curated top 10 product lists or search for recommendations.
            </p>

            {/* Category Chips */}
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {categories.map(c => (
                <Button
                  key={c.slug}
                  variant="outline"
                  className="px-4 py-2 rounded-full"
                  onClick={() => openCategory(c.slug)}
                >
                  {c.icon} {c.name}
                </Button>
              ))}
            </div>

            {/* Search Input */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setShowSuggestions(searchQuery.length > 0)}
                placeholder="Search categories..."
                className="pl-10 pr-4 py-4 rounded-xl"
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-card border rounded-lg shadow-lg z-20">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors"
                    >
                      {highlightMatch(s, searchQuery)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Articles Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">📚 Latest Articles</h2>
            
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading articles...</p>
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No articles available at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {articles.map((article) => (
                  <Link key={article.id} to={`/article/${article.slug}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow duration-300 group">
                      <CardContent className="p-0">
                        <div className="aspect-video overflow-hidden rounded-t-lg">
                          <img
                            src={article.featured_image || getCategoryImage(article.category)}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-4">
                          {article.category && (
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                              {article.category}
                            </span>
                          )}
                          <h3 className="font-semibold mt-2 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {article.title}
                          </h3>
                          {article.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {article.excerpt}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(article.date || article.created_at)}</span>
                            </div>
                            <span className="flex items-center gap-1 text-primary group-hover:underline">
                              Read more <ArrowRight className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ArticlesPage;