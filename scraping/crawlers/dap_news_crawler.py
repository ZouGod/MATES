# crawlers/dap_news_crawler.py
import asyncio
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from utils.extractors import parse_dap_article
from utils.storage import save_data
from .base_crawler import BaseCrawler


class DapNewsCrawler(BaseCrawler):
    """Crawler for dap-news.com using Crawl4AI."""

    async def crawl(self):
        sections = [
            "https://dap-news.com/national/",
            "https://dap-news.com/international/",
            "https://dap-news.com/scholar/",
        ]

        # Configure the headless browser
        browser_config = BrowserConfig(headless=True)

        # ✅ Updated configuration syntax
        run_config = CrawlerRunConfig(
            crawl_max_pages=200,        # limit total pages
            crawl_depth=2,              # how deep to follow links
            same_domain=True,           # stay within site
            max_concurrency=5,          # parallel crawling
            obey_robots_txt=True,       # respect robots.txt
        )

        all_results = []

        async with AsyncWebCrawler(browser_config=browser_config) as crawler:
            for url in sections:
                print(f"🕸️ Crawling section: {url}")
                result = await crawler.arun(url=url, config=run_config)
                if not result.pages:
                    print(f"⚠️ No pages found in {url}")
                    continue

                for page in result.pages:
                    article = parse_dap_article(page)
                    if article:
                        all_results.append(article)

        if all_results:
            save_data(all_results, "data/processed/dap_news.csv")
        else:
            print("⚠️ No articles were extracted.")

        return all_results


if __name__ == "__main__":
    asyncio.run(DapNewsCrawler().crawl())
