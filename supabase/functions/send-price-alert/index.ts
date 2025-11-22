import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriceAlertRequest {
  userId: string;
  productName: string;
  targetPrice: number;
  currentPrice: number;
  productUrl: string;
  userEmail: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If called with a payload, send specific alert
    if (req.method === "POST") {
      const payload: PriceAlertRequest = await req.json();
      
      const savings = payload.targetPrice - payload.currentPrice;
      const savingsPercent = Math.round((savings / payload.targetPrice) * 100);

      const { error } = await resend.emails.send({
        from: "ApniList Price Alerts <alerts@resend.dev>",
        to: [payload.userEmail],
        subject: `🔥 Price Alert: ${payload.productName} is at your target price!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔥 Price Alert!</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">${payload.productName}</h2>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">CURRENT PRICE</p>
                <p style="margin: 0; font-size: 36px; font-weight: bold; color: #4caf50;">₹${payload.currentPrice.toLocaleString('en-IN')}</p>
              </div>

              <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
                <p style="margin: 0; color: #e65100; font-size: 16px; font-weight: bold;">
                  ✨ You save ₹${savings.toLocaleString('en-IN')} (${savingsPercent}% off your target price!)
                </p>
              </div>

              <p style="color: #666; line-height: 1.6;">
                The price has dropped to your target price of <strong>₹${payload.targetPrice.toLocaleString('en-IN')}</strong>! 
                This is the perfect time to buy!
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${payload.productUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 40px; 
                          text-decoration: none; 
                          border-radius: 25px; 
                          font-weight: bold; 
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                  Buy Now 🛒
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />

              <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                You're receiving this because you set a price alert on ApniList.<br/>
                Manage your alerts in your <a href="${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}/profile" style="color: #667eea;">profile settings</a>.
              </p>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error("Error sending email:", error);
        throw error;
      }

      console.log(`Price alert sent to ${payload.userEmail} for ${payload.productName}`);

      return new Response(
        JSON.stringify({ success: true, message: "Alert sent successfully" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // If called without payload (e.g., via cron), check all alerts
    console.log("Checking all price alerts...");

    // Get all enabled price alerts with user and product info
    const { data: alerts, error: alertsError } = await supabase
      .from("price_alerts")
      .select(`
        id,
        target_price,
        user_id,
        last_notified_at,
        products (
          id,
          name,
          amazon_link,
          flipkart_link
        ),
        profiles!price_alerts_user_id_fkey (
          email,
          price_drop_alerts,
          email_notifications
        )
      `)
      .eq("alert_enabled", true);

    if (alertsError) throw alertsError;

    console.log(`Found ${alerts?.length || 0} active alerts`);

    let emailsSent = 0;

    for (const alert of alerts || []) {
      const profile = Array.isArray(alert.profiles) ? alert.profiles[0] : alert.profiles;
      const product = Array.isArray(alert.products) ? alert.products[0] : alert.products;

      // Check if user has email notifications enabled
      if (!profile?.email_notifications || !profile?.price_drop_alerts) {
        continue;
      }

      // Get latest price for this product
      const { data: priceHistory, error: priceError } = await supabase
        .from("product_price_history")
        .select("amazon_price, flipkart_price, created_at")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (priceError || !priceHistory) continue;

      const currentPrices = [
        priceHistory.amazon_price,
        priceHistory.flipkart_price,
      ].filter((p) => p && p > 0);

      if (currentPrices.length === 0) continue;

      const currentPrice = Math.min(...currentPrices);

      // Check if price has met or dropped below target
      if (currentPrice <= alert.target_price) {
        // Check if we already notified recently (within 24 hours)
        if (alert.last_notified_at) {
          const lastNotified = new Date(alert.last_notified_at);
          const hoursSinceLastNotification =
            (Date.now() - lastNotified.getTime()) / (1000 * 60 * 60);

          if (hoursSinceLastNotification < 24) {
            console.log(`Skipping alert ${alert.id} - notified recently`);
            continue;
          }
        }

        // Determine the best store link
        const cheapestStore =
          priceHistory.amazon_price &&
          priceHistory.flipkart_price &&
          priceHistory.amazon_price < priceHistory.flipkart_price
            ? "amazon"
            : "flipkart";

        const productUrl =
          cheapestStore === "amazon"
            ? product.amazon_link
            : product.flipkart_link;

        // Send email
        const { error: emailError } = await resend.emails.send({
          from: "ApniList Price Alerts <alerts@resend.dev>",
          to: [profile.email],
          subject: `🔥 Price Alert: ${product.name} is at your target price!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🔥 Price Alert!</h1>
              </div>
              
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">${product.name}</h2>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">CURRENT PRICE</p>
                  <p style="margin: 0; font-size: 36px; font-weight: bold; color: #4caf50;">₹${currentPrice.toLocaleString('en-IN')}</p>
                </div>

                <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
                  <p style="margin: 0; color: #e65100; font-size: 16px; font-weight: bold;">
                    ✨ Your target price of ₹${alert.target_price.toLocaleString('en-IN')} has been reached!
                  </p>
                </div>

                <p style="color: #666; line-height: 1.6;">
                  The price has dropped to or below your target! This is the perfect time to buy!
                </p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${productUrl || '#'}" 
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            color: white; 
                            padding: 15px 40px; 
                            text-decoration: none; 
                            border-radius: 25px; 
                            font-weight: bold; 
                            display: inline-block;
                            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                    Buy Now 🛒
                  </a>
                </div>

                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />

                <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                  You're receiving this because you set a price alert on ApniList.<br/>
                  Manage your alerts in your profile settings.
                </p>
              </div>
            </div>
          `,
        });

        if (!emailError) {
          // Update last_notified_at
          await supabase
            .from("price_alerts")
            .update({ last_notified_at: new Date().toISOString() })
            .eq("id", alert.id);

          emailsSent++;
          console.log(`Alert sent for product: ${product.name}`);
        } else {
          console.error(`Error sending email for alert ${alert.id}:`, emailError);
        }
      }
    }

    console.log(`Price alert check complete. Sent ${emailsSent} emails.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Checked alerts and sent ${emailsSent} notifications` 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-price-alert function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});