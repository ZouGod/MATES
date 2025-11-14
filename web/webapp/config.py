import secrets

class Config:
    SQLALCHEMY_DATABASE_URI = "postgresql://postgres:1@localhost:5432/mates"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = secrets.token_hex(32)