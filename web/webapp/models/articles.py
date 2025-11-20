from webapp.extensions import db
from .base import BaseModel

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

    def to_dict(self):
        return {"id": self.category_id, "name": self.category_name}

class Tag(db.Model):
    __tablename__ = "tags"
    tag_id = db.Column(db.Integer, primary_key=True)
    tag_name = db.Column(db.Text, nullable=False, unique=True)

    def to_dict(self):
        return {"id": self.tag_id, "name": self.tag_name}

class Article(db.Model, BaseModel):
    __tablename__ = "articles"
    article_id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(1000), unique=True, nullable=False)
    source_id = db.Column(db.Integer, db.ForeignKey("sources.source_id"), nullable=False)
    publication_date = db.Column(db.Date)
    scrape_date = db.Column(db.DateTime)
    title = db.Column(db.Text, nullable=False)
    content = db.Column(db.Text)
    word_count = db.Column(db.Integer, default=0)
    sentence_count = db.Column(db.Integer, default=0)
    character_count = db.Column(db.Integer, default=0)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.category_id"))
    category_confidence = db.Column(db.Numeric(3,2), default=0.0)

    source = db.relationship("Source", lazy="joined")
    category = db.relationship("Category", lazy="joined")
    tags = db.relationship("Tag", secondary="article_tags", backref="articles", lazy="select")

    def to_dict(self, preview_len=160):
        return {
            "id": self.article_id,
            "url": self.url,
            "title": self.title,
            "publication_date": self.publication_date.isoformat() if self.publication_date else None,
            "scrape_date": self.scrape_date.isoformat() if self.scrape_date else None,
            "content_preview": (self.content[:preview_len] + "...") if self.content and len(self.content) > preview_len else self.content,
            "word_count": self.word_count,
            "sentence_count": self.sentence_count,
            "character_count": self.character_count,
            "source": self.source.to_dict() if self.source else None,
            "category": self.category.to_dict() if self.category else None,
            "tags": [t.to_dict() for t in self.tags],
            "category_confidence": float(self.category_confidence) if self.category_confidence is not None else None
        }

class ArticleTag(db.Model):
    __tablename__ = "article_tags"
    article_tag_id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey("articles.article_id", ondelete="CASCADE"), nullable=False)
    tag_id = db.Column(db.Integer, db.ForeignKey("tags.tag_id", ondelete="CASCADE"), nullable=False)
    __table_args__ = (db.UniqueConstraint('article_id', 'tag_id', name='_article_tag_uc'),)
