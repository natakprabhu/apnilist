import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, Check, X, Loader2, Tag } from "lucide-react";

type Product = {
  id: string;
  name: string;
  slug: string;
  amazon_link: string | null;
  flipkart_link: string | null;
  image: string | null;
  rating: number | null;
  short_description: string | null;
  created_at: string;
  processed: boolean;
};

const ITEMS_PER_PAGE = 10;

const Products = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' } | null>({
    key: 'created_at',
    direction: 'desc'
  });

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    image: "",
    amazon_link: "",
    flipkart_link: "",
    processed: false,
    amazon_price: "",
    flipkart_price: "",
    original_price: "", // New Field
  });

  useEffect(() => {
    if (authLoading) return;

    const checkAdmin = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .single();

        if (error || !data) {
          toast({
            title: "Access Denied",
            description: "You need admin privileges to access this page",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        setIsAdmin(true);
        await fetchProducts();
      } catch (error) {
        console.error("Error checking admin status:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [user, authLoading, navigate, toast]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, amazon_link, flipkart_link, image, rating, short_description, created_at, processed")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProducts(products);
      setCurrentPage(1);
    } else {
      const filtered = products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.slug.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
      setCurrentPage(1);
    }
  }, [searchQuery, products]);

  // Sorting Logic
  const handleSort = (key: keyof Product) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    if (typeof a[key] === 'boolean' && typeof b[key] === 'boolean') {
      return direction === 'asc' 
        ? (a[key] === b[key] ? 0 : a[key] ? 1 : -1)
        : (a[key] === b[key] ? 0 : a[key] ? -1 : 1);
    }

    if (a[key] === null) return 1;
    if (b[key] === null) return -1;
    
    if (a[key]! < b[key]!) return direction === 'asc' ? -1 : 1;
    if (a[key]! > b[key]!) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = sortedProducts.slice(startIndex, endIndex);

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setPriceLoading(true);

    const initialData = {
      name: product.name,
      slug: product.slug,
      image: product.image || "",
      amazon_link: product.amazon_link || "",
      flipkart_link: product.flipkart_link || "",
      processed: product.processed || false,
      amazon_price: "",
      flipkart_price: "",
      original_price: "",
    };

    setFormData(initialData);
    setIsEditDialogOpen(true);

    try {
      const { data: priceHistory, error } = await supabase
        .from("product_price_history")
        .select("amazon_price, flipkart_price, original_price")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && priceHistory) {
        setFormData(prev => ({
          ...prev,
          amazon_price: priceHistory.amazon_price?.toString() || "",
          flipkart_price: priceHistory.flipkart_price?.toString() || "",
          original_price: priceHistory.original_price?.toString() || ""
        }));
      }
    } catch (err) {
      console.error("Error fetching price history", err);
    } finally {
      setPriceLoading(false);
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"?`)) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });

      await fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;

    if (!formData.name.trim() || !formData.slug.trim() || !formData.image.trim()) {
      toast({
        title: "Error",
        description: "Name, slug, and image are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error: productError } = await supabase
        .from("products")
        .update({
          name: formData.name,
          slug: formData.slug,
          image: formData.image || null,
          amazon_link: formData.amazon_link || null,
          flipkart_link: formData.flipkart_link || null,
          processed: formData.processed,
        })
        .eq("id", editingProduct.id);

      if (productError) throw productError;

      const amazonPrice = parseFloat(formData.amazon_price);
      const flipkartPrice = parseFloat(formData.flipkart_price);
      const originalPrice = parseFloat(formData.original_price);

      if (!isNaN(amazonPrice) || !isNaN(flipkartPrice) || !isNaN(originalPrice)) {
        const { error: priceError } = await supabase
          .from("product_price_history")
          .insert({
            product_id: editingProduct.id,
            amazon_price: isNaN(amazonPrice) ? null : amazonPrice,
            flipkart_price: isNaN(flipkartPrice) ? null : flipkartPrice,
            original_price: isNaN(originalPrice) ? null : originalPrice,
          });
        
        if (priceError) console.error("Error updating price history:", priceError);
      }

      toast({
        title: "Success",
        description: "Product and prices updated successfully",
      });

      setIsEditDialogOpen(false);
      setEditingProduct(null);
      await fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.slug.trim() || !formData.image.trim()) {
      toast({
        title: "Error",
        description: "Name, slug, and image are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          name: formData.name,
          slug: formData.slug,
          image: formData.image || null,
          amazon_link: formData.amazon_link || null,
          flipkart_link: formData.flipkart_link || null,
          processed: formData.processed,
        })
        .select()
        .single();

      if (productError) throw productError;

      if (newProduct) {
        const amazonPrice = parseFloat(formData.amazon_price);
        const flipkartPrice = parseFloat(formData.flipkart_price);
        const originalPrice = parseFloat(formData.original_price);

        if (!isNaN(amazonPrice) || !isNaN(flipkartPrice) || !isNaN(originalPrice)) {
           await supabase
            .from("product_price_history")
            .insert({
              product_id: newProduct.id,
              amazon_price: isNaN(amazonPrice) ? null : amazonPrice,
              flipkart_price: isNaN(flipkartPrice) ? null : flipkartPrice,
              original_price: isNaN(originalPrice) ? null : originalPrice,
            });
        }
      }

      toast({
        title: "Success",
        description: "Product added successfully",
      });

      setIsAddDialogOpen(false);
      setFormData({ 
        name: "", slug: "", image: "", amazon_link: "", flipkart_link: "", processed: false,
        amazon_price: "", flipkart_price: "", original_price: ""
      });
      await fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add product",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title="Products Management" canonical="/products" />
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-2xl">Products Management</CardTitle>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Product</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="add-name">Name *</Label>
                          <Input id="add-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Product name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="add-slug">Slug *</Label>
                          <Input id="add-slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="product-slug" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="add-image">Image URL *</Label>
                        <Input id="add-image" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} placeholder="https://example.com/image.jpg" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="add-amazon">Amazon Link</Label>
                          <Input id="add-amazon" value={formData.amazon_link} onChange={(e) => setFormData({ ...formData, amazon_link: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="add-flipkart">Flipkart Link</Label>
                          <Input id="add-flipkart" value={formData.flipkart_link} onChange={(e) => setFormData({ ...formData, flipkart_link: e.target.value })} />
                        </div>
                      </div>
                      
                      {/* Price Section */}
                      <div className="space-y-4 bg-muted/20 p-4 rounded-lg border">
                        <div className="space-y-2">
                          <Label htmlFor="add-original-price" className="text-muted-foreground font-semibold">MRP / Original Price (₹)</Label>
                          <Input id="add-original-price" type="number" value={formData.original_price} onChange={(e) => setFormData({ ...formData, original_price: e.target.value })} placeholder="e.g. 1999" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="add-amazon-price" className="text-orange-600 font-semibold">Amazon Price (₹)</Label>
                            <Input id="add-amazon-price" type="number" value={formData.amazon_price} onChange={(e) => setFormData({ ...formData, amazon_price: e.target.value })} placeholder="e.g. 999" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="add-flipkart-price" className="text-blue-600 font-semibold">Flipkart Price (₹)</Label>
                            <Input id="add-flipkart-price" type="number" value={formData.flipkart_price} onChange={(e) => setFormData({ ...formData, flipkart_price: e.target.value })} placeholder="e.g. 899" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 border p-3 rounded-md">
                        <Switch id="add-processed" checked={formData.processed} onCheckedChange={(checked) => setFormData({ ...formData, processed: checked })} />
                        <Label htmlFor="add-processed">Mark as Processed</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleAdd}>Add Product</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[8%]">Image</TableHead>
                        <TableHead className="w-[25%]">Name</TableHead>
                        <TableHead className="w-[12%] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('processed')}>
                          <div className="flex items-center gap-2">Processed <ArrowUpDown className="h-4 w-4" /></div>
                        </TableHead>
                        <TableHead className="w-[15%] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('created_at')}>
                          <div className="flex items-center gap-2">Created <ArrowUpDown className="h-4 w-4" /></div>
                        </TableHead>
                        <TableHead className="w-[10%] text-center">Links</TableHead>
                        <TableHead className="w-[15%] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentProducts.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8">No products found</TableCell></TableRow>
                      ) : (
                        currentProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              {product.image ? <img src={product.image} className="h-10 w-10 object-cover rounded" /> : <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-xs">No img</div>}
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{product.name}</span>
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{product.slug}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {product.processed ? <Badge className="bg-green-600"><Check className="w-3 h-3 mr-1" /> Done</Badge> : <Badge variant="secondary"><X className="w-3 h-3 mr-1" /> Pending</Badge>}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(product.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex gap-1 justify-center">
                                {product.amazon_link && <span className="text-xs font-bold text-orange-600">Amz</span>}
                                {product.flipkart_link && <span className="text-xs font-bold text-blue-600">Flp</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(product)} className="h-8 w-8 p-0"><Pencil className="h-4 w-4" /></Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id, product.name)} className="h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug">Slug *</Label>
                <Input id="edit-slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-image">Image URL</Label>
              <Input id="edit-image" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amazon">Amazon Link</Label>
                <Input id="edit-amazon" value={formData.amazon_link} onChange={(e) => setFormData({ ...formData, amazon_link: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-flipkart">Flipkart Link</Label>
                <Input id="edit-flipkart" value={formData.flipkart_link} onChange={(e) => setFormData({ ...formData, flipkart_link: e.target.value })} />
              </div>
            </div>

            <div className="space-y-4 bg-muted/20 p-4 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="edit-original-price" className="text-muted-foreground font-semibold flex justify-between">
                    MRP / Original Price (₹) 
                    {priceLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  </Label>
                  <Input id="edit-original-price" type="number" value={formData.original_price} onChange={(e) => setFormData({ ...formData, original_price: e.target.value })} placeholder="Current MRP" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-amazon-price" className="text-orange-600 font-semibold">Amazon Price (₹)</Label>
                      <Input id="edit-amazon-price" type="number" value={formData.amazon_price} onChange={(e) => setFormData({ ...formData, amazon_price: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-flipkart-price" className="text-blue-600 font-semibold">Flipkart Price (₹)</Label>
                      <Input id="edit-flipkart-price" type="number" value={formData.flipkart_price} onChange={(e) => setFormData({ ...formData, flipkart_price: e.target.value })} />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">Updating these values will add a new entry to the price history timeline.</p>
            </div>
            
            <div className="flex items-center space-x-2 border p-3 rounded-md">
              <Switch id="edit-processed" checked={formData.processed} onCheckedChange={(checked) => setFormData({ ...formData, processed: checked })} />
              <Label htmlFor="edit-processed">Mark as Processed</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate}>Update Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Products;
