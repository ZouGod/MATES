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
    
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        try:
            db.session.execute(text("SELECT 1"))
            print("✅ Database connected")
        except Exception as e:
            print(f"❌ Database error: {e}")
    
    try:
        from webapp.routes.main_routes import main_bp
        app.register_blueprint(main_bp)
        print("✅ Main routes registered")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    try:
        from webapp.routes.api_routes import api_bp
        app.register_blueprint(api_bp, url_prefix="/api")
        print("✅ API routes registered")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return app