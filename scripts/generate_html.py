import os
import time
import requests
import traceback
import xml.etree.ElementTree as ET
from urllib.parse import urlparse
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# --- CONFIGURATION ---
BASE_URL = "http://localhost:8080"
OUTPUT_DIR = os.path.join(os.getcwd(), "public", "articles")

# Your live sitemap URL (from your vercel.json)
SITEMAP_URL = "https://alyidbbieegylgvdqmis.supabase.co/storage/v1/object/public/sitemaps/sitemap.xml"

def get_article_slugs():
    """Fetches the sitemap and extracts all article slugs."""
    print(f"🔍 Fetching Sitemap from: {SITEMAP_URL}")
    try:
        response = requests.get(SITEMAP_URL)
        if response.status_code != 200:
            print("❌ Failed to download sitemap.")
            return []
        
        # Parse XML
        root = ET.fromstring(response.content)
        slugs = []
        
        # XML Namespace for standard sitemaps
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        
        for url in root.findall('ns:url', namespace):
            loc = url.find('ns:loc', namespace).text
            
            # Logic: We only want URLs that contain "/articles/"
            if "/articles/" in loc:
                # Extract the slug (part after the last slash)
                # e.g., https://apnilist.com/articles/my-slug -> my-slug
                parsed_path = urlparse(loc).path
                slug = parsed_path.split("/")[-1]
                
                # Handle cases where URL might end with a slash
                if not slug: 
                    slug = parsed_path.split("/")[-2]
                    
                slugs.append(slug)
                
        print(f"✅ Found {len(slugs)} articles in sitemap.")
        return slugs

    except Exception as e:
        print(f"❌ Error parsing sitemap: {e}")
        # Fallback list if sitemap fails
        return ["71-juicer-06-12-2025"]

def setup_driver():
    print("🔧 Setting up Browser (Visible Mode)...")
    chrome_options = Options()
    # chrome_options.add_argument("--headless") # Disabled for debugging
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    # Added stability options to prevent crashes
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--ignore-certificate-errors")
    
    # Fake being a desktop user to get the full layout
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    return driver

def generate_static_file(driver, slug):
    url = f"{BASE_URL}/articles/{slug}"
    output_path = os.path.join(OUTPUT_DIR, f"{slug}.html")
    
    try:
        print(f"🌍 Processing: {url}")
        driver.get(url)

        # Wait for the H1 title to appear (indicates React loaded)
        # Increased timeout to 30 seconds to handle slow loads
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.TAG_NAME, "h1"))
        )
        
        time.sleep(3) # Short buffer for images

        full_html = driver.page_source

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(full_html)
            
        print(f"✅ Generated: {output_path}")

    except Exception as e:
        print(f"❌ Failed to generate {slug}: {e}")
        # Print full error trace to debug "Message: " errors
        traceback.print_exc()

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    # 1. Get list automatically
    slugs = get_article_slugs()
    
    if not slugs:
        print("No articles found to generate.")
        return

    # 2. Start Browser
    driver = setup_driver()
    
    # 3. Loop through them
    try:
        for slug in slugs:
            generate_static_file(driver, slug)
    finally:
        driver.quit()
        print("\n✨ Batch Generation Complete.")

if __name__ == "__main__":
    main()