import os
from dotenv import load_dotenv
from flask import Flask
from sqlalchemy import text
from webapp.extensions import db
from webapp.cache import cache
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
    
    # Initialize cache with Redis (or fallback to simple cache)
    try:
        # Try to connect to Redis on droplet
        # Import redis explicitly to avoid queue module conflict
        import sys
        import importlib
        redis_module = importlib.import_module('redis')
        redis_client = redis_module.Redis(host='localhost', port=6379, db=0, decode_responses=True, socket_connect_timeout=2)
        redis_client.ping()  # Test connection
        
        # Redis is available - use it!
        app.config['CACHE_TYPE'] = 'redis'
        app.config['CACHE_REDIS_URL'] = 'redis://localhost:6379/0'
        cache.init_app(app)
        print("✅ Cache initialized (Redis on droplet - 30 min timeout)")
    except ImportError:
        # Redis not installed
        app.config['CACHE_TYPE'] = 'simple'
        cache.init_app(app)
        print("⚠️  Redis not installed")
        print("💾 Cache initialized (simple in-memory - local only)")
    except Exception as e:
        # Fall back to simple in-memory cache (Redis not running or connection failed)
        app.config['CACHE_TYPE'] = 'simple'
        cache.init_app(app)
        print(f"⚠️  Redis not available: {type(e).__name__}")
        print("💾 Cache initialized (simple in-memory - local only)")
    
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
    
    # Warm cache on startup
    try:
        from webapp.cache import warm_cache
        with app.app_context():
            warm_cache()
    except Exception as e:
        print(f"⚠️  Cache warming skipped: {e}")
    
    try:
        from webapp.routes.api_routes import api_bp
        app.register_blueprint(api_bp, url_prefix="/api")
        print("✅ API routes registered")
    except Exception as e:
        print(f"❌ API routes error: {e}")
    
    return app