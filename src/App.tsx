import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import StaticArticleLoader from "./pages/StaticArticleLoader"; // Import the new component
import Index from "./pages/Index";
import Articles from "./pages/Articles";
import ArticleDetail from "./pages/ArticleDetail";
import ArticlePage from "./pages/ArticlePage";
import SearchResults from "./pages/SearchResults";
import Wishlist from "./pages/Wishlist";
import PriceTracker from "./pages/PriceTracker";
import AtYourPrice from "./pages/AtYourPrice";
import Alerts from "./pages/Alerts";
import Deals from "./pages/Deals";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import Products from "./pages/Products";
import NotFound from "./pages/NotFound";
import DoremonPage from "./pages/Doremon";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/draft/:slug" element={<ArticleDetail />} />
            <Route path="/articles/:slug" element={<StaticArticleLoader />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/price-tracker" element={<PriceTracker />} />
            <Route path="/at-your-price" element={<AtYourPrice />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/doremon" element={<DoremonPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/products" element={<Products />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
