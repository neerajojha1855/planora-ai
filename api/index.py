import sys
from pathlib import Path

# Add backend directory to sys.path for serverless execution
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.main import app
