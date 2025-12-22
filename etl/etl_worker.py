import psycopg2
import json
from datetime import datetime
from config.settings import DB_CONFIG
from queue.file_queue import pop_queue

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

def get_or_create_source(url):
    cur.execute("""
        INSERT INTO sources (source_url, source_name)
        VALUES (%s, %s)
        ON CONFLICT (source_url) DO NOTHING
        RETURNING source_id;
    """, (url, url))
    row = cur.fetchone()
    if row:
        return row[0]

    cur.execute("SELECT source_id FROM sources WHERE source_url=%s", (url,))
    return cur.fetchone()[0]

def load_article(article):
    source_id = get_or_create_source(article["Source_URL"])
    pub_date = article["Date"]
    scrape = article["Scraped_At"]

    cur.execute("""
        INSERT INTO articles (url, source_id, publication_date, scrape_date, title, content)
        VALUES (%s,%s,%s,%s,%s,%s)
        ON CONFLICT (url) DO NOTHING
        RETURNING article_id;
    """, (
        article["Source_URL"],
        source_id,
        pub_date,
        scrape,
        article["Title"],
        article["Content"]
    ))

    return cur.fetchone()

def run_etl():
    print("🚀 ETL Worker Started")

    while True:
        item = pop_queue()
        if not item:
            print("Queue empty. ETL Finished.")
            break

        try:
            load_article(item)
            conn.commit()
        except Exception as e:
            print("Error:", e)
            conn.rollback()

    cur.close()
    conn.close()
