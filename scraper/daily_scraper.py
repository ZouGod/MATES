import requests
from bs4 import BeautifulSoup
import json
import time
from datetime import datetime
from urllib.parse import urljoin
from .helpers import (
    extract_khmer, smart_delay,
    is_recent_date, valid_article_url
)

BASE_URL = "https://dap-news.com/"
HEADERS = {"User-Agent": "Mozilla/5.0"}

def discover_urls():
    urls = set()
    pages = [
        BASE_URL,
        BASE_URL + "category/national/",
        BASE_URL + "category/politics/",
        BASE_URL + "category/sport/",
        BASE_URL + "category/entertainment/",
    ]

    for page in pages:
        try:
            res = requests.get(page, headers=HEADERS)
            soup = BeautifulSoup(res.text, "html.parser")

            for a in soup.find_all("a", href=True):
                full = urljoin(BASE_URL, a["href"])
                if valid_article_url(BASE_URL, full):
                    urls.add(full)

        except:
            pass

        time.sleep(smart_delay())

    return list(urls)

def scrape_article(url):
    try:
        res = requests.get(url, headers=HEADERS)
        soup = BeautifulSoup(res.text, "html.parser")

        title_tag = soup.find("h1")
        if not title_tag:
            return None
        title = extract_khmer(title_tag.get_text())

        article_tag = soup.find("article")
        if not article_tag:
            return None

        content = extract_khmer(article_tag.get_text())
        if len(content) < 30:
            return None

        date = datetime.now().strftime("%Y-%m-%d")
        date_tag = soup.find("time")
        if date_tag and date_tag.get("datetime"):
            date = date_tag["datetime"][:10]

        return {
            "Title": title,
            "Content": content,
            "Source_URL": url,
            "Date": date,
            "Scraped_At": datetime.now().isoformat(),
            "Tags": [],
            "Primary_Category": None
        }

    except:
        return None

def scrape_last_24h():
    urls = discover_urls()
    articles = []

    for url in urls:
        art = scrape_article(url)
        if not art:
            continue

        if is_recent_date(art["Date"], hours=24):
            articles.append(art)

        time.sleep(smart_delay())

    return articles

def save_json(data, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
