"""
Phase 4: Injects FAQPage JSON-LD schema into existing clean-URL static article files.
Generates 4-5 questions per article from embedded Product schema data.
"""
import os
import re
import json

ARTICLES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "articles")
BASE_URL = "https://www.apnilist.co.in"

def extract_article_data(html):
    """Extract title, description, and product list from embedded JSON-LD."""
    title = ""
    description = ""
    products = []

    title_match = re.search(r'<title>([^<]+)</title>', html)
    if title_match:
        raw = title_match.group(1)
        title = re.sub(r'\s*\|\s*ApniList\s*$', '', raw).strip()

    ld_blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
    for block in ld_blocks:
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue

        if data.get("@type") == "Article":
            description = data.get("description", "")

        if data.get("@type") == "ItemList":
            for item in data.get("itemListElement", []):
                product = item.get("item", {})
                if product.get("@type") == "Product":
                    price = 0
                    offers = product.get("offers", {})
                    if isinstance(offers, dict):
                        price = offers.get("price", 0)
                    products.append({
                        "name": product.get("name", ""),
                        "description": product.get("description", ""),
                        "price": price,
                    })

    return title, description, products


def clean_topic(title):
    """Strip 'Top 10' prefix and trailing spaces for use in questions."""
    return re.sub(r'^Top\s+\d+\s+', '', title, flags=re.IGNORECASE).strip()


def build_faq_schema(title, description, products):
    topic = clean_topic(title)
    questions = []

    # Q1: Best to buy
    best = products[0]["name"] if products else "a highly rated model"
    best_desc = products[0]["description"] if products else ""
    answer1 = f"Based on our research, {best} is a top-rated choice for {topic} in India."
    if best_desc:
        answer1 += f" {best_desc}"
    questions.append({
        "@type": "Question",
        "name": f"What is the best {topic} to buy in India?",
        "acceptedAnswer": {"@type": "Answer", "text": answer1.strip()},
    })

    # Q2: Price range
    prices = [p["price"] for p in products if p.get("price", 0) > 0]
    if prices:
        lo = min(prices)
        hi = max(prices)
        answer2 = (
            f"Prices for {topic} in India range from "
            f"₹{lo:,.0f} to ₹{hi:,.0f} on Amazon and Flipkart. "
            f"Use ApniList to track price drops and set alerts to get the best deal."
        )
    else:
        answer2 = f"Prices for {topic} vary by model and brand. Check Amazon and Flipkart for current pricing, and use ApniList to track price drops."
    questions.append({
        "@type": "Question",
        "name": f"What is the price range for {topic} in India?",
        "acceptedAnswer": {"@type": "Answer", "text": answer2},
    })

    # Q3: How to choose
    answer3 = description if description else (
        f"When choosing a {topic}, consider your budget, required features, energy efficiency, "
        f"brand reliability, and after-sales service. Our guide compares the top options with "
        f"real price data, pros and cons, and expert recommendations."
    )
    questions.append({
        "@type": "Question",
        "name": f"How do I choose the right {topic}?",
        "acceptedAnswer": {"@type": "Answer", "text": answer3},
    })

    # Q4: Where to buy
    questions.append({
        "@type": "Question",
        "name": f"Where can I buy {topic} at the best price in India?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": (
                f"You can buy {topic} on Amazon India and Flipkart. "
                f"ApniList (www.apnilist.co.in) tracks prices on both platforms in real time, "
                f"so you can compare deals and set price drop alerts to never overpay."
            ),
        },
    })

    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": questions,
    }


def inject_faq(path):
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()

    if '"@type":"FAQPage"' in html or '"@type": "FAQPage"' in html:
        return "already has FAQ schema — skipped"

    title, description, products = extract_article_data(html)
    if not title:
        return "could not extract title — skipped"

    schema = build_faq_schema(title, description, products)
    script_tag = f'\n<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>'

    # Inject before </head>
    if "</head>" not in html:
        return "no </head> tag found — skipped"

    html = html.replace("</head>", f"{script_tag}\n</head>", 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(html)

    return f"injected FAQ with {len(schema['mainEntity'])} questions"


def main():
    # Only process clean-URL files (best-*)
    files = sorted(
        f for f in os.listdir(ARTICLES_DIR)
        if f.startswith("best-") and f.endswith(".html")
    )
    print(f"Injecting FAQ schema into {len(files)} clean-URL article files...\n")
    for filename in files:
        result = inject_faq(os.path.join(ARTICLES_DIR, filename))
        icon = "✅" if result.startswith("injected") else "ℹ"
        print(f"   {icon} {filename[:-5]}: {result}")
    print("\nDone.")


if __name__ == "__main__":
    main()
