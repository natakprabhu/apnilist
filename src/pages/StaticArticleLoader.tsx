import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";

const StaticArticleLoader = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHtml = async () => {
      try {
        // Fetches from public/articles/filename.html
        const response = await fetch(`/articles/${slug}.html`);
        
        if (!response.ok) {
          throw new Error("Article not found");
        }
        
        const text = await response.text();
        setHtmlContent(text);
      } catch (error) {
        console.error("Failed to load static article:", error);
        navigate("/404");
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchHtml();
    }
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto py-12 px-4">
           <Skeleton className="h-12 w-3/4 mb-4" />
           <Skeleton className="h-6 w-1/2 mb-8" />
           <Skeleton className="h-96 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
         {/* Render the raw HTML content */}
         <div dangerouslySetInnerHTML={{ __html: htmlContent || "" }} />
      </main>
      <Footer />
    </div>
  );
};

export default StaticArticleLoader;