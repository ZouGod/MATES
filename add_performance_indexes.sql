-- Add performance indexes for 350k+ articles
-- Run this to speed up queries significantly

-- Index on foreign keys (if not already indexed)
CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);
CREATE INDEX IF NOT EXISTS idx_articles_category_id ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles(publication_date);

-- Composite indexes for common filter + sort combinations
CREATE INDEX IF NOT EXISTS idx_articles_category_pub_date ON articles(category_id, publication_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source_pub_date ON articles(source_id, publication_date DESC);

-- Index for full-text search on title and content (optional but recommended)
-- For PostgreSQL - creates a GIN index for faster text search
-- CREATE INDEX IF NOT EXISTS idx_articles_title_content ON articles USING gin(to_tsvector('english', title || ' ' || content));

-- Index on article_tags for faster tag filtering
CREATE INDEX IF NOT EXISTS idx_article_tags_tag_id ON article_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_article_tags_article_id ON article_tags(article_id);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);
