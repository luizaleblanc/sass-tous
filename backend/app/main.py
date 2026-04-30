from fastapi import FastAPI
import logging
from contextlib import asynccontextmanager
from arq import create_pool
from arq.connections import RedisSettings
from .routers import auth, automation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis_pool = await create_pool(RedisSettings(host='redis', port=6379))
    logger.info("Conexao com a Fila Redis estabelecida.")
    yield
    await app.state.redis_pool.aclose()

app = FastAPI(title="SaaS Automacao de Vagas - DevSecOps API", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(automation.router)

@app.get("/health")
async def health_check():
    logger.info("Verificacao de integridade solicitada.")
    return {"status": "ok", "service": "API Segura Operacional"}