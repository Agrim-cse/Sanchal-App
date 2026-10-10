import os
from pathlib import Path
import re
from urllib.parse import quote, unquote

from dotenv import load_dotenv
from sqlalchemy import create_engine
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

connect_args = {"sslmode": "require"} if "supabase" in (database_url.host or "") else {}
engine = create_engine(
    database_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=5,
    max_overflow=5,
    pool_timeout=30,
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