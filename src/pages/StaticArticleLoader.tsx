import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import SEO from "@/components/SEO"; // Import your SEO component

const StaticArticleLoader = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<string | null>(null);
  const [metaInfo, setMetaInfo] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHtml = async () => {
      try {
        // Fetch the full HTML file
        const response = await fetch(`/articles/${slug}.html`);
        
        if (!response.ok) {
          throw new Error("Article not found");
        }
        
        const fullHtmlText = await response.text();

        // Parse the HTML string into a DOM object
        const parser = new DOMParser();
        const doc = parser.parseFromString(fullHtmlText, "text/html");

        // 1. Extract Title and Description for SEO
        const title = doc.querySelector("title")?.innerText || "Article";
        const description = doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";
        setMetaInfo({ title, description });

        // 2. Extract ONLY the <main> content
        // This removes the static Header, Footer, and Scripts from the file
        const mainContent = doc.querySelector("main")?.innerHTML;

        if (mainContent) {
          setContent(mainContent);
        } else {
          // Fallback: If no <main> tag found, use the body content
          setContent(doc.body.innerHTML);
        }

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
      {/* Inject extracted metadata for the browser tab */}
      <SEO 
        title={metaInfo.title} 
        description={metaInfo.description}
        canonical={`/articles/${slug}`}
      />

      <Header />
      
      {/* Render the extracted content. 
          We use a div with 'flex-1' to ensure it takes up space like a native page. 
          The content inside likely has its own container classes. 
      */}
      <main className="flex-1">
         <div dangerouslySetInnerHTML={{ __html: content || "" }} />
      </main>

      <Footer />
    </div>
  );
};

export default StaticArticleLoader;