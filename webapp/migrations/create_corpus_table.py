"""Create corpus table and populate from categories"""
from webapp import create_app
from webapp.extensions import db
from webapp.models.articles import Corpus, Category

app = create_app()

with app.app_context():
    print("Creating corpus table...")
    
    # Create table
    db.create_all()
    
    print("Populating corpus data from categories...")
    
    # Get all categories
    categories = Category.query.all()
    
    for cat in categories:
        # Check if corpus already exists
        existing = Corpus.query.filter_by(category_id=cat.category_id).first()
        
        if not existing:
            corpus = Corpus(
                category_id=cat.category_id,
                corpus_name=cat.category_name,
                description=f"Khmer language corpus for {cat.category_name}",
                corpus_type="Core",
                color="blue",
                icon="newspaper"
            )
            db.session.add(corpus)
            print(f"✓ Created corpus for category: {cat.category_name}")
        else:
            print(f"- Corpus already exists for: {cat.category_name}")
    
    db.session.commit()
    print("\nCorpus table created and populated successfully!")
    
    # Show summary
    corpus_count = Corpus.query.count()
    print(f"\nTotal corpora in database: {corpus_count}")