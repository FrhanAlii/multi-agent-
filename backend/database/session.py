from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from utils.config import settings

_url = settings.database_url
_is_sqlite = _url.startswith("sqlite")

engine = create_async_engine(
    _url,
    echo=settings.debug,
    # SQLite does not support connection pooling options
    **({} if _is_sqlite else {
        "pool_size": settings.database_pool_size,
        "max_overflow": settings.database_max_overflow,
    }),
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables() -> None:
    """Create all tables (used for SQLite local dev instead of Alembic)."""
    from database.models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
