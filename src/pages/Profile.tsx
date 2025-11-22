import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Trash2, Bell, TrendingDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PriceAlert {
  id: string;
  target_price: number;
  alert_enabled: boolean;
  product: {
    id: string;
    name: string;
    image: string | null;
  };
}

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [priceDropAlerts, setPriceDropAlerts] = useState(true);
  const [dailyDealsAlerts, setDailyDealsAlerts] = useState(true);
  
  // Price alerts
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadPriceAlerts();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .maybeSingle();

    if (data) {
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setAvatarUrl(data.avatar_url || "");
      setEmailNotifications(data.email_notifications ?? true);
      setPriceDropAlerts(data.price_drop_alerts ?? true);
      setDailyDealsAlerts(data.daily_deals_alerts ?? true);
    }
  };

  const loadPriceAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("price_alerts")
        .select(`
          id,
          target_price,
          alert_enabled,
          product:products (
            id,
            name,
            image
          )
        `)
        .eq("user_id", user?.id);

      if (error) throw error;
      setPriceAlerts(data || []);
    } catch (error) {
      console.error("Error loading price alerts:", error);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user?.id}/avatar.${fileExt}`;

      // Upload image
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user?.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Avatar uploaded successfully!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user?.id);

      if (error) throw error;

      setAvatarUrl("");
      toast.success("Avatar removed successfully!");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone,
        email_notifications: emailNotifications,
        price_drop_alerts: priceDropAlerts,
        daily_deals_alerts: dailyDealsAlerts,
      })
      .eq("id", user?.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
    }

    setSaving(false);
  };

  const handleToggleAlert = async (alertId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("price_alerts")
        .update({ alert_enabled: enabled })
        .eq("id", alertId);

      if (error) throw error;

      setPriceAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, alert_enabled: enabled } : alert
        )
      );
      toast.success(enabled ? "Alert enabled" : "Alert disabled");
    } catch (error) {
      toast.error("Failed to update alert");
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("price_alerts")
        .delete()
        .eq("id", alertId);

      if (error) throw error;

      setPriceAlerts(prev => prev.filter(alert => alert.id !== alertId));
      toast.success("Alert deleted");
    } catch (error) {
      toast.error("Failed to delete alert");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold">My Profile</h1>

            {/* Avatar Section */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Upload your profile picture</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl} alt={fullName} />
                  <AvatarFallback className="text-2xl">
                    {fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={uploading} asChild>
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                      />
                    </label>
                  </Button>
                  {avatarUrl && (
                    <Button variant="outline" size="sm" onClick={handleRemoveAvatar}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Manage how you receive notifications about deals and price drops
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about your tracked products
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="price-drop">Price Drop Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when prices drop on your wishlist items
                    </p>
                  </div>
                  <Switch
                    id="price-drop"
                    checked={priceDropAlerts}
                    onCheckedChange={setPriceDropAlerts}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="daily-deals">Daily Deals Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive daily notifications about the best deals
                    </p>
                  </div>
                  <Switch
                    id="daily-deals"
                    checked={dailyDealsAlerts}
                    onCheckedChange={setDailyDealsAlerts}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Price Alerts Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Price Alerts
                </CardTitle>
                <CardDescription>
                  Manage your product price alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAlerts ? (
                  <p className="text-center text-muted-foreground py-8">Loading alerts...</p>
                ) : priceAlerts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No price alerts set. Go to Price Tracker to add alerts.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Target Price</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {priceAlerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img
                                src={alert.product.image || "/placeholder.svg"}
                                alt={alert.product.name}
                                className="h-12 w-12 object-cover rounded"
                              />
                              <span className="font-medium">{alert.product.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>₹{alert.target_price.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={alert.alert_enabled}
                              onCheckedChange={(checked) => handleToggleAlert(alert.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAlert(alert.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    To change your password, you'll receive a password reset email.
                  </p>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const { error } = await supabase.auth.resetPasswordForEmail(
                        user?.email || ""
                      );
                      if (error) {
                        toast.error("Failed to send reset email");
                      } else {
                        toast.success("Password reset email sent");
                      }
                    }}
                  >
                    Reset Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;