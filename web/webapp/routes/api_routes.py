from flask import Blueprint, request, jsonify, current_app
from webapp.extensions import db
from webapp.models.articles import Article, Category, Tag, Source, ArticleTag
from sqlalchemy import and_, func

api_bp = Blueprint("api", __name__)

# Helper: parse int safely
def _int(v):
    try:
        return int(v)
    except Exception:
        return None

@api_bp.route("/categories", methods=["GET"])
def get_categories():
    cats = Category.query.order_by(Category.category_name).all()
    return jsonify([c.to_dict() for c in cats])

@api_bp.route("/tags", methods=["GET"])
def get_tags():
    tags = Tag.query.order_by(Tag.tag_name).all()
    return jsonify([t.to_dict() for t in tags])

@api_bp.route("/sources", methods=["GET"])
def get_sources():
    sources = Source.query.order_by(Source.source_name).all()
    return jsonify([s.to_dict() for s in sources])

@api_bp.route("/articles", methods=["GET"])
def get_articles():
    # Filters accepted:
    # category, source, tag (single or multiple comma-separated),
    # start (YYYY-MM-DD), end (YYYY-MM-DD), q (keyword full-text-like),
    # page, per_page, sort
    page = _int(request.args.get("page")) or 1
    per_page = _int(request.args.get("per_page")) or current_app.config.get("ITEMS_PER_PAGE", 20)

    category = _int(request.args.get("category"))
    source = _int(request.args.get("source"))
    tag_param = request.args.get("tag")  # can be "1" or "1,2,3"
    start = request.args.get("start")
    end = request.args.get("end")
    q = request.args.get("q")
    sort = request.args.get("sort", "newest")  # newest | oldest | relevant

    query = Article.query

    if category:
        query = query.filter(Article.category_id == category)
    if source:
        query = query.filter(Article.source_id == source)
    if tag_param:
        tag_ids = [int(x) for x in tag_param.split(",") if x.isdigit()]
        if tag_ids:
            # require that article has ANY of the tag_ids (change to all-match if desired)
            query = query.join(ArticleTag).filter(ArticleTag.tag_id.in_(tag_ids))

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
        # simple ILIKE search on title/content (replace with full-text later)
        ilike_q = f"%{q}%"
        query = query.filter(or_(Article.title.ilike(ilike_q), Article.content.ilike(ilike_q)))

    # sorting
    if sort == "newest":
        query = query.order_by(Article.publication_date.desc().nulls_last())
    elif sort == "oldest":
        query = query.order_by(Article.publication_date.asc().nulls_last())
    # else: leave default

    # pagination
    pag = query.paginate(page=page, per_page=per_page, error_out=False)
    items = [a.to_dict() for a in pag.items]

    return jsonify({
        "page": page,
        "per_page": per_page,
        "total": pag.total,
        "pages": pag.pages,
        "articles": items
    })
