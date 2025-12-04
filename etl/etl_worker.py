import os
import json
import shutil
import re
import psycopg2
import nltk
from dateutil import parser as dateparser

# -----------------------------
# Setup
# -----------------------------
INBOX_DIR = "etl/inbox"
PROCESSED_DIR = "etl/processed"

DB_CONFIG = {
    "host": "ep-fancy-dream-a1a6pcdi-pooler.ap-southeast-1.aws.neon.tech",
    "database": "mates",
    "user": "neondb_owner",
    "password": "npg_X0N3vFLwAfEe"
}

# Ensure NLTK punkt exists
try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt")

# -----------------------------
# KHMER TEXT PREPROCESSING
# -----------------------------
def clean_khmer_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"[^\u1780-\u17FF0-9\u17E0-\u17E9\s។៕៖,]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def tokenize_khmer_words(text: str):
    rough_tokens = text.split()
    tokens = []
    for token in rough_tokens:
        if len(token) > 20:
            tokens.extend(list(token))
        else:
            tokens.append(token)
    return tokens

def count_sentences_khmer(text: str):
    sentences = re.split(r"[។៕]+", text)
    sentences = [s.strip() for s in sentences if s.strip()]
    return len(sentences)

# -----------------------------
# CATEGORY + TAGS
# -----------------------------
categories = {
    'agriculture': ['កសិកម្ម','ស្រូវ','ដំណាំ','កសិករ','ដីស្រែ','ជី','សត្វចិញ្ចឹម','ទឹកស្រោចស្រព','ទីផ្សារកសិផល','គ្រាប់ពូជ'],
    'public': ['សាធារណៈ','រដ្ឋ','សេវាសាធារណៈ','អាជ្ញាធរ','សង្គម'],
    'commerce': ['ពាណិជ្ជកម្ម','អាជីវកម្ម','ទីផ្សារ','ការនាំចេញ','ការនាំចូល'],
    'religion': ['សាសនា','ព្រះ','វត្ត','សាសនាចក្រ'],
    'culture': ['វប្បធម៌','ប្រពៃណី','សិល្បៈ','តន្ត្រី','រាំ','ភាពយន្ត'],
    'economy': ['សេដ្ឋកិច្ច','ធនាគារ','វិនិយោគ','ការងារ','ប្រាក់ខែ'],
    'education': ['អប់រំ','សាលា','សិក្សា','គ្រូ','និស្សិត'],
    'sports': ['កីឡា','បាល់ទាត់','អត្តពលិក','ការប្រកួត'],
    'environment': ['បរិស្ថាន','ធម្មជាតិ','ទន្លេ','ព្រៃឈើ','អាកាសធាតុ'],
    'international_news': ['អន្តរជាតិ','ពិភពលោក','UN','អង្គការសហប្រជាជាតិ'],
    'health': ['សុខាភិបាល','ពេទ្យ','ជំងឺ','ថ្នាំ'],
    'industry': ['ឧស្សាហកម្ម','រោងចក្រ','ផលិតកម្ម'],
    'technology': ['បច្ចេកវិទ្យា','ឌីជីថល','ទិន្នន័យ','កម្មវិធី'],
    'national_news': ['ពត៌មានជាតិ','រាជរដ្ឋាភិបាល','សភា'],
    'justice': ['យុត្តិធម៍','ច្បាប់','សាលា','ប៉ូលិស'],
    'labor': ['ការងារ','បុគ្គលិក','ប្រាក់ខែ'],
    'conflict_war': ['សង្រ្គាម','ជម្លោះ','ការប៉ះទង្គិច','កងទ័ព'],
    'telecommunication': ['ទូរគមនាគមន៍','ទូរស័ព្ទ','អ៊ិនធឺណេត'],
    'traffic_accident': ['គ្រោះថ្នាក់ចរាចរណ៍','ឡានបុក','ម៉ូតូបុក','អ្នករបួស','ស្លាប់'],
    'tourism': ['ទេសចរណ៍','អង្គរវត្ត','សៀមរាប','ឆ្នេរ'],
    'aviation': ['អាកាសចរណ៍','យន្តហោះ','កំពង់ផែ']
}

def extract_tags_and_category(title, content):
    text = title + " " + content
    tags = set()
    category_count = {c: 0 for c in categories}

    for cat, kws in categories.items():
        for kw in kws:
            if kw in text:
                tags.add(kw)
                category_count[cat] += 1

    sorted_cats = sorted(category_count.items(), key=lambda x: x[1], reverse=True)

    primary = sorted_cats[0][0] if sorted_cats[0][1] > 0 else None
    total = sum(category_count.values())
    confidence = sorted_cats[0][1] / total if total > 0 else 0.0

    return list(tags), primary, confidence

