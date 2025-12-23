from flask import Blueprint, request, jsonify, current_app
from webapp.extensions import db
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
def get_categories():
    cats = Category.query.order_by(Category.category_name).all()
    return jsonify([{
        'category_id': c.category_id,
        'category_name': c.category_name
    } for c in cats])

@api_bp.route("/tags", methods=["GET"])
def get_tags():
    tags = Tag.query.order_by(Tag.tag_name).all()
    return jsonify([{
        'tag_id': t.tag_id,
        'tag_name': t.tag_name
    } for t in tags])

@api_bp.route("/sources", methods=["GET"])
def get_sources():
    sources = Source.query.order_by(Source.source_name).all()
    return jsonify([{
        'source_id': s.source_id,
        'source_name': s.source_name
    } for s in sources])
@api_bp.route("/articles", methods=["GET"])
def get_articles():
    page = _int(request.args.get("page")) or 1
    per_page = _int(request.args.get("per_page")) or 20

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

    # ---------- Get aggregate stats from already-filtered query ----------
    # Count total and get sum directly from the filtered query
    count_query = query.statement.alias()
    
    # Calculate totals more efficiently
    stats = db.session.query(
        func.count(count_query.c.article_id),
        func.coalesce(func.sum(count_query.c.character_count), 0),
        func.coalesce(func.sum(count_query.c.word_count), 0)
    ).from_statement(query.statement).first()
    
    total_count = stats[0] if stats else 0
    total_chars = stats[1] if stats else 0
    total_words = stats[2] if stats else 0

    # ---------- Pagination ----------
    pag = query.paginate(page=page, per_page=per_page, error_out=False)

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