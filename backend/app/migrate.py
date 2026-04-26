import asyncio
from sqlalchemy import text
from .database import engine

MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN seniority VARCHAR(20) NULL",
    "ALTER TABLE users ADD COLUMN stacks JSON NULL",
    "ALTER TABLE jobs ADD COLUMN seniority VARCHAR(20) NULL",
    "ALTER TABLE jobs ADD COLUMN stacks JSON NULL",
]


async def run():
    async with engine.begin() as conn:
        for sql in MIGRATIONS:
            try:
                await conn.execute(text(sql))
                print(f"OK: {sql}")
            except Exception as e:
                msg = str(e)
                if "Duplicate column name" in msg or "already exists" in msg:
                    print(f"SKIP (já existe): {sql.split('ADD COLUMN')[1].strip()}")
                else:
                    print(f"ERRO: {e}")
                    raise


if __name__ == "__main__":
    asyncio.run(run())
