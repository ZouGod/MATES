-- DROP TABLE IF EXISTS article_tags CASCADE;
-- DROP TABLE IF EXISTS articles CASCADE;
-- DROP TABLE IF EXISTS tags CASCADE;
-- DROP TABLE IF EXISTS sources CASCADE;
-- DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE sources (
    source_id SERIAL PRIMARY KEY,
    source_url VARCHAR(500) UNIQUE NOT NULL,
    source_name VARCHAR(200) NOT NULL
);

CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    tag_name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE articles (
    article_id SERIAL PRIMARY KEY,
    url VARCHAR(1000) UNIQUE NOT NULL,
    source_id INTEGER REFERENCES sources(source_id),
    publication_date DATE NOT NULL,
    scrape_date TIMESTAMP NOT NULL,
    title TEXT NOT NULL,
    content TEXT
);

CREATE TABLE article_tags (
    article_id INTEGER REFERENCES articles(article_id),
    tag_id INTEGER REFERENCES tags(tag_id),
    UNIQUE(article_id, tag_id)
);
