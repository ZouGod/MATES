from ..extensions import db
from datetime import datetime

class Article(db.Model):
    __tablename__ = "articles"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text)
    category = db.Column(db.String(100))
    published_at = db.Column(db.DateTime, default=datetime.utcnow)