# -----------------------------
# Preprocess + Enrich
# -----------------------------
def preprocess_article(article):
    title = clean_khmer_text(article.get("title", ""))
    content = clean_khmer_text(article.get("content", ""))

    tags, primary_category, category_confidence = extract_tags_and_category(title, content)

    words = tokenize_khmer_words(content)
    return {
        "url": article.get("url", ""),
        "source": article.get("source", ""),
        "publication_date": article.get("publication_date", ""),
        "scrape_date": article.get("scrape_date", ""),
        "title": title,
        "content": content,
        "tags": tags,
        "word_count": len(words),
        "sentence_count": count_sentences_khmer(content),
        "character_count": len(content.replace(" ", "")),
        "primary_category": primary_category,
        "category_confidence": category_confidence
    }

# -----------------------------
# DATABASE SECTION
# -----------------------------
conn = psycopg2.connect(**DB_CONFIG)
conn.autocommit = True
cur = conn.cursor()

def get_or_create_source(url):
    cur.execute("""
        INSERT INTO sources (source_url, source_name)
        VALUES (%s, %s)
        ON CONFLICT (source_url) DO UPDATE SET source_name = EXCLUDED.source_name
        RETURNING source_id;
    """, (url, url))
    return cur.fetchone()[0]

def get_or_create_category(name):
    if not name:
        return None
    cur.execute("""
        INSERT INTO categories (category_name)
        VALUES (%s)
        ON CONFLICT (category_name) DO NOTHING
        RETURNING category_id;
    """, (name,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("SELECT category_id FROM categories WHERE category_name=%s", (name,))
    return cur.fetchone()[0]

def get_or_create_tag(tag):
    cur.execute("""
        INSERT INTO tags (tag_name)
        VALUES (%s)
        ON CONFLICT (tag_name) DO NOTHING
        RETURNING tag_id;
    """, (tag,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("SELECT tag_id FROM tags WHERE tag_name=%s", (tag,))
    return cur.fetchone()[0]

def insert_article(article, source_id, category_id):
    publication_date = dateparser.parse(article["publication_date"]).date()
    scrape_date = dateparser.parse(article["scrape_date"])

    cur.execute("""
        INSERT INTO articles (
            url, source_id, category_id, publication_date,
            scrape_date, title, content, word_count,
            sentence_count, character_count, category_confidence
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (url) DO UPDATE SET
            title=EXCLUDED.title,
            content=EXCLUDED.content,
            word_count=EXCLUDED.word_count,
            sentence_count=EXCLUDED.sentence_count,
            character_count=EXCLUDED.character_count,
            category_id=EXCLUDED.category_id,
            category_confidence=EXCLUDED.category_confidence
        RETURNING article_id;
    """, (
        article["url"], source_id, category_id,
        publication_date, scrape_date,
        article["title"], article["content"],
        article["word_count"], article["sentence_count"],
        article["character_count"], article["category_confidence"]
    ))

    return cur.fetchone()[0]

def insert_article_tags(article_id, tags):
    for t in tags:
        tag_id = get_or_create_tag(t)
        cur.execute("""
            INSERT INTO article_tags (article_id, tag_id)
            VALUES (%s,%s)
            ON CONFLICT DO NOTHING;
        """, (article_id, tag_id))

# -----------------------------
# Process a raw article JSON
# -----------------------------
def process_article(raw):
    enriched = preprocess_article(raw)

    source_id = get_or_create_source(enriched["source"])
    category_id = get_or_create_category(enriched["primary_category"])
    article_id = insert_article(enriched, source_id, category_id)

    insert_article_tags(article_id, enriched["tags"])
    print(f"✓ Inserted ID {article_id}: {enriched['title'][:50]}")

# -----------------------------
# ETL Worker Loop
# -----------------------------
def run_etl_worker():
    files = [f for f in os.listdir(INBOX_DIR) if f.endswith(".json")]

    if not files:
        print("No files in inbox/")
        return

    for f in files:
        path = os.path.join(INBOX_DIR, f)
        print(f"\n=== Processing {f} ===")

        try:
            with open(path, "r", encoding="utf-8") as infile:
                data = json.load(infile)

            articles = data if isinstance(data, list) else [data]

            for article in articles:
                process_article(article)

            shutil.move(path, os.path.join(PROCESSED_DIR, f))
            print(f"→ moved to processed/")
        except Exception as e:
            print("ERROR:", e)

if __name__ == "__main__":
    run_etl_worker()
    cur.close()
    conn.close()
