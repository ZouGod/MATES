# run_all.py
import asyncio
from crawlers import DapNewsCrawler, PhnomPenhPostCrawler

async def main():
    print("🚀 Starting multi-site scraping...\n")

    # Run async crawler
    if DapNewsCrawler:
        print("▶️ Crawling DAP News...")
        await DapNewsCrawler().crawl()

    # Run synchronous crawler
    if PhnomPenhPostCrawler:
        print("\n▶️ Crawling Phnom Penh Post...")
        PhnomPenhPostCrawler().crawl()

    print("\n✅ All crawls complete!")

if __name__ == "__main__":
    asyncio.run(main())
