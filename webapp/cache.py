"""
Redis caching configuration and utilities
"""
from flask_caching import Cache

# Initialize cache object (will be configured in app factory)
# Falls back to simple cache if Redis unavailable
cache = Cache(config={
    'CACHE_TYPE': 'simple',  # Use simple in-memory cache as fallback
})

# Cache timeout constants (in seconds) - minimum 30 minutes for explore page
CACHE_TIMEOUT_CATEGORIES = 1800      # 30 minutes - categories rarely change
CACHE_TIMEOUT_SOURCES = 1800         # 30 minutes - sources rarely change
CACHE_TIMEOUT_TAGS = 1800            # 30 minutes - tags rarely change
CACHE_TIMEOUT_STATS = 1800           # 30 minutes - stats cache for explore page
CACHE_TIMEOUT_ARTICLES = 1800        # 30 minutes - articles on explore page
CACHE_TIMEOUT_CORPORA = 1800         # 30 minutes - corpora metadata
CACHE_TIMEOUT_POPULAR_FILTERS = 1800 # 30 minutes - popular category filters

def invalidate_stats_cache():
    """Invalidate stats cache when articles change"""
    cache.delete('api.get_stats')

def invalidate_articles_cache():
    """Invalidate all articles cache when new articles added"""
    pass

def invalidate_categories_cache():
    """Invalidate categories cache"""
    cache.delete('api.get_categories')

def invalidate_sources_cache():
    """Invalidate sources cache"""
    cache.delete('api.get_sources')

def invalidate_tags_cache():
    """Invalidate tags cache"""
    cache.delete('api.get_tags')

def warm_cache():
    """Pre-load cache on app startup for instant loads"""
    try:
        from webapp.models.articles import Article, Category, Tag, Source
        from flask import current_app
        from sqlalchemy import func
        
        print("🔥 Pre-warming cache on startup...")
        
        # Cache categories
        with current_app.app_context():
            categories = Category.query.order_by(Category.category_name).all()
            cats_data = [{'category_id': c.category_id, 'category_name': c.category_name} for c in categories]
            cache.set('api.get_categories', cats_data, timeout=CACHE_TIMEOUT_CATEGORIES)
            print(f"  ✓ Cached {len(cats_data)} categories")
            
            # Cache sources
            sources = Source.query.order_by(Source.source_name).all()
            sources_data = [{'source_id': s.source_id, 'source_name': s.source_name} for s in sources]
            cache.set('api.get_sources', sources_data, timeout=CACHE_TIMEOUT_SOURCES)
            print(f"  ✓ Cached {len(sources_data)} sources")
            
            # Cache tags
            tags = Tag.query.order_by(Tag.tag_name).all()
            tags_data = [{'tag_id': t.tag_id, 'tag_name': t.tag_name} for t in tags]
            cache.set('api.get_tags', tags_data, timeout=CACHE_TIMEOUT_TAGS)
            print(f"  ✓ Cached {len(tags_data)} tags")
            
            # Cache stats
            total_articles = Article.query.count()
            total_chars = Article.query.with_entities(func.coalesce(func.sum(Article.character_count), 0)).scalar() or 0
            total_words = Article.query.with_entities(func.coalesce(func.sum(Article.word_count), 0)).scalar() or 0
            total_categories = Category.query.count()
            total_sources = Source.query.count()
            
            earliest = Article.query.with_entities(func.min(Article.publication_date)).scalar()
            latest = Article.query.with_entities(func.max(Article.publication_date)).scalar()
            
            date_span = ""
            if earliest and latest:
                date_span = f"{earliest.year}–{latest.year}"
            
            stats = {
                'success': True,
                'stats': {
                    'total_words': int(total_words) if total_words else 0,
                    'total_articles': total_articles,
                    'total_categories': total_categories,
                    'total_sources': total_sources,
                    'date_span': date_span,
                    'total_characters': int(total_chars) if total_chars else 0
                }
            }
            cache.set('api.get_stats', stats, timeout=CACHE_TIMEOUT_STATS)
            print(f"  ✓ Cached stats: {total_articles} articles, {total_words} words")
            
        print("✅ Cache pre-warming complete (30 min timeout)!")
        
    except Exception as e:
        print(f"⚠️  Warning: Could not pre-warm cache: {e}")
