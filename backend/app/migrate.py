import asyncio
from sqlalchemy import text
from .database import engine

MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN seniority VARCHAR(20) NULL",
    "ALTER TABLE users ADD COLUMN stacks JSON NULL",
    "ALTER TABLE users ADD COLUMN work_modality VARCHAR(20) NULL",
    "ALTER TABLE users ADD COLUMN cv_filename VARCHAR(255) NULL",
    "ALTER TABLE users ADD COLUMN cv_text TEXT NULL",
    "ALTER TABLE users ADD COLUMN cv_parsed JSON NULL",
    "ALTER TABLE jobs ADD COLUMN seniority VARCHAR(20) NULL",
    "ALTER TABLE jobs ADD COLUMN stacks JSON NULL",
    "ALTER TABLE jobs ADD COLUMN location_type VARCHAR(20) NULL DEFAULT 'nacional'",
    "ALTER TABLE jobs ADD COLUMN work_modality VARCHAR(20) NULL DEFAULT 'presencial'",
    "ALTER TABLE users ADD COLUMN area VARCHAR(30) NULL",
    "ALTER TABLE users ADD COLUMN location_type VARCHAR(20) NULL",
]


async def run():
    async with engine.begin() as conn:
        for sql in MIGRATIONS:
            try:
                await conn.execute(text(sql))
                col = sql.split("ADD COLUMN")[1].strip().split()[0]
                print(f"OK: {col}")
            except Exception as e:
                msg = str(e)
                if "Duplicate column name" in msg or "already exists" in msg:
                    col = sql.split("ADD COLUMN")[1].strip().split()[0]
                    print(f"SKIP (já existe): {col}")
                else:
                    print(f"ERRO: {e}")
                    raise


if __name__ == "__main__":
    asyncio.run(run())
