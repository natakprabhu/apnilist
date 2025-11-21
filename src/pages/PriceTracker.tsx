import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PriceTracker = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <Card>
            <CardHeader>
              <CardTitle>Price Tracker</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Price tracking coming soon...</p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PriceTracker;
