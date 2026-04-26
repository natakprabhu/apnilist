"""
Phase 3: Migrates dated article URLs to clean, keyword-rich slugs.
For each article:
  1. Creates a new HTML file at the clean slug with updated canonical/og:url
  2. Adds 301 redirects (dated → clean) to vercel.json
  3. Updates sitemap.xml to use only the clean URLs
"""
import os
import re
import json
import xml.etree.ElementTree as ET
from datetime import datetime

ARTICLES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "articles")
VERCEL_JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "vercel.json")
SITEMAP_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "sitemap.xml")
BASE_URL = "https://www.apnilist.co.in"

SLUG_MAPPING = {
    "air-purifier-19-12-2025":                  "best-hepa-air-purifier",
    "air-purifier-20-12-2025":                  "best-car-air-purifier",
    "airfrier-25-02-2026":                      "best-air-fryer",
    "alkaline-water-purifier-29-01-2026":       "best-alkaline-water-purifier",
    "chimney-19-12-2025":                       "best-auto-clean-chimney",
    "chimney-20-12-2025":                       "best-filterless-chimney",
    "coffee-maker-19-12-2025":                  "best-espresso-machine",
    "coffee-maker-20-12-2025":                  "best-bean-to-cup-coffee-maker",
    "dishwasher-06-02-2026":                    "best-dishwasher",
    "foldable-mobile-20-12-2025":               "best-foldable-phone",
    "juicer-19-12-2025":                        "best-cold-press-juicer",
    "juicer-20-12-2025":                        "best-centrifugal-juicer",
    "laptop-19-12-2025":                        "best-gaming-laptop",
    "laptop-20-12-2025":                        "best-ultrabook-laptop",
    "laptop-under-50k-21-12-2025":              "best-laptop-under-40000",
    "lipstick-06-02-2026":                      "best-matte-lipstick",
    "microwave-19-12-2025":                     "best-convection-microwave",
    "microwave-20-12-2025":                     "best-microwave-oven",
    "mobile-19-12-2025":                        "best-camera-phone",
    "mobile-20-12-2025":                        "best-gaming-phone",
    "projectors-21-12-2025":                    "best-smart-projector",
    "refrigerator-19-12-2025":                  "best-convertible-refrigerator",
    "refrigerator-20-12-2025":                  "best-side-by-side-refrigerator",
    "semi-autonatic-washing-machine-21-12-2025":"best-semi-automatic-washing-machine",
    "smart-washing-machine-21-12-2025":         "best-smart-washing-machine",
    "tv-19-12-2025":                            "best-oled-qled-tv",
    "tv-20-12-2025":                            "best-budget-4k-tv",
    "vaccum-cleaner-19-12-2025":                "best-robot-vacuum-cleaner",
    "vaccum-cleaner-20-12-2025":                "best-cordless-vacuum-cleaner",
    "vaccum-cleaner-wet-dry-20-12-2025":        "best-wet-dry-vacuum-cleaner",
    "washing-machine-20-12-2025":               "best-front-load-washing-machine",
    "washing-machine-21-12-2025":               "best-fully-automatic-washing-machine",
    "watch-07-02-2026":                         "best-automatic-watch",
    "water-purifier-29-01-2026":                "best-water-purifier-under-15000",
}


def update_canonical_in_html(html, old_slug, new_slug):
    """Replace all canonical/og:url references to the old slug with the new slug."""
    old_url = f"{BASE_URL}/articles/{old_slug}"
    new_url = f"{BASE_URL}/articles/{new_slug}"
    return html.replace(old_url, new_url)


def create_clean_article(old_slug, new_slug):
    src = os.path.join(ARTICLES_DIR, f"{old_slug}.html")
    dst = os.path.join(ARTICLES_DIR, f"{new_slug}.html")

    if not os.path.exists(src):
        print(f"   ⚠ Source not found: {src}")
        return False

    if os.path.exists(dst):
        print(f"   ℹ Already exists: {new_slug}.html — skipping copy")
        return True

    with open(src, "r", encoding="utf-8") as f:
        html = f.read()

    html = update_canonical_in_html(html, old_slug, new_slug)

    with open(dst, "w", encoding="utf-8") as f:
        f.write(html)

    return True


