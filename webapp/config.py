import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

class Config:
    """Flask configuration from environment variables"""
    # Read DATABASE_URL directly from .env
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    JSON_SORT_KEYS = False
    
    # Validate database URL is set
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("❌ DATABASE_URL not found in .env file!")