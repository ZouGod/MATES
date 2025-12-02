# utils/extractors.py
from bs4 import BeautifulSoup

def parse_dap_article(page):
    """Extract structured fields from a DAP-News article page."""
    try:
        soup = BeautifulSoup(page.html, "html.parser")
        title_tag = soup.select_one("h1.entry-title")
        if not title_tag:
            return None

        title = title_tag.get_text(strip=True)
        date = (soup.select_one("time.entry-date") or {}).get_text(strip=True)
        author = (soup.select_one("span.author.vcard") or {}).get_text(strip=True)
        content = " ".join(p.get_text(" ", strip=True) for p in soup.select("div.td-post-content p"))

        return {
            "url": page.url,
            "title": title,
            "date": date,
            "author": author,
            "content": content,
        }
    except Exception as e:
        print(f"❌ Error parsing {page.url}: {e}")
        return None
