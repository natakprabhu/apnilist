"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Calendar, ArrowRight, ChevronLeft, ChevronRight, Grid } from "lucide-react";
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

const ARTICLES_PER_PAGE = 12;

const ArticlesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Expanded curated categories
  const categories: Category[] = [
    { name: "All Categories", slug: "all" },
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

  // Fetch articles with pagination
  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        // First get total count
        const { count } = await supabase
          .from("articles")
          .select("*", { count: "exact", head: true })
          .eq("status", "published");

        setTotalArticles(count || 0);

        // Fetch paginated articles
        const from = (currentPage - 1) * ARTICLES_PER_PAGE;
        const to = from + ARTICLES_PER_PAGE - 1;

        const { data, error } = await supabase
          .from("articles")
          .select("id, title, slug, excerpt, featured_image, category, date, created_at")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) throw error;

        setArticles(data || []);
      } catch (error) {
        console.error("Error fetching articles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [currentPage]);

  const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

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

  const openCategory = (slug: string) => {
    if (slug === "all") {
      navigate("/search");
    } else {
      navigate(`/search?category=${slug}`);
    }
  };

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
                  variant={c.slug === "all" ? "default" : "outline"}
                  className={`px-4 py-2 rounded-full ${c.slug === "all" ? "flex items-center gap-2" : ""}`}
                  onClick={() => openCategory(c.slug)}
                >
                  {c.slug === "all" && <Grid className="h-4 w-4" />}
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">📚 Latest Articles</h2>
              <Link to="/search">
                <Button variant="outline" className="flex items-center gap-2">
                  <Grid className="h-4 w-4" />
                  View All Articles
                </Button>
              </Link>
            </div>
            
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading articles...</p>
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No articles available at the moment.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {articles.map((article) => (
                    <Link key={article.id} to={`/articles/${article.slug}`}>
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    {getPageNumbers().map((page, index) => (
                      typeof page === 'number' ? (
                        <Button
                          key={index}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                        >
                          {page}
                        </Button>
                      ) : (
                        <span key={index} className="px-2 text-muted-foreground">...</span>
                      )
                    ))}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Total count */}
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Showing {((currentPage - 1) * ARTICLES_PER_PAGE) + 1}-{Math.min(currentPage * ARTICLES_PER_PAGE, totalArticles)} of {totalArticles} articles
                </p>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ArticlesPage;