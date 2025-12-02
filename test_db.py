from webapp import create_app
from webapp.models.articles import Article, Category, Tag, Source

app = create_app()

with app.app_context():
    print(f"✅ Categories: {Category.query.count()}")
    print(f"✅ Sources: {Source.query.count()}")
    print(f"✅ Articles: {Article.query.count()}")
    print(f"✅ Tags: {Tag.query.count()}")
    
    # Get first article
    first = Article.query.first()
    if first:
        print(f"\n📄 First article:")
        print(f"   Title: {first.title[:50]}")
        print(f"   Category: {first.category.category_name if first.category else 'None'}")
        print(f"   Source: {first.source.source_name if first.source else 'None'}")
    else:
        print("❌ No articles found!")