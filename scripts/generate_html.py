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

# Supabase Configuration
SUPABASE_URL = "https://alyidbbieegylgvdqmis.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseWlkYmJpZWVneWxndmRxbWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTg2MzIsImV4cCI6MjA3NTczNDYzMn0.uCnn2HpE9_peSiLAyTmpoKWRKMPTPs-bE_sR3Mo5c24"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))

# 2. SITEMAP SETTINGS
USE_SITEMAP = False  # Set to True to also fetch from existing sitemap
SITEMAP_URL = f"{SUPABASE_URL}/storage/v1/object/public/sitemaps/sitemap.xml"

# Output directories
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "articles")
SITEMAP_OUTPUT_PATH = os.path.join(PROJECT_ROOT, "public", "sitemap.xml")


def get_unprocessed_articles_from_supabase():
    """
    Fetches published articles from Supabase that haven't been converted to static HTML yet.
    Returns a list of slugs.
    """
    print("🔍 Fetching unprocessed articles from Supabase...")
    
    try:
        # Query for published articles where static_html_generated is false or null
        url = f"{SUPABASE_URL}/rest/v1/articles"
        params = {
            "select": "slug",
            "or": "(static_html_generated.is.null,static_html_generated.eq.false)",
            "order": "created_at.desc"
        }
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(url, params=params, headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to fetch articles from Supabase: {response.status_code}")
            print(f"   Response: {response.text}")
            return []
        
        articles = response.json()
        slugs = [article["slug"] for article in articles if article.get("slug")]
        
        print(f"✅ Found {len(slugs)} unprocessed articles in Supabase.")
        return slugs
        
    except Exception as e:
        print(f"❌ Error fetching from Supabase: {e}")
        traceback.print_exc()
        return []


# def mark_article_as_processed(slug):
#     """
#     Updates the article in Supabase to mark it as processed (static_html_generated = true).
#     """
#     try:
#         url = f"{SUPABASE_URL}/rest/v1/articles"
#         params = {"slug": f"eq.{slug}"}
#         headers = {
#             "apikey": SUPABASE_ANON_KEY,
#             "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
#             "Content-Type": "application/json",
#             "Prefer": "return=minimal"
#         }
#         data = {"static_html_generated": True}
        
#         response = requests.patch(url, params=params, headers=headers, json=data)
        
#         if response.status_code in [200, 204]:
#             print(f"   ✓ Marked '{slug}' as processed in Supabase")
#             return True
#         else:
#             print(f"   ⚠ Could not mark '{slug}' as processed: {response.status_code}")
#             return False
            
#     except Exception as e:
#         print(f"   ⚠ Error marking '{slug}' as processed: {e}")
#         return False

def mark_article_as_processed(slug):
    """
    Mark article as processed only AFTER HTML is generated.
    """
    try:
        url = f"{SUPABASE_URL}/rest/v1/articles"
        params = {"slug": f"eq.{slug}"}

        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }

        data = {
            "status": "processed",
            "static_html_generated": True
        }

        response = requests.patch(
            url,
            params=params,
            headers=headers,
            json=data
        )

        if response.status_code in [200, 204]:
            print(f"✅ Supabase updated for: {slug}")
            return True
        else:
            print(f"⚠ Failed to update Supabase for {slug}")
            print(response.text)
            return False

    except Exception as e:
        print(f"❌ Supabase update error for {slug}: {e}")
        return False


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
    url = f"{BASE_URL}/draft/{slug}"
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
        return True

    except Exception as e:
        print(f"❌ Failed to generate {slug}: {e}")
        print("\n--- DEBUG: Page Source Dump (First 500 chars) ---")
        try:
            print(driver.page_source[:500])
        except:
            print("Could not read page source.")
        print("-------------------------------------------------\n")
        traceback.print_exc()
        return False


def get_all_processed_slugs():
    """
    Fetches all articles that have been processed (for sitemap generation).
    """
    print("📋 Fetching all processed articles for sitemap...")
    
    try:
        url = f"{SUPABASE_URL}/rest/v1/articles"
        params = {
            "select": "slug",
            "status": "eq.published",
            "static_html_generated": "eq.true",
            "order": "created_at.desc"
        }
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(url, params=params, headers=headers)
        
        if response.status_code != 200:
            print(f"⚠ Could not fetch processed articles: {response.status_code}")
            return []
        
        articles = response.json()
        slugs = [article["slug"] for article in articles if article.get("slug")]
        
        print(f"✅ Found {len(slugs)} processed articles for sitemap.")
        return slugs
        
    except Exception as e:
        print(f"⚠ Error fetching processed articles: {e}")
        return []


def main():
    if not os.path.exists(OUTPUT_DIR):
        print(f"📁 Creating directory: {OUTPUT_DIR}")
        os.makedirs(OUTPUT_DIR)

    # 1. Fetch unprocessed articles from Supabase
    slugs = get_unprocessed_articles_from_supabase()
    
    # 2. Optionally add sitemap slugs (for legacy support)
    if USE_SITEMAP:
        sitemap_slugs = get_sitemap_slugs()
        for s in sitemap_slugs:
            if s not in slugs:
                slugs.append(s)
    
    if not slugs:
        print("✨ No unprocessed articles found. Everything is up to date!")
        
        # Still update sitemap with all processed articles
        all_processed = get_all_processed_slugs()
        if all_processed:
            generate_sitemap_xml(all_processed)
        return

    print(f"📋 Generating {len(slugs)} pages...")

    # 3. Start Browser
    driver = setup_driver()
    
    # 4. Track successfully processed slugs
    processed_slugs = []
    
    # 5. Loop through them
    try:
        for slug in slugs:
            success = generate_static_file(driver, slug)
            if success:
                # Mark as processed in Supabase
                mark_article_as_processed(slug)
                processed_slugs.append(slug)
    finally:
        driver.quit()
        
    # 6. Generate Sitemap with ALL processed articles
    all_processed = get_all_processed_slugs()
    if all_processed:
        generate_sitemap_xml(all_processed)
    
    print(f"\n✨ Batch Generation Complete.")
    print(f"   Processed: {len(processed_slugs)} articles")
    print(f"   Failed: {len(slugs) - len(processed_slugs)} articles")


if __name__ == "__main__":
    main()