import os

class Config:
    # Use DATABASE_URL env var or fallback to local sqlite for dev convenience
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:1@localhost:5432/mates"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False
    ITEMS_PER_PAGE = int(os.getenv("ITEMS_PER_PAGE", 20))
