import os
from pathlib import Path
import re
from urllib.parse import quote, unquote

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv(Path(__file__).with_name(".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required. Configure backend/.env before starting the API.")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

pooler_match = re.search(
    r"@(aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com)(:\d+)",
    DATABASE_URL,
    re.IGNORECASE,
)
if pooler_match:
    credentials_start = DATABASE_URL.index("://") + 3
    username, separator, password = DATABASE_URL[credentials_start:pooler_match.start()].partition(":")
    if separator:
        credentials = f"{quote(unquote(username), safe='')}:{quote(unquote(password), safe='')}"
        DATABASE_URL = f"{DATABASE_URL[:credentials_start]}{credentials}{DATABASE_URL[pooler_match.start():]}"

database_url = make_url(DATABASE_URL)
if database_url.drivername == "postgresql":
    database_url = database_url.set(drivername="postgresql+psycopg2")
database_url = database_url.set(
    query={key: value for key, value in database_url.query.items() if key != "pgbouncer"}
)

connect_args = {"connect_timeout": 10}
if "supabase" in (database_url.host or ""):
    connect_args["sslmode"] = "require"
engine = create_engine(
    database_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=5,
    max_overflow=5,
    pool_timeout=10,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def initialize_database() -> None:
    """Create any missing tables from the SQLAlchemy models at startup."""
    # Importing here registers all model metadata without creating a module cycle.
    import models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    # create_all() deliberately does not alter existing tables. Add fields from
    # the previous user schema in place so existing accounts remain intact.
    with engine.begin() as connection:
        columns = {column["name"] for column in inspect(connection).get_columns("users")}
        additions = {
            "contact_number": "VARCHAR(32) NOT NULL DEFAULT 'Unspecified'",
            "zone": "VARCHAR(160) NOT NULL DEFAULT 'Unassigned'",
            "block": "VARCHAR(160) NOT NULL DEFAULT 'Unassigned'",
            "profession": "VARCHAR(100)",
        }
        for column_name, definition in additions.items():
            if column_name not in columns:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {definition}"))

        # Carry over a legacy profession where possible. It remains nullable and
        # may contain historical values that are no longer available at signup.
        if "profession_department" in columns and "profession" not in columns:
            connection.execute(text(
                "UPDATE users SET profession = profession_department "
                "WHERE profession IS NULL AND profession_department IS NOT NULL"
            ))
