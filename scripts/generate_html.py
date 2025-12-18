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

# --- CONFIGURATION ---
# RECOMMENDATION: Run 'npm start' locally and use http://localhost:5173 (or 3000/8080)
# This prevents Vercel from serving you a broken cached file while you try to generate a new one.
BASE_URL = "https://www.apnilist.co.in" 

# 1. MANUAL LIST: Add new articles here
MANUAL_SLUGS = [
    "71-juicer-06-12-2025",
    "6-air-purifier-22-11-2025",
    "10-best-microwaves-under-10000",
]

# 2. SITEMAP SETTINGS
USE_SITEMAP = False  # Set to True to also fetch from existing sitemap
SITEMAP_URL = "https://alyidbbieegylgvdqmis.supabase.co/storage/v1/object/public/sitemaps/sitemap.xml"

# Output directories
OUTPUT_DIR = os.path.join(os.getcwd(), "public", "static_html_cache")
SITEMAP_OUTPUT_PATH = os.path.join(os.getcwd(), "public", "sitemap.xml")

def get_sitemap_slugs():
    """Fetches the sitemap and extracts all article slugs."""
    if not USE_SITEMAP:
        return []
        
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
        return []

def generate_sitemap_xml(slugs):
    """Generates a sitemap.xml file in the public directory."""
    print(f"🗺️  Generating sitemap.xml at: {SITEMAP_OUTPUT_PATH}")
    
    # XML Namespace
    xmlns = "http://www.sitemaps.org/schemas/sitemap/0.9"
    
    # Root element
    urlset = ET.Element("urlset", xmlns=xmlns)
    
    # Add Homepage (Static)
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
        
    # Write to file
    try:
        # Prettify if possible (Python 3.9+)
        if hasattr(ET, "indent"):
            ET.indent(urlset, space="  ", level=0)
            
        tree = ET.ElementTree(urlset)
        tree.write(SITEMAP_OUTPUT_PATH, encoding="utf-8", xml_declaration=True)
        print("✅ Sitemap.xml updated successfully.")
    except Exception as e:
        print(f"❌ Failed to write sitemap.xml: {e}")
        traceback.print_exc()

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
        element = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.TAG_NAME, "h1"))
        )
        
        # Optional: Print the title found to confirm it's real content
        print(f"   Found Title: {element.text}")
        
        time.sleep(5) # Increased buffer for images/scripts

        full_html = driver.page_source

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(full_html)
            
        print(f"✅ Generated: {output_path}")

    except Exception as e:
        print(f"❌ Failed to generate {slug}: {e}")
        print("\n--- DEBUG: Page Source Dump (First 500 chars) ---")
        try:
            print(driver.page_source[:500])
        except:
            print("Could not read page source.")
        print("-------------------------------------------------\n")
        traceback.print_exc()

def main():
    if not os.path.exists(OUTPUT_DIR):
        print(f"📁 Creating directory: {OUTPUT_DIR}")
        os.makedirs(OUTPUT_DIR)

    # 1. Collect Slugs
    slugs = list(MANUAL_SLUGS) # Start with manual list
    
    # 2. Optionally add sitemap slugs
    sitemap_slugs = get_sitemap_slugs()
    for s in sitemap_slugs:
        if s not in slugs:
            slugs.append(s)
    
    if not slugs:
        print("⚠️ No articles found to generate. Add slugs to MANUAL_SLUGS list.")
        return

    print(f"📋 Generating {len(slugs)} pages...")

    # 3. Start Browser
    driver = setup_driver()
    
    # 4. Loop through them
    try:
        for slug in slugs:
            generate_static_file(driver, slug)
    finally:
        driver.quit()
        
    # 5. Generate Sitemap
    generate_sitemap_xml(slugs)
    print("\n✨ Batch Generation & Sitemap Update Complete.")

if __name__ == "__main__":
    main()