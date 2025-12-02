# crawlers/phnompenhpost_crawler.py
import requests
from bs4 import BeautifulSoup
from utils.storage import save_data
from .base_crawler import BaseCrawler


class PhnomPenhPostCrawler(BaseCrawler):
    """Simple crawler for phnompenhpost.com using requests + BeautifulSoup."""

    def crawl(self):
        base = "https://www.phnompenhpost.com/national"
        print(f"📰 Fetching: {base}")
        res = requests.get(base, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")

        articles = []
        for a in soup.select("div.views-row h2 a"):
            url = a["href"]
            if not url.startswith("http"):
                url = f"https://www.phnompenhpost.com{url}"
            title = a.get_text(strip=True)
            articles.append({"title": title, "url": url})

        save_data(articles, "data/processed/phnompenhpost.csv")
        return articles


if __name__ == "__main__":
    PhnomPenhPostCrawler().crawl()
