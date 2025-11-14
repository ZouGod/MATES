from flask import Flask
from .extensions import db
from .config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    from .models import articles

    with app.app_context():
        db.create_all()

    from .routes.main_routes import main_bp
    app.register_blueprint(main_bp)

    return app
