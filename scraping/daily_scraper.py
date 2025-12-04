# scraper/daily_scraper.py
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import json
import time
import re
from urllib.parse import urljoin, urlparse
import random

# ====================================================
# CONFIG
# ====================================================
BASE_URL = "https://dap-news.com/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}
TIME_LIMIT_HOURS = 24

# ====================================================
# Helpers
# ====================================================
def is_recent(date_str):
    try:
        pub_date = datetime.fromisoformat(date_str)
        return pub_date >= datetime.now() - timedelta(hours=TIME_LIMIT_HOURS)
    except:
        return False


def smart_delay():
    return random.uniform(0.5, 1.2)


def extract_khmer_text(text):
    if not text:
        return ""
    pattern = re.compile(r'[\u1780-\u17FF\u19E0-\u19FF\s\.\,\!\\?។៕៚៛]+')
    cleaned = ' '.join(pattern.findall(text)).strip()
    cleaned = re.sub(r'\s+', ' ', cleaned)
    return cleaned


def is_valid_url(url):
    # only URLs from target domain
    domain = urlparse(BASE_URL).netloc
    if domain not in url:
        return False
    if any(x in url for x in ["category", "tag", "page", "feed", "xml"]):
        return False
    return True


# ====================================================
# DISCOVER URLs
# ====================================================
def discover_urls():
    print("🔍 Discovering article URLs...")
    urls = set()

    pages_to_scan = [
        BASE_URL,
        BASE_URL + "category/",
        BASE_URL + "category/national/",
        BASE_URL + "category/politics/",
        BASE_URL + "category/sport/",
        BASE_URL + "category/entertainment/",
    ]

    for page in pages_to_scan:
        try:
            res = requests.get(page, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(res.text, "html.parser")

            links = soup.find_all("a", href=True)
            for a in links:
                full_url = urljoin(BASE_URL, a["href"])
                if is_valid_url(full_url):
                    urls.add(full_url)

        except Exception as e:
            print(f"❌ Failed to scan {page}: {e}")

        time.sleep(smart_delay())

    print(f"🎯 Found {len(urls)} raw URLs")
    return list(urls)


# ====================================================
# SCRAPE SINGLE ARTICLE
# ====================================================
def scrape_article(url):
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")

        # title
        title_tag = soup.find("h1")
        if not title_tag:
            return None

        title = extract_khmer_text(title_tag.get_text())

        # content
        article_tag = soup.find("article")
        if not article_tag:
            return None

        content = extract_khmer_text(article_tag.get_text())
        if len(content) < 30:
            return None

        # date
        date = datetime.now().strftime("%Y-%m-%d")
        date_tag = soup.find("time")

        if date_tag and date_tag.get("datetime"):
            date = date_tag["datetime"][:10]

        return {
            "Title": title,
            "Content": content,
            "Source_URL": url,
            "Date": date,
            "Scraped_At": datetime.now().isoformat()
        }

    except:
        return None


# ====================================================
# MAIN FUNCTION (SCRAPE 24 HOURS ONLY)
# ====================================================
def scrape_last_24_hours():
    all_urls = discover_urls()
    recent_articles = []

    print("📰 Scraping last 24 hours of articles...")

    for i, url in enumerate(all_urls):
        print(f"[{i+1}/{len(all_urls)}] {url}")

        article = scrape_article(url)
        if not article:
            continue

        if is_recent(article["Date"]):
            recent_articles.append(article)
            print(f"   ✅ Recent: {article['Title'][:50]}...")
        else:
            print("   ⏭️  Skipped (not recent)")

        time.sleep(smart_delay())

    print(f"\n📦 Total recent articles collected: {len(recent_articles)}")
    return recent_articles


# ====================================================
# SAVE TO JSON
# ====================================================
def save_articles(articles, outfile):
    with open(outfile, "w", encoding="utf-8") as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)

    print(f"💾 Saved: {outfile}")


# ====================================================
# RUN DAILY
# ====================================================
if __name__ == "__main__":
    articles = scrape_last_24_hours()
    save_articles(articles, "data/raw/articles_last24h.json")
