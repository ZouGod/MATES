from webapp.extensions import db
from sqlalchemy import func, text

class Source(db.Model):
    __tablename__ = "sources"
    source_id = db.Column(db.Integer, primary_key=True)
    source_url = db.Column(db.Text, nullable=False, unique=True)
    source_name = db.Column(db.Text, nullable=False)

    def to_dict(self):
        return {"id": self.source_id, "url": self.source_url, "name": self.source_name}

class Category(db.Model):
    __tablename__ = "categories"
    category_id = db.Column(db.Integer, primary_key=True)
    category_name = db.Column(db.Text, nullable=False, unique=True)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def to_dict(self):
        return {"id": self.category_id, "name": self.category_name}

class Tag(db.Model):
    __tablename__ = "tags"
    tag_id = db.Column(db.Integer, primary_key=True)
    tag_name = db.Column(db.Text, nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def to_dict(self):
        return {"id": self.tag_id, "name": self.tag_name}

class Article(db.Model):
    __tablename__ = "articles"
    article_id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(1000), unique=True, nullable=False)
    source_id = db.Column(db.Integer, db.ForeignKey("sources.source_id"), nullable=False, index=True)
    publication_date = db.Column(db.Date, index=True)
    scrape_date = db.Column(db.DateTime)
    title = db.Column(db.Text, nullable=False)
    content = db.Column(db.Text)
    word_count = db.Column(db.Integer, default=0)
    sentence_count = db.Column(db.Integer, default=0)
    character_count = db.Column(db.Integer, default=0)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.category_id"), index=True)
    category_confidence = db.Column(db.Numeric(3, 2), default=0.0)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp(), index=True)

    # Relationships - use joined loading for efficient API responses
    source = db.relationship("Source", lazy="joined")
    category = db.relationship("Category", lazy="joined")
    tags = db.relationship("Tag", secondary="article_tags", backref="articles", lazy="selectin")
    
    __table_args__ = (
        db.Index('idx_articles_category_pub_date', 'category_id', 'publication_date'),
        db.Index('idx_articles_source_pub_date', 'source_id', 'publication_date'),
    )

    def to_dict(self, preview_len=160):
        return {
            "article_id": self.article_id,
            "url": self.url,
            "title": self.title,
            "publication_date": self.publication_date.isoformat() if self.publication_date else None,
            "scrape_date": self.scrape_date.isoformat() if self.scrape_date else None,
            "content": (self.content[:preview_len] + "...") if self.content and len(self.content) > preview_len else self.content,
            "word_count": self.word_count,
            "sentence_count": self.sentence_count,
            "character_count": self.character_count,
            "source": self.source.to_dict() if self.source else None,
            "category": self.category.to_dict() if self.category else None,
            "tags": [t.to_dict() for t in self.tags],
            "category_confidence": float(self.category_confidence) if self.category_confidence else None
        }

class ArticleTag(db.Model):
    __tablename__ = "article_tags"
    article_tag_id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey("articles.article_id", ondelete="CASCADE"), nullable=False)
    tag_id = db.Column(db.Integer, db.ForeignKey("tags.tag_id", ondelete="CASCADE"), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    __table_args__ = (db.UniqueConstraint('article_id', 'tag_id', name='_article_tag_uc'),)

class Corpus(db.Model):
    """Corpus/Dataset metadata"""
    __tablename__ = "corpora"
    corpus_id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.category_id"), nullable=False, unique=True)
    corpus_name = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    corpus_type = db.Column(db.String(50), default="Core")
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    
    category = db.relationship("Category", lazy="joined")
    
    def to_dict(self):
        """Convert to dictionary with statistics"""
        article_count = db.session.query(func.count(Article.article_id)).filter(
            Article.category_id == self.category_id
        ).scalar() or 0
        
        total_chars = db.session.query(
            func.sum(func.coalesce(func.length(Article.content), 0))
        ).filter(Article.category_id == self.category_id).scalar() or 0
        
        total_words = int(total_chars // 5) if total_chars else 0
        
        date_info = db.session.query(
            func.min(Article.publication_date),
            func.max(Article.publication_date)
        ).filter(Article.category_id == self.category_id).first()
        
        start_date = date_info[0] if date_info and date_info[0] else None
        end_date = date_info[1] if date_info and date_info[1] else None
        
        timespan = "N/A"
        if start_date and end_date:
            timespan = f"{start_date.year}–{end_date.year}"
        elif start_date:
            timespan = f"{start_date.year}"
        
        return {
            'corpus_id': self.corpus_id,
            'category_id': self.category_id,
            'corpus_name': self.corpus_name,
            'description': self.description,
            'corpus_type': self.corpus_type,
            'timespan': timespan,
            'word_count': total_words,
            'article_count': article_count,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }