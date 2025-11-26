# crawlers/base_crawler.py
from abc import ABC, abstractmethod

class BaseCrawler(ABC):
    """Abstract base class for all crawlers."""

    @abstractmethod
    async def crawl(self):
        """Run the crawl and return structured data list."""
        pass
