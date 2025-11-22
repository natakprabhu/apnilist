import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Heart, User, Menu, X, LogOut, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      setIsAdmin(!!data);
    };

    checkAdmin();
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="ApniList" className="h-10 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
              Home
            </Link>
            <Link to="/articles" className="text-sm font-medium hover:text-primary transition-colors">
              Articles
            </Link>
            {user && (
              <>
                <Link to="/price-tracker" className="text-sm font-medium hover:text-primary transition-colors">
                  Price Tracker
                </Link>
                <Link to="/at-your-price">
                  <Button 
                    variant="ghost"
                    className="neon-button-teal text-sm font-medium px-4 py-2 h-9"
                  >
                    At Your Price 🔥
                  </Button>
                </Link>
              </>
            )}
            <Link to="/deals" className="text-sm font-medium hover:text-primary transition-colors">
              Daily Deals
            </Link>
          </nav>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-sm mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-9"
              />
            </div>
          </form>

          {/* Action Icons */}
          <div className="flex items-center gap-4">
            {user && (
              <>
                <Link to="/alerts" className="text-foreground/70 hover:text-primary transition-colors hidden md:inline-block">
                  <Bell className="h-5 w-5" />
                </Link>
                <Link to="/wishlist" className="text-foreground/70 hover:text-primary transition-colors hidden md:inline-block">
                  <Heart className="h-5 w-5" />
                </Link>
              </>
            )}
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-foreground/70 hover:text-primary">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/wishlist">Wishlist</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/alerts">Price Alerts</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin">Admin Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/products">
                          <Settings className="mr-2 h-4 w-4" />
                          Manage Products
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm">Sign In</Button>
              </Link>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4"
                />
              </div>
            </form>

            <Link
              to="/"
              className="block text-sm font-medium hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/articles"
              className="block text-sm font-medium hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Articles
            </Link>
            {user && (
              <>
                <Link
                  to="/price-tracker"
                  className="block text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Price Tracker
                </Link>
                <Link
                  to="/at-your-price"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Button 
                    variant="ghost"
                    className="neon-button-teal text-sm font-medium w-full justify-start"
                  >
                    At Your Price 🔥
                  </Button>
                </Link>
              </>
            )}
            <Link
              to="/deals"
              className="block text-sm font-medium hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Daily Deals
            </Link>
            {user && (
              <>
                <div className="flex space-x-2 pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/alerts">
                      <Bell className="h-4 w-4 mr-2" />
                      Alerts
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/wishlist">
                      <Heart className="h-4 w-4 mr-2" />
                      Wishlist
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/profile">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </Button>
                </div>
                {isAdmin && (
                  <div className="pt-2 space-y-2 border-t border-border mt-2">
                    <Link
                      to="/admin"
                      className="block text-sm font-medium hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                    <Link
                      to="/products"
                      className="block text-sm font-medium hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4 mr-2 inline" />
                      Manage Products
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