def update_vercel_json(slug_map):
    with open(VERCEL_JSON_PATH, "r") as f:
        config = json.load(f)

    existing_redirects = config.get("redirects", [])
    existing_sources = {r["source"] for r in existing_redirects}

    new_redirects = []
    for old_slug, new_slug in slug_map.items():
        source = f"/articles/{old_slug}"
        destination = f"/articles/{new_slug}"
        if source not in existing_sources:
            new_redirects.append({
                "source": source,
                "destination": destination,
                "permanent": True
            })

    # Insert article slug redirects before domain redirects
    config["redirects"] = new_redirects + existing_redirects

    with open(VERCEL_JSON_PATH, "w") as f:
        json.dump(config, f, indent=2)

    return len(new_redirects)


def update_sitemap(slug_map):
    xmlns = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ET.register_namespace("", xmlns)

    tree = ET.parse(SITEMAP_PATH)
    root = tree.getroot()
    ns = {"ns": xmlns}
    today = datetime.now().strftime("%Y-%m-%d")

    # Build set of clean slugs already in sitemap
    existing_locs = set()
    for url_el in root.findall("ns:url", ns):
        loc_el = url_el.find("ns:loc", ns)
        if loc_el is not None:
            existing_locs.add(loc_el.text)

    added = 0
    removed = 0

    # Remove dated URL entries that have a clean replacement
    dated_locs = {f"{BASE_URL}/articles/{old}" for old in slug_map}
    for url_el in list(root.findall("ns:url", ns)):
        loc_el = url_el.find("ns:loc", ns)
        if loc_el is not None and loc_el.text in dated_locs:
            root.remove(url_el)
            removed += 1

    # Add clean URL entries
    for old_slug, new_slug in slug_map.items():
        clean_loc = f"{BASE_URL}/articles/{new_slug}"
        if clean_loc not in existing_locs:
            url_el = ET.SubElement(root, "url")
            ET.SubElement(url_el, "loc").text = clean_loc
            ET.SubElement(url_el, "lastmod").text = today
            ET.SubElement(url_el, "changefreq").text = "monthly"
            ET.SubElement(url_el, "priority").text = "0.8"
            added += 1

    if hasattr(ET, "indent"):
        ET.indent(root, space="  ", level=0)

    tree.write(SITEMAP_PATH, encoding="utf-8", xml_declaration=True)
    return added, removed


def main():
    print(f"Migrating {len(SLUG_MAPPING)} articles to clean URLs...\n")

    # Step 1: Create clean HTML files
    print("── Step 1: Creating clean article files ──")
    success = 0
    for old_slug, new_slug in SLUG_MAPPING.items():
        ok = create_clean_article(old_slug, new_slug)
        status = "✅" if ok else "❌"
        print(f"   {status} {old_slug} → {new_slug}")
        if ok:
            success += 1
    print(f"   {success}/{len(SLUG_MAPPING)} files created\n")

    # Step 2: Update vercel.json
    print("── Step 2: Adding 301 redirects to vercel.json ──")
    added_redirects = update_vercel_json(SLUG_MAPPING)
    print(f"   ✅ Added {added_redirects} redirect rules\n")

    # Step 3: Update sitemap.xml
    print("── Step 3: Updating sitemap.xml ──")
    added_urls, removed_urls = update_sitemap(SLUG_MAPPING)
    print(f"   ✅ Removed {removed_urls} dated URLs, added {added_urls} clean URLs\n")

    print("Done! Summary:")
    print(f"  • {success} clean article files created in public/articles/")
    print(f"  • {added_redirects} 301 redirects added to vercel.json")
    print(f"  • sitemap.xml updated ({removed_urls} removed, {added_urls} added)")


if __name__ == "__main__":
    main()
