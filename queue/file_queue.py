import json
import os

QUEUE_FILE = "data/queue/pending.jsonl"

def push_queue(item):
    """Add item to queue file"""
    os.makedirs(os.path.dirname(QUEUE_FILE), exist_ok=True)
    with open(QUEUE_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")

def pop_queue():
    """Remove and return first item from queue"""
    if not os.path.exists(QUEUE_FILE):
        return None

    with open(QUEUE_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()

    if not lines:
        return None

    first = json.loads(lines[0])

    with open(QUEUE_FILE, "w", encoding="utf-8") as f:
        f.writelines(lines[1:])

    return first

def queue_size():
    """Get number of items in queue"""
    if not os.path.exists(QUEUE_FILE):
        return 0
    with open(QUEUE_FILE, "r", encoding="utf-8") as f:
        return len(f.readlines())

def clear_queue():
    """Clear all items from queue"""
    if os.path.exists(QUEUE_FILE):
        os.remove(QUEUE_FILE)