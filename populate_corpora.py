"""Populate corpora table from categories"""
from webapp import create_app
from webapp.extensions import db
from webapp.models.articles import Corpus, Category

def populate_corpora():
    """Insert corpus data for each category"""
    app = create_app()
    
    with app.app_context():
        print("Fetching categories from database...")
        categories = Category.query.all()
        
        if not categories:
            print("❌ No categories found in database!")
            return
        
        print(f"\nFound {len(categories)} categories")
        print("Inserting corpora data...\n")
        
        created = 0
        skipped = 0
        
        for cat in categories:
            # Check if corpus already exists
            existing = Corpus.query.filter_by(category_id=cat.category_id).first()
            
            if existing:
                print(f"⏭️  Skipped (exists): {cat.category_name}")
                skipped += 1
                continue
            
            # Create new corpus
            corpus = Corpus(
                category_id=cat.category_id,
                corpus_name=cat.category_name,
                description=f"Khmer language corpus for {cat.category_name}",
                corpus_type="Core"
            )
            
            db.session.add(corpus)
            print(f"✅ Added: {cat.category_name}")
            created += 1
        
        # Commit all changes
        db.session.commit()
        
        print(f"\n{'='*50}")
        print(f"✅ Successfully created {created} corpora!")
        print(f"⏭️  Skipped {skipped} (already existed)")
        print(f"📊 Total corpora in database: {Corpus.query.count()}")
        print(f"{'='*50}")

if __name__ == "__main__":
    populate_corpora()