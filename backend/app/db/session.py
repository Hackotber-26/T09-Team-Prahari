from sqlalchemy import inspect

from app.db.base import Base, engine
from app import models  # noqa: F401


def initialize_database() -> None:
    if engine.dialect.name == "sqlite" and inspect(engine).has_table("reports"):
        columns = {column["name"] for column in inspect(engine).get_columns("reports")}
        with engine.begin() as connection:
            if "submission_key" not in columns:
                connection.exec_driver_sql(
                    "ALTER TABLE reports ADD COLUMN submission_key VARCHAR(128)"
                )
            if "location_source" not in columns:
                connection.exec_driver_sql(
                    "ALTER TABLE reports ADD COLUMN location_source VARCHAR(16)"
                )
            connection.exec_driver_sql(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_submission_key "
                "ON reports (submission_key)"
            )
    Base.metadata.create_all(bind=engine)
