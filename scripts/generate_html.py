import os
import time
import requests
import traceback
import xml.etree.ElementTree as ET
from urllib.parse import urlparse
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# NEW: Import Supabase (Requires: pip install supabase)
try:
    from supabase import create_client, Client
except ImportError:
    print("⚠️ Supabase library not found. Run: pip install supabase")
    create_client = None

# --- CONFIGURATION ---
BASE_URL = "https://www.apnilist.co.in" 

# 1. SUPABASE CREDENTIALS (GET THESE FROM YOUR DASHBOARD)
# Replace these with your actual details
SUPABASE_URL = "https://alyidbbieegylgvdqmis.supabase.co" 
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseWlkYmJpZWVneWxndmRxbWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTg2MzIsImV4cCI6MjA3NTczNDYzMn0.uCnn2HpE9_peSiLAyTmpoKWRKMPTPs-bE_sR3Mo5c24"
SUPABASE_TABLE = "articles" # Change if your table is named differently (e.g., 'posts')

# 2. INCREMENTAL BUILD SETTINGS
# If True: Skips articles that already have an .html file in the folder
# If False: Re-generates ALL articles (Slower, but updates content)
SKIP_EXISTING = True 

# 3. MANUAL FALLBACK LIST
MANUAL_SLUGS = [
    "71-juicer-06-12-2025",
    "6-air-purifier-22-11-2025",
]

# Output directories
OUTPUT_DIR = os.path.join(os.getcwd(), "public", "static_html_cache")
SITEMAP_OUTPUT_PATH = os.path.join(os.getcwd(), "public", "sitemap.xml")

def get_supabase_slugs():
    """Fetches all article slugs directly from Supabase DB."""
    if not create_client or "YOUR_SUPABASE" in SUPABASE_URL:
        print("⚠️ Supabase not configured. Skipping DB fetch.")
        return []

    print("🔌 Connecting to Supabase...")
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        # Fetch only the 'slug' column to be efficient
        response = supabase.table(SUPABASE_TABLE).select("slug").execute()
        
        # Extract slugs from response data
        slugs = [item['slug'] for item in response.data if item.get('slug')]
        print(f"✅ Found {len(slugs)} articles in Supabase.")
        return slugs
    except Exception as e:
        print(f"❌ Supabase Error: {e}")
        return []

def generate_sitemap_xml(slugs):
    """Generates a sitemap.xml file in the public directory."""
    print(f"🗺️  Generating sitemap.xml at: {SITEMAP_OUTPUT_PATH}")
    
    xmlns = "http://www.sitemaps.org/schemas/sitemap/0.9"
    urlset = ET.Element("urlset", xmlns=xmlns)
    
    # Add Homepage
    home_url = ET.SubElement(urlset, "url")
    ET.SubElement(home_url, "loc").text = "https://www.apnilist.co.in/"
    ET.SubElement(home_url, "changefreq").text = "daily"
    ET.SubElement(home_url, "priority").text = "1.0"
    
    # Add Articles
    for slug in slugs:
        url_elem = ET.SubElement(urlset, "url")
        loc = f"https://www.apnilist.co.in/articles/{slug}"
        today = datetime.now().strftime("%Y-%m-%d")
        
        ET.SubElement(url_elem, "loc").text = loc
        ET.SubElement(url_elem, "lastmod").text = today
        ET.SubElement(url_elem, "changefreq").text = "weekly"
        ET.SubElement(url_elem, "priority").text = "0.8"
        
    try:
        if hasattr(ET, "indent"):
            ET.indent(urlset, space="  ", level=0)
        tree = ET.ElementTree(urlset)
        tree.write(SITEMAP_OUTPUT_PATH, encoding="utf-8", xml_declaration=True)
        print("✅ Sitemap.xml updated successfully.")
    except Exception as e:
        print(f"❌ Failed to write sitemap.xml: {e}")

def setup_driver():
    print("🔧 Setting up Browser (Visible Mode)...")
    chrome_options = Options()
    # chrome_options.add_argument("--headless") 
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--ignore-certificate-errors")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    return driver

def generate_static_file(driver, slug):
    # INCREMENTAL CHECK
    output_path = os.path.join(OUTPUT_DIR, f"{slug}.html")
    if SKIP_EXISTING and os.path.exists(output_path):
        print(f"⏩ Skipping existing: {slug}")
        return

    url = f"{BASE_URL}/articles/{slug}"
    
    try:
        print(f"🌍 Processing: {url}")
        driver.get(url)

        # Wait for H1 to ensure React loaded content
        element = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.TAG_NAME, "h1"))
        )
        
        # Optional: Print found title
        print(f"   Found Title: {element.text}")
        
        time.sleep(5) 

        full_html = driver.page_source

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(full_html)
            
        print(f"✅ Generated: {output_path}")

    except Exception as e:
        print(f"❌ Failed to generate {slug}: {e}")
        # traceback.print_exc() 

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    # 1. Collect Slugs (Manual + Supabase)
    slugs = list(MANUAL_SLUGS)
    
    db_slugs = get_supabase_slugs()
    for s in db_slugs:
        if s not in slugs:
            slugs.append(s)
    
    if not slugs:
        print("⚠️ No articles found. Check Supabase credentials or Manual List.")
        return

    print(f"📋 Total Articles: {len(slugs)}")
    print(f"⚙️  Incremental Mode: {'ON' if SKIP_EXISTING else 'OFF'}")

    # 2. Start Browser
    driver = setup_driver()
    
    # 3. Generate HTML
    try:
        for slug in slugs:
            generate_static_file(driver, slug)
    finally:
        driver.quit()
        
    # 4. Update Sitemap (Always update this to ensure new links are present)
    generate_sitemap_xml(slugs)
    print("\n✨ Process Complete.")

if __name__ == "__main__":
    main()