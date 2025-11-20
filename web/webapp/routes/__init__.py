# """
# Routes package for Flask app.
# Exposes all blueprints under web.webapp.routes.
# """

# # Optional: makes importing cleaner
# from .main_routes import main_bp
# from .articles_routes import articles_bp

# __all__ = [
#     "main_bp",
#     "articles_bp",
# ]
from .api_routes import api_bp

def register_routes(app):
    app.register_blueprint(api_bp, url_prefix="/api")
