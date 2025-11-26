# crawlers/__init__.py
"""
Crawlers package for multi-site scraping project.
Each crawler implements a class inheriting from BaseCrawler.
"""

from .base_crawler import BaseCrawler

try:
    from .dap_news_crawler import DapNewsCrawler
except ImportError:
    DapNewsCrawler = None

try:
    from .phnompenhpost_crawler import PhnomPenhPostCrawler
except ImportError:
    PhnomPenhPostCrawler = None

__all__ = [
    "BaseCrawler",
    "DapNewsCrawler",
    "PhnomPenhPostCrawler",
]
