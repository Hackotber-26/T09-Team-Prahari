from app.db.base import Base, engine
from app import models  # noqa

# Create all tables
Base.metadata.create_all(bind=engine)
