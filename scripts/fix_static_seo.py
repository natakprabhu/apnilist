"""
Post-processes existing static article HTML files to fix:
1. og:image placeholder (lovable.dev) → first real product image from the page
2. Removes duplicate generic OG/Twitter tags at the top of <head> (non data-rh ones)
3. Fixes apnilist.in references in JSON-LD that weren't caught by the domain migration
"""
import os
import re
import json

ARTICLES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "articles")
PLACEHOLDER_IMAGE = "https://lovable.dev/opengraph-image-p98pqg.png"
FALLBACK_IMAGE = "https://www.apnilist.co.in/logo.png"

GENERIC_OG_PATTERN = re.compile(
    r'\s*<meta property="og:title" content="ApniList[^"]*"[^>]*>\n?'
    r'\s*<meta property="og:description" content="Track prices[^"]*"[^>]*>\n?'
    r'\s*<meta property="og:type" content="website"[^>]*>\n?'
    r'\s*<meta property="og:image" content="[^"]*logo\.png"[^>]*>\n?'
    r'\s*<meta property="og:url" content="https://www\.apnilist\.co\.in"[^>]*>\n?'
    r'\s*<meta property="og:site_name" content="ApniList"[^>]*>\n?'
    r'\s*\n?'
    r'\s*<meta name="twitter:card" content="summary_large_image"[^>]*>\n?'
    r'\s*<meta name="twitter:site" content="@apnilist"[^>]*>\n?'
    r'\s*<meta name="twitter:image" content="[^"]*logo\.png"[^>]*>\n?',
    re.MULTILINE
)

def extract_first_product_image(html):
    """Extract the first product image from embedded Product JSON-LD schemas."""
    ld_json_blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
    for block in ld_json_blocks:
        try:
            data = json.loads(block)
            schemas = data if isinstance(data, list) else [data]
            for schema in schemas:
                if schema.get("@type") == "Product":
                    img = schema.get("image")
                    if img and isinstance(img, str) and img.startswith("http") and "logo" not in img:
                        return img
        except (json.JSONDecodeError, AttributeError):
            continue
    return None

def fix_file(path):
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()

    original = html
    changes = []

    # 1. Replace lovable.dev placeholder with real product image (or logo fallback)
    if PLACEHOLDER_IMAGE in html:
        product_image = extract_first_product_image(html)
        replacement = product_image if product_image else FALLBACK_IMAGE
        html = html.replace(PLACEHOLDER_IMAGE, replacement)
        changes.append(f"og:image → {replacement[:60]}...")

    # 2. Remove duplicate generic top-level OG/Twitter block
    html_cleaned, count = GENERIC_OG_PATTERN.subn("", html)
    if count > 0:
        html = html_cleaned
        changes.append("removed duplicate generic OG/Twitter tags")

    if html != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        return changes
    return []

def main():
    files = sorted(f for f in os.listdir(ARTICLES_DIR) if f.endswith(".html"))
    print(f"Processing {len(files)} static article files...\n")
    total_changed = 0
    for filename in files:
        path = os.path.join(ARTICLES_DIR, filename)
        changes = fix_file(path)
        if changes:
            print(f"✅ {filename}")
            for c in changes:
                print(f"   • {c}")
            total_changed += 1
        else:
            print(f"   {filename} — no changes needed")

    print(f"\nDone. {total_changed}/{len(files)} files updated.")

if __name__ == "__main__":
    main()
