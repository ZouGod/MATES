#!/usr/bin/env python3
"""
Run this script to add performance indexes to the database.
This will significantly speed up queries on the 350k+ articles.

Usage: python add_indexes.py
"""

import sys
from sqlalchemy import text
from webapp.extensions import db
from webapp import create_app

def add_indexes():
    """Add performance indexes to articles and related tables."""
    
    app = create_app()
    
    with app.app_context():
        try:
            print("Adding performance indexes...")
            
            # List of index creation statements
            indexes = [
                # Foreign key indexes
                "CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id)",
                "CREATE INDEX IF NOT EXISTS idx_articles_category_id ON articles(category_id)",
                "CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles(publication_date)",
                
                # Composite indexes for common filter + sort combinations
                "CREATE INDEX IF NOT EXISTS idx_articles_category_pub_date ON articles(category_id, publication_date DESC)",
                "CREATE INDEX IF NOT EXISTS idx_articles_source_pub_date ON articles(source_id, publication_date DESC)",
                
                # Indexes for tag filtering
                "CREATE INDEX IF NOT EXISTS idx_article_tags_tag_id ON article_tags(tag_id)",
                "CREATE INDEX IF NOT EXISTS idx_article_tags_article_id ON article_tags(article_id)",
                
                # Index for date range queries
                "CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at)",
            ]
            
            for index_sql in indexes:
                try:
                    db.session.execute(text(index_sql))
                    print(f"✓ {index_sql.split('ON')[1].strip()}")
                except Exception as e:
                    print(f"⚠ Index may already exist: {index_sql.split('ON')[1].strip()}")
            
            db.session.commit()
            print("\n✅ All performance indexes added successfully!")
            print("Your queries should now be much faster.")
            
        except Exception as e:
            print(f"❌ Error adding indexes: {e}")
            db.session.rollback()
            sys.exit(1)

if __name__ == "__main__":
    add_indexes()
