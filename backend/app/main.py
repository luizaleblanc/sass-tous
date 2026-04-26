from fastapi import FastAPI
import logging
from .routers import auth

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SaaS Automação de Vagas - DevSecOps API")

app.include_router(auth.router)

@app.get("/health")
async def health_check():
    logger.info("Verificacao de integridade da infraestrutura solicitada.")
    return {"status": "ok", "service": "API Segura Operacional"}