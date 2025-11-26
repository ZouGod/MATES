# utils/config.py
"""
Global configuration for the scraper.
"""

BASE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; MultiNewsScraper/1.0; +https://example.com)"
}

CRAWL_DELAY = 1  # seconds between requests
TIMEOUT = 10     # seconds
