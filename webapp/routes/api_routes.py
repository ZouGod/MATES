from flask import Blueprint, request, jsonify, current_app
from webapp.extensions import db
from webapp.cache import cache, CACHE_TIMEOUT_CATEGORIES, CACHE_TIMEOUT_SOURCES, CACHE_TIMEOUT_TAGS, CACHE_TIMEOUT_STATS, CACHE_TIMEOUT_CORPORA
from webapp.models.articles import Article, Category, Tag, Source, ArticleTag, Corpus
from sqlalchemy import and_, or_, func
from datetime import datetime

api_bp = Blueprint("api", __name__)

def _int(v):
    try:
        return int(v)
    except Exception:
        return None
    
@api_bp.route("/corpora", methods=["GET"])
@cache.cached(timeout=CACHE_TIMEOUT_CORPORA)
def get_corpora():
    """Get all corpora with statistics"""
    try:
        corpora = Corpus.query.all()
        return jsonify([c.to_dict() for c in corpora])
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route("/corpora/<int:corpus_id>", methods=["GET"])
def get_corpus_details(corpus_id):
    """Get specific corpus with detailed stats"""
    try:
        corpus = Corpus.query.get(corpus_id)
        if not corpus:
            return jsonify({'success': False, 'error': 'Corpus not found'}), 404
        
        return jsonify({'success': True, 'corpus': corpus.to_dict()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
@api_bp.route("/stats", methods=["GET"])
@cache.cached(timeout=CACHE_TIMEOUT_STATS)
def get_stats():
    """Get corpus statistics"""
    try:
        # Count total articles
        total_articles = Article.query.count()
        
        # Use stored character_count and word_count columns (consistent with /articles)
        total_chars = db.session.query(func.sum(Article.character_count)).scalar() or 0
        total_words = db.session.query(func.sum(Article.word_count)).scalar() or 0
        
        # Count unique categories (corpora)
        total_categories = Category.query.count()
        
        # Count unique sources (text types)
        total_sources = Source.query.count()
        
        # Date range
        earliest = db.session.query(func.min(Article.publication_date)).scalar()
        latest = db.session.query(func.max(Article.publication_date)).scalar()
        
        date_span = ""
        if earliest and latest:
            date_span = f"{earliest.year}–{latest.year}"
        
        return jsonify({
            'success': True,
            'stats': {
                'total_words': total_words,
                'total_articles': total_articles,
                'total_categories': total_categories,
                'total_sources': total_sources,
                'date_span': date_span,
                'total_characters': total_chars
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
@api_bp.route("/categories", methods=["GET"])
@cache.cached(timeout=CACHE_TIMEOUT_CATEGORIES)
def get_categories():
    cats = Category.query.order_by(Category.category_name).all()
    return jsonify([{
        'category_id': c.category_id,
        'category_name': c.category_name
    } for c in cats])

@api_bp.route("/tags", methods=["GET"])
@cache.cached(timeout=CACHE_TIMEOUT_TAGS)
def get_tags():
    tags = Tag.query.order_by(Tag.tag_name).all()
    return jsonify([{
        'tag_id': t.tag_id,
        'tag_name': t.tag_name
    } for t in tags])

@api_bp.route("/sources", methods=["GET"])
@cache.cached(timeout=CACHE_TIMEOUT_SOURCES)
def get_sources():
    sources = Source.query.order_by(Source.source_name).all()
    return jsonify([{
        'source_id': s.source_id,
        'source_name': s.source_name
    } for s in sources])
@api_bp.route("/articles", methods=["GET"])
def get_articles():
    page = _int(request.args.get("page")) or 1
    per_page = _int(request.args.get("per_page")) or 50
    per_page = min(per_page, 100)  # Cap at 100 max to prevent slowness

    category_param = request.args.get("category")
    source_param = request.args.get("source")
    tag_param = request.args.get("tag")
    start = request.args.get("start")
    end = request.args.get("end")
    q = request.args.get("q")
    sort = request.args.get("sort", "newest")

    # Base query for pagination
    query = Article.query

    # ---------- Filters ----------
    # Handle multiple categories (comma-separated)
    if category_param:
        # Parse comma-separated category IDs
        if ',' in category_param:
            category_ids = [int(x) for x in category_param.split(",") if x.isdigit()]
            if category_ids:
                query = query.filter(Article.category_id.in_(category_ids))
        else:
            # Single category
            category = _int(category_param)
            if category:
                query = query.filter(Article.category_id == category)

    # Handle multiple sources (comma-separated)
    if source_param:
        # Parse comma-separated source IDs
        if ',' in source_param:
            source_ids = [int(x) for x in source_param.split(",") if x.isdigit()]
            if source_ids:
                query = query.filter(Article.source_id.in_(source_ids))
        else:
            # Single source
            source = _int(source_param)
            if source:
                query = query.filter(Article.source_id == source)

    if tag_param:
        tag_ids = [int(x) for x in tag_param.split(",") if x.isdigit()]
        if tag_ids:
            query = query.join(ArticleTag).filter(ArticleTag.tag_id.in_(tag_ids)).distinct()

    if start:
        try:
            from dateutil import parser
            sd = parser.parse(start).date()
            query = query.filter(Article.publication_date >= sd)
        except Exception:
            pass

    if end:
        try:
            from dateutil import parser
            ed = parser.parse(end).date()
            query = query.filter(Article.publication_date <= ed)
        except Exception:
            pass

    if q:
        ilike_q = f"%{q}%"
        query = query.filter(or_(Article.title.ilike(ilike_q),
                                 Article.content.ilike(ilike_q)))

    # ---------- Sorting ----------
    if sort == "newest":
        query = query.order_by(Article.publication_date.desc().nulls_last())
    elif sort == "oldest":
        query = query.order_by(Article.publication_date.asc().nulls_last())

    # ---------- Build aggregate query with same filters for totals ----------
    agg_query = Article.query

    if category_param:
        if ',' in category_param:
            category_ids = [int(x) for x in category_param.split(",") if x.isdigit()]
            if category_ids:
                agg_query = agg_query.filter(Article.category_id.in_(category_ids))
        else:
            category = _int(category_param)
            if category:
                agg_query = agg_query.filter(Article.category_id == category)

    if source_param:
        if ',' in source_param:
            source_ids = [int(x) for x in source_param.split(",") if x.isdigit()]
            if source_ids:
                agg_query = agg_query.filter(Article.source_id.in_(source_ids))
        else:
            source = _int(source_param)
            if source:
                agg_query = agg_query.filter(Article.source_id == source)

    if tag_param:
        tag_ids = [int(x) for x in tag_param.split(",") if x.isdigit()]
        if tag_ids:
            agg_query = agg_query.join(ArticleTag).filter(ArticleTag.tag_id.in_(tag_ids)).distinct()

    if start:
        try:
            from dateutil import parser
            sd = parser.parse(start).date()
            agg_query = agg_query.filter(Article.publication_date >= sd)
        except Exception:
            pass

    if end:
        try:
            from dateutil import parser
            ed = parser.parse(end).date()
            agg_query = agg_query.filter(Article.publication_date <= ed)
        except Exception:
            pass

    if q:
        ilike_q = f"%{q}%"
        agg_query = agg_query.filter(or_(Article.title.ilike(ilike_q),
                                         Article.content.ilike(ilike_q)))

    # ---------- Pagination (count comes from pagination object) ----------
    pag = query.paginate(page=page, per_page=per_page, error_out=False)
    
    total_count = pag.total  # Get count from pagination
    
    # Calculate totals for ALL filtered articles - simple direct approach
    try:
        # Query the sum directly from article_id list in agg_query
        article_ids = agg_query.with_entities(Article.article_id).all()
        if article_ids:
            article_id_list = [row[0] for row in article_ids]
            totals = db.session.query(
                func.coalesce(func.sum(Article.word_count), 0),
                func.coalesce(func.sum(Article.character_count), 0)
            ).filter(Article.article_id.in_(article_id_list)).first()
            
            total_words = int(totals[0]) if totals and totals[0] else 0
            total_chars = int(totals[1]) if totals and totals[1] else 0
        else:
            total_words = 0
            total_chars = 0
    except Exception as e:
        print(f"Warning: Could not calculate word/char totals: {e}")
        total_words = 0
        total_chars = 0

    items = []
    for a in pag.items:
        article_pk = getattr(a, 'article_id', None) or getattr(a, 'id', None)

        items.append({
            "article_id": article_pk,
            "title": a.title or "",
            "content": (a.content or "")[:150],
            "url": a.url or "",
            "publication_date": a.publication_date.strftime('%Y-%m-%d') if a.publication_date else "",
            "category": {
                "category_id": a.category.category_id,
                "category_name": a.category.category_name
            } if a.category else None,
            "source": {
                "source_id": a.source.source_id,
                "source_name": a.source.source_name
            } if a.source else None,
            "character_count": a.character_count or 0,
            "word_count": a.word_count or 0,
            "sentence_count": a.sentence_count or 0
        })

    # ---------- Final JSON ----------
    return jsonify({
        "page": page,
        "per_page": per_page,
        "total": total_count,
        "pages": (total_count + per_page - 1) // per_page,
        "total_characters": int(total_chars) if total_chars else 0,
        "total_words": int(total_words) if total_words else 0,
        "articles": items
    })

@api_bp.route("/articles/export", methods=["GET"])
def export_articles():
    """Fast export endpoint - no relationships, large dataset friendly"""
    category_param = request.args.get("category")
    source_param = request.args.get("source")
    tag_param = request.args.get("tag")
    start = request.args.get("start")
    end = request.args.get("end")
    q = request.args.get("q")

    # Build query without joined relationships
    query = Article.query

    # Apply filters
    if category_param:
        if ',' in category_param:
            category_ids = [int(x) for x in category_param.split(",") if x.isdigit()]
            if category_ids:
                query = query.filter(Article.category_id.in_(category_ids))
        else:
            category = _int(category_param)
            if category:
                query = query.filter(Article.category_id == category)

    if source_param:
        if ',' in source_param:
            source_ids = [int(x) for x in source_param.split(",") if x.isdigit()]
            if source_ids:
                query = query.filter(Article.source_id.in_(source_ids))
        else:
            source = _int(source_param)
            if source:
                query = query.filter(Article.source_id == source)

    if tag_param:
        tag_ids = [int(x) for x in tag_param.split(",") if x.isdigit()]
        if tag_ids:
            query = query.join(ArticleTag).filter(ArticleTag.tag_id.in_(tag_ids)).distinct()

    if start:
        try:
            from dateutil import parser
            sd = parser.parse(start).date()
            query = query.filter(Article.publication_date >= sd)
        except Exception:
            pass

    if end:
        try:
            from dateutil import parser
            ed = parser.parse(end).date()
            query = query.filter(Article.publication_date <= ed)
        except Exception:
            pass

    if q:
        ilike_q = f"%{q}%"
        query = query.filter(or_(Article.title.ilike(ilike_q),
                                 Article.content.ilike(ilike_q)))

    # Get all articles (no pagination limit for export)
    articles = query.options(
        db.joinedload(Article.category),
        db.joinedload(Article.source)
    ).all()

    items = []
    for a in articles:
        items.append({
            "article_id": a.article_id,
            "title": a.title or "",
            "content": a.content or "",
            "url": a.url or "",
            "publication_date": a.publication_date.strftime('%Y-%m-%d') if a.publication_date else "",
            "category_name": a.category.category_name if a.category else "",
            "source_name": a.source.source_name if a.source else "",
            "word_count": a.word_count or 0,
            "character_count": a.character_count or 0,
        })

    return jsonify({
        "total": len(items),
        "articles": items
    })