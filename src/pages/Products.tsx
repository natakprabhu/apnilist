import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

type Product = {
  id: string;
  name: string;
  slug: string;
  amazon_link: string | null;
  flipkart_link: string | null;
  image: string | null;
  rating: number | null;
  short_description: string | null;
};

const ITEMS_PER_PAGE = 10;

const Products = () => {
  const { user } = useAuth();
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
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    image: "",
    amazon_link: "",
    flipkart_link: "",
  });

  useEffect(() => {
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
  }, [user, navigate, toast]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, amazon_link, flipkart_link, image, rating, short_description")
        .order("name");

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

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      image: product.image || "",
      amazon_link: product.amazon_link || "",
      flipkart_link: product.flipkart_link || "",
    });
    setIsEditDialogOpen(true);
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
      const { error } = await supabase
        .from("products")
        .update({
          name: formData.name,
          slug: formData.slug,
          image: formData.image || null,
          amazon_link: formData.amazon_link || null,
          flipkart_link: formData.flipkart_link || null,
        })
        .eq("id", editingProduct.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product updated successfully",
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
      const { error } = await supabase
        .from("products")
        .insert({
          name: formData.name,
          slug: formData.slug,
          image: formData.image || null,
          amazon_link: formData.amazon_link || null,
          flipkart_link: formData.flipkart_link || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product added successfully",
      });

      setIsAddDialogOpen(false);
      setFormData({ name: "", slug: "", image: "", amazon_link: "", flipkart_link: "" });
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
          <p className="text-muted-foreground">Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Product</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="add-name">Name *</Label>
                        <Input
                          id="add-name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Product name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-slug">Slug *</Label>
                        <Input
                          id="add-slug"
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                          placeholder="product-slug"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-image">Image URL *</Label>
                        <Input
                          id="add-image"
                          value={formData.image}
                          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-amazon">Amazon Link</Label>
                        <Input
                          id="add-amazon"
                          value={formData.amazon_link}
                          onChange={(e) => setFormData({ ...formData, amazon_link: e.target.value })}
                          placeholder="https://amazon.in/..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-flipkart">Flipkart Link</Label>
                        <Input
                          id="add-flipkart"
                          value={formData.flipkart_link}
                          onChange={(e) => setFormData({ ...formData, flipkart_link: e.target.value })}
                          placeholder="https://flipkart.com/..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
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
                  <Input
                    placeholder="Search products by name or slug..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[10%]">Image</TableHead>
                        <TableHead className="w-[30%]">Name</TableHead>
                        <TableHead className="w-[25%]">Slug</TableHead>
                        <TableHead className="w-[15%] text-center">Links</TableHead>
                        <TableHead className="w-[20%] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            {searchQuery ? "No products found matching your search" : "No products available"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="h-12 w-12 object-cover rounded" />
                              ) : (
                                <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-xs">
                                  No img
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-muted-foreground">{product.slug}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex gap-1 justify-center">
                                {product.amazon_link && (
                                  <span className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                                    A
                                  </span>
                                )}
                                {product.flipkart_link && (
                                  <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                                    F
                                  </span>
                                )}
                                {!product.amazon_link && !product.flipkart_link && (
                                  <span className="text-xs text-muted-foreground">None</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(product)}
                                  className="gap-2"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(product.id, product.name)}
                                  className="gap-2"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of{" "}
                      {filteredProducts.length} products
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="gap-2"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Product name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug *</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="product-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-image">Image URL *</Label>
              <Input
                id="edit-image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amazon">Amazon Link</Label>
              <Input
                id="edit-amazon"
                value={formData.amazon_link}
                onChange={(e) => setFormData({ ...formData, amazon_link: e.target.value })}
                placeholder="https://amazon.in/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-flipkart">Flipkart Link</Label>
              <Input
                id="edit-flipkart"
                value={formData.flipkart_link}
                onChange={(e) => setFormData({ ...formData, flipkart_link: e.target.value })}
                placeholder="https://flipkart.com/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Products;
