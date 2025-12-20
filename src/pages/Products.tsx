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
    original_price: "", // Added Field
  });

  useEffect(() => {
    if (authLoading) return;
    const checkAdmin = async () => {
      if (!user) { navigate("/auth"); return; }
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .single();

        if (error || !data) {
          toast({ title: "Access Denied", description: "Admin privileges required", variant: "destructive" });
          navigate("/");
          return;
        }
        setIsAdmin(true);
        await fetchProducts();
      } catch (error) { navigate("/"); } finally { setLoading(false); }
    };
    checkAdmin();
  }, [user, authLoading, navigate, toast]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to fetch products", variant: "destructive" });
    }
  };

  useEffect(() => {
    const filtered = products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchQuery, products]);

  const handleSort = (key: keyof Product) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    if (a[key]! < b[key]!) return direction === 'asc' ? -1 : 1;
    if (a[key]! > b[key]!) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const currentProducts = sortedProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE);

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setPriceLoading(true);
    setFormData({
      name: product.name,
      slug: product.slug,
      image: product.image || "",
      amazon_link: product.amazon_link || "",
      flipkart_link: product.flipkart_link || "",
      processed: product.processed || false,
      amazon_price: "",
      flipkart_price: "",
      original_price: "",
    });
    setIsEditDialogOpen(true);

    try {
      const { data: priceHistory } = await supabase
        .from("product_price_history")
        .select("amazon_price, flipkart_price, original_price")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (priceHistory) {
        setFormData(prev => ({
          ...prev,
          amazon_price: priceHistory.amazon_price?.toString() || "",
          flipkart_price: priceHistory.flipkart_price?.toString() || "",
          original_price: priceHistory.original_price?.toString() || ""
        }));
      }
    } catch (err) { console.error(err); } finally { setPriceLoading(false); }
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;
    try {
      const { error: pErr } = await supabase.from("products").update({
        name: formData.name, slug: formData.slug, image: formData.image,
        amazon_link: formData.amazon_link, flipkart_link: formData.flipkart_link, processed: formData.processed
      }).eq("id", editingProduct.id);
      if (pErr) throw pErr;

      const amz = parseFloat(formData.amazon_price);
      const flp = parseFloat(formData.flipkart_price);
      const org = parseFloat(formData.original_price);

      if (!isNaN(amz) || !isNaN(flp) || !isNaN(org)) {
        await supabase.from("product_price_history").insert({
          product_id: editingProduct.id,
          amazon_price: isNaN(amz) ? null : amz,
          flipkart_price: isNaN(flp) ? null : flp,
          original_price: isNaN(org) ? null : org,
        });
      }
      toast({ title: "Success", description: "Product updated" });
      setIsEditDialogOpen(false);
      fetchProducts();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  const handleAdd = async () => {
    try {
      const { data: newProduct, error: pErr } = await supabase.from("products").insert({
        name: formData.name, slug: formData.slug, image: formData.image,
        amazon_link: formData.amazon_link, flipkart_link: formData.flipkart_link, processed: formData.processed
      }).select().single();
      if (pErr) throw pErr;

      const amz = parseFloat(formData.amazon_price);
      const flp = parseFloat(formData.flipkart_price);
      const org = parseFloat(formData.original_price);

      if (newProduct && (!isNaN(amz) || !isNaN(flp) || !isNaN(org))) {
        await supabase.from("product_price_history").insert({
          product_id: newProduct.id,
          amazon_price: isNaN(amz) ? null : amz,
          flipkart_price: isNaN(flp) ? null : flp,
          original_price: isNaN(org) ? null : org,
        });
      }
      toast({ title: "Success", description: "Product added" });
      setIsAddDialogOpen(false);
      setFormData({ name: "", slug: "", image: "", amazon_link: "", flipkart_link: "", processed: false, amazon_price: "", flipkart_price: "", original_price: "" });
      fetchProducts();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) { toast({ title: "Deleted" }); fetchProducts(); }
  };

  const PriceFields = ({ mode }: { mode: 'add' | 'edit' }) => (
    <div className="space-y-4">
      <div className="space-y-2 bg-muted/30 p-4 rounded-lg border">
        <Label htmlFor={`${mode}-original-price`} className="text-muted-foreground font-semibold flex justify-between">
          MRP / Original Price (₹)
          {priceLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        </Label>
        <Input
          id={`${mode}-original-price`}
          type="number"
          value={formData.original_price}
          onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
          placeholder="e.g. 1999"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg border">
        <div className="space-y-2">
          <Label className="text-orange-600 font-semibold">Amazon Price (₹)</Label>
          <Input type="number" value={formData.amazon_price} onChange={(e) => setFormData({ ...formData, amazon_price: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label className="text-blue-600 font-semibold">Flipkart Price (₹)</Label>
          <Input type="number" value={formData.flipkart_price} onChange={(e) => setFormData({ ...formData, flipkart_price: e.target.value })} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title="Products Management" canonical="/products" />
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl">Products Management</CardTitle>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Product</Button></DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Name *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Slug *</Label><Input value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} /></div>
                    </div>
                    <div className="space-y-2"><Label>Image URL *</Label><Input value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Amazon Link</Label><Input value={formData.amazon_link} onChange={e => setFormData({...formData, amazon_link: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Flipkart Link</Label><Input value={formData.flipkart_link} onChange={e => setFormData({...formData, flipkart_link: e.target.value})} /></div>
                    </div>
                    <PriceFields mode="add" />
                    <div className="flex items-center space-x-2 border p-3 rounded-md">
                      <Switch checked={formData.processed} onCheckedChange={c => setFormData({...formData, processed: c})} />
                      <Label>Mark as Processed</Label>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={handleAdd}>Add Product</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[8%]">Image</TableHead>
                        <TableHead className="w-[30%]">Name</TableHead>
                        <TableHead onClick={() => handleSort('processed')} className="cursor-pointer">Processed <ArrowUpDown className="inline h-3 w-3" /></TableHead>
                        <TableHead onClick={() => handleSort('created_at')} className="cursor-pointer">Created <ArrowUpDown className="inline h-3 w-3" /></TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.image ? <img src={product.image} className="h-10 w-10 object-cover rounded" /> : 'No Img'}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{product.name}</span>
                              <span className="text-xs text-muted-foreground">{product.slug}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.processed ? 
                              <Badge className="bg-green-600"><Check className="w-3 h-3 mr-1" /> Done</Badge> : 
                              <Badge variant="secondary"><X className="w-3 h-3 mr-1" /> Pending</Badge>}
                          </TableCell>
                          <TableCell className="text-sm">{new Date(product.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(product)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id, product.name)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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
              <div className="space-y-2"><Label>Name *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div className="space-y-2"><Label>Slug *</Label><Input value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Image URL</Label><Input value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} /></div>
            <PriceFields mode="edit" />
            <div className="flex items-center space-x-2 border p-3 rounded-md">
              <Switch checked={formData.processed} onCheckedChange={c => setFormData({...formData, processed: c})} />
              <Label>Mark as Processed</Label>
            </div>
          </div>
          <DialogFooter><Button onClick={handleUpdate}>Update Product</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
};

export default Products;
