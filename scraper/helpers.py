import re
from datetime import datetime, timedelta
from urllib.parse import urlparse
import random

KHMER_REGEX = re.compile(r'[\u1780-\u17FF\u19E0-\u19FF\s\.\,\!\\?។៕៚៛]+')

def extract_khmer(text):
    text = " ".join(KHMER_REGEX.findall(text or "")).strip()
    return re.sub(r"\s+", " ", text)

def is_recent_date(date_str, hours=24):
    try:
        pub = datetime.fromisoformat(date_str)
        return pub >= datetime.now() - timedelta(hours=hours)
    except:
        return False

def smart_delay():
    return random.uniform(0.5, 1.2)

def valid_article_url(base, url):
    domain = urlparse(base).netloc
    if domain not in url:
        return False
    if any(bad in url for bad in ["category", "tag", "page", "feed"]):
        return False
    return True
