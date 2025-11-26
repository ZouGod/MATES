import os
import sys

# Ensure the parent folder (the 'web' folder) is on sys.path so `import webapp` works
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from webapp import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)