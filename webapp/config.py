import os

class Config:
    # Use DATABASE_URL env var or fallback to local sqlite for dev convenience
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://neondb_owner:npg_X0N3vFLwAfEe@ep-fancy-dream-a1a6pcdi-pooler.ap-southeast-1.aws.neon.tech/mates?sslmode=require&channel_binding=require"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False
    ITEMS_PER_PAGE = int(os.getenv("ITEMS_PER_PAGE", 20))
