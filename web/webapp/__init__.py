from flask import Flask
from webapp.extensions import db
from webapp.config import Config

def create_app():
    """Create and configure Flask application"""
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    
    # Register blueprints
    from webapp.routes.main_routes import main_bp
    from webapp.routes.api_routes import api_bp
    
    app.register_blueprint(main_bp)  # routes: /, /explore
    app.register_blueprint(api_bp, url_prefix="/api")  # routes: /api/categories, /api/articles, etc
    
    with app.app_context():
        db.create_all()
    
    return app