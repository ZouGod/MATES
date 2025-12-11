import os
import json
import time
import psycopg2
import boto3
from khmernltk import word_tokenize

# ---------------------------------------------------------------------
#  DigitalOcean Spaces Config
# ---------------------------------------------------------------------
SPACES_REGION = os.getenv("SPACES_REGION", "sgp1")
SPACES_ENDPOINT = f"https://{SPACES_REGION}.digitaloceanspaces.com"
SPACES_KEY = os.getenv("SPACES_KEY")
SPACES_SECRET = os.getenv("SPACES_SECRET")
SPACES_BUCKET = os.getenv("SPACES_BUCKET", "etl-storage")

# Folders in Spaces
RAW_FOLDER = "raw/"
PROCESSED_FOLDER = "processed/"

# ---------------------------------------------------------------------
#  PostgreSQL Config (Neon)
# ---------------------------------------------------------------------
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_PORT = os.getenv("DB_PORT", "5432")

# ---------------------------------------------------------------------
#  Connect to DigitalOcean Spaces (S3 API)
# ---------------------------------------------------------------------
s3 = boto3.client(
    "s3",
    region_name=SPACES_REGION,
    endpoint_url=SPACES_ENDPOINT,
    aws_access_key_id=SPACES_KEY,
    aws_secret_access_key=SPACES_SECRET
)

# ---------------------------------------------------------------------
#  PostgreSQL Connection
# ---------------------------------------------------------------------
def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )

# ---------------------------------------------------------------------
#  Khmer Text Preprocessing
# ---------------------------------------------------------------------
def preprocess_khmer(text):
    if not text:
        return ""
    tokens = word_tokenize(text)
    return " ".join(tokens)

# ---------------------------------------------------------------------
#  Categorization + Tagging Logic
# ---------------------------------------------------------------------
def categorize_and_tag(text):
    text = text.lower()

    categories = []
    tags = []

    # Technology
    tech_keywords = ["technology", "ai", "ml", "python", "software", "hardware", "បច្ចេកវិទ្យា"]
    if any(k in text for k in tech_keywords):
        categories.append("Technology")
        tags.append("Tech")

    # Business
    biz_keywords = ["business", "market", "investment", "startup", "ពាណិជ្ជកម្ម"]
    if any(k in text for k in biz_keywords):
        categories.append("Business")
        tags.append("Biz")

    if not categories:
        categories.append("General")

    return list(set(categories)), list(set(tags))

# ---------------------------------------------------------------------
#  Insert into Database
# ---------------------------------------------------------------------
def insert_to_db(item):
    conn = get_connection()
    cur = conn.cursor()
    query = """
        INSERT INTO blog_posts (title, content, categories, tags, url)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (url) DO UPDATE SET
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            categories = EXCLUDED.categories,
            tags = EXCLUDED.tags;
    """
    cur.execute(query, (
        item["title"],
        item["content"],
        item["categories"],
        item["tags"],
        item["url"]
    ))
    conn.commit()
    cur.close()
    conn.close()

# ---------------------------------------------------------------------
#  Main ETL Processing of a Single File
# ---------------------------------------------------------------------
def process_file(key):
    print(f"Downloading {key} ...")

    # Download file
    obj = s3.get_object(Bucket=SPACES_BUCKET, Key=key)
    raw_data = json.loads(obj["Body"].read().decode("utf-8"))

    processed_items = []

    for post in raw_data:
        text = post.get("content", "")
        processed_text = preprocess_khmer(text)
        categories, tags = categorize_and_tag(processed_text)

        item = {
            "title": post.get("title"),
            "content": processed_text,
            "categories": categories,
            "tags": tags,
            "url": post.get("url")
        }

        insert_to_db(item)
        processed_items.append(item)

    # Save processed file to /processed/
    filename = key.replace(RAW_FOLDER, "")
    processed_key = PROCESSED_FOLDER + filename
    s3.put_object(
        Bucket=SPACES_BUCKET,
        Key=processed_key,
        Body=json.dumps(processed_items, ensure_ascii=False).encode("utf-8"),
        ContentType="application/json"
    )
    print(f"Saved processed file → {processed_key}")

    # Rename original file → _done.json
    new_key = key.replace(".json", "_done.json")
    s3.copy_object(
        Bucket=SPACES_BUCKET,
        CopySource={"Bucket": SPACES_BUCKET, "Key": key},
        Key=new_key
    )
    s3.delete_object(Bucket=SPACES_BUCKET, Key=key)

    print(f"Renamed: {key} → {new_key}")
    print("Done.\n")

# ---------------------------------------------------------------------
#  MAIN ETL LOOP
# ---------------------------------------------------------------------
def run_etl():
    print("Starting ETL...")

    # List all files in raw/
    objects = s3.list_objects_v2(Bucket=SPACES_BUCKET, Prefix=RAW_FOLDER)

    if "Contents" not in objects:
        print("No raw files found.")
        return

    for obj in objects["Contents"]:
        key = obj["Key"]
        filename = key.split("/")[-1]

        # skip folders
        if key.endswith("/"):
            continue
        
        # Must be .json
        if not filename.endswith(".json"):
            continue

        # Skip already processed files
        if filename.endswith("_done.json"):
            print(f"Skipping already processed file: {filename}")
            continue

        # Process new file
        process_file(key)

    print("ETL finished.")

# Run
if __name__ == "__main__":
    run_etl()
