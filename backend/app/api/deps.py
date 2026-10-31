from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Generator
from app.db.base import SessionLocal


def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()
