import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO"; // <--- FIXED: Added curly braces

const StaticArticleLoader = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<string | null>(null);
  const [metaInfo, setMetaInfo] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHtml = async () => {
      try {
        const response = await fetch(`/articles/${slug}.html`);
        
        if (!response.ok) {
          throw new Error("Article not found");
        }
        
        const fullHtmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(fullHtmlText, "text/html");

        // Extract Title and Description
        const title = doc.querySelector("title")?.innerText || "Article";
        const description = doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";
        setMetaInfo({ title, description });

        // Extract <main> content
        const mainContent = doc.querySelector("main")?.innerHTML;
        setContent(mainContent || doc.body.innerHTML);

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
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title={metaInfo.title} 
        description={metaInfo.description}
        canonical={`/articles/${slug}`}
      />
      <Header />
      <main className="flex-1">
         <div dangerouslySetInnerHTML={{ __html: content || "" }} />
      </main>
      <Footer />
    </div>
  );
};

export default StaticArticleLoader;