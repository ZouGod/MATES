# utils/storage.py
"""
Storage utilities for saving and loading scraped data.

Supports CSV, JSON, and Parquet formats.
"""

import pandas as pd
import json
from pathlib import Path
from datetime import datetime


def ensure_dir(path: str | Path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)


def save_data(data, path: str, file_format: str = None):
    """Save scraped data to file in CSV, JSON, or Parquet."""
    ensure_dir(path)
    path = Path(path)

    if file_format is None:
        file_format = path.suffix.lstrip('.').lower()

    df = pd.DataFrame(data) if not isinstance(data, pd.DataFrame) else data

    if file_format == "csv":
        df.to_csv(path, index=False, encoding="utf-8-sig")
    elif file_format == "json":
        df.to_json(path, orient="records", force_ascii=False, indent=2)
    elif file_format == "parquet":
        df.to_parquet(path, index=False)
    else:
        raise ValueError(f"Unsupported file format: {file_format}")

    print(f"✅ Saved {len(df)} records → {path}")


def load_data(path: str | Path) -> pd.DataFrame:
    """Load data from CSV, JSON, or Parquet."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"❌ File not found: {path}")

    ext = path.suffix.lower()
    if ext == ".csv":
        return pd.read_csv(path)
    elif ext == ".json":
        return pd.read_json(path)
    elif ext == ".parquet":
        return pd.read_parquet(path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")


def log_message(message: str, log_file: str = "data/logs/scraper.log"):
    """Append timestamped messages to a log file."""
    ensure_dir(log_file)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] {message}\n")