import os
from dotenv import load_dotenv
from flask import Flask
from sqlalchemy import text
from webapp.extensions import db
from webapp.config import Config

load_dotenv()

def create_app():
    """Create and configure Flask application"""
    app = Flask(__name__,
                template_folder=os.path.join(os.path.dirname(__file__), 'templates'),
                static_folder=os.path.join(os.path.dirname(__file__), 'static'))
    
    # Load config from environment
    app.config.from_object(Config)
    
    # Print which database we're connecting to
    db_url = app.config.get("SQLALCHEMY_DATABASE_URI", "Not set")
    db_name = db_url.split("/")[-1].split("?")[0] if db_url else "N/A"
    print(f"📊 Using database: {db_name}")
    print(f"🔗 Connection: {db_url.split('@')[-1][:50]}..." if "@" in db_url else "")
    
    # Initialize database
    db.init_app(app)
    
    # Test connection
    with app.app_context():
        try:
            result = db.session.execute(text("SELECT 1"))
            print("✅ Database connection successful")
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            raise
    
    # Register blueprints
    try:
        from webapp.routes.main_routes import main_bp
        app.register_blueprint(main_bp)
        print("✅ Main routes registered")
    except Exception as e:
        print(f"❌ Main routes error: {e}")
    
    try:
        from webapp.routes.api_routes import api_bp
        app.register_blueprint(api_bp, url_prefix="/api")
        print("✅ API routes registered")
    except Exception as e:
        print(f"❌ API routes error: {e}")
    
    return app