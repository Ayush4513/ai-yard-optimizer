import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Build an absolute path so the .db file always lives in backend/
# In Docker, use /app/backend, locally use the actual backend directory
if os.getenv("DOCKER_ENV"):
    # Docker environment - use mounted path
    BASE_DIR = Path("/app/backend")
else:
    # Local environment
    BASE_DIR = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DB_PATH = BASE_DIR / "yard_optimization.db"

# Ensure directory exists
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# Create engine with error handling
# Note: Engine creation should not fail, but if it does, we'll handle it in startup
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},  # Needed for SQLite
    pool_pre_ping=True  # Verify connections before using
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
