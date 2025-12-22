from scraper.daily_scraper import scrape_last_24h, save_json
from queue.file_queue import push_queue

if __name__ == "__main__":
    articles = scrape_last_24h()
    save_json(articles, "data/raw/articles_last24h.json")

    for a in articles:
        push_queue(a)

    print("Scraping complete. Articles queued for ETL.")
