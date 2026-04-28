import asyncio
import logging
import os
from playwright.async_api import async_playwright, Browser
from arq.connections import RedisSettings
from .database import SessionLocal
from .models import Job
from .scrapers.dispatcher import dispatch

logger = logging.getLogger(__name__)

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
_CONCURRENCY = 8
_LIMIT_PER_URL = 10
_URL_TIMEOUT = 30  # seconds per URL before giving up


async def _scrape_one(browser: Browser, url: str, sem: asyncio.Semaphore) -> list:
    async with sem:
        page = await browser.new_page(user_agent=_UA)
        try:
            result = await asyncio.wait_for(
                dispatch(page, url, limit=_LIMIT_PER_URL),
                timeout=_URL_TIMEOUT,
            )
            logger.info(f"[WORKER] {len(result)} vagas de {url}")
            return result
        except asyncio.TimeoutError:
            logger.warning(f"[WORKER] Timeout em {url}")
            return []
        except Exception as e:
            logger.error(f"[WORKER] Erro em {url}: {e}")
            return []
        finally:
            await page.close()


async def perform_scraping(ctx, target_urls: list[str], user_id: str):
    logger.info(f"[WORKER] Scraping de {len(target_urls)} URL(s) para user {user_id}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        sem = asyncio.Semaphore(_CONCURRENCY)
        results = await asyncio.gather(
            *[_scrape_one(browser, url, sem) for url in target_urls],
            return_exceptions=False,
        )
        await browser.close()

    all_jobs = [job for batch in results for job in batch]

    async with SessionLocal() as db:
        for j in all_jobs:
            db.add(Job(
                title=j.title,
                company=j.company,
                url=j.url,
                platform=j.platform,
                application_type=j.application_type,
                application_email=j.application_email,
                seniority=j.seniority,
                stacks=j.stacks if j.stacks else None,
                location_type=j.location_type,
                work_modality=j.work_modality,
                owner_id=user_id,
            ))
        await db.commit()

    logger.info(f"[WORKER] {len(all_jobs)} vagas salvas")
    return {"status": "success", "jobs_saved": len(all_jobs)}


async def perform_email_apply(ctx, job_ids: list[str], user_id: str, subject: str, body: str):
    import aiosmtplib
    from email.message import EmailMessage
    from sqlalchemy import select

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")

    if not smtp_user or not smtp_password:
        logger.error("[EMAIL] SMTP não configurado. Defina SMTP_USER e SMTP_PASSWORD no .env")
        return {"status": "error", "message": "SMTP nao configurado"}

    applied, failed = [], []

    async with SessionLocal() as db:
        result = await db.execute(
            select(Job).where(Job.id.in_(job_ids), Job.owner_id == user_id)
        )
        jobs = result.scalars().all()

        for job in jobs:
            if not job.application_email:
                failed.append(job.id)
                continue
            try:
                msg = EmailMessage()
                msg["From"] = smtp_user
                msg["To"] = job.application_email
                msg["Subject"] = subject
                msg.set_content(body)

                await aiosmtplib.send(
                    msg,
                    hostname=smtp_host,
                    port=smtp_port,
                    username=smtp_user,
                    password=smtp_password,
                    start_tls=True,
                )
                job.status = "Aplicada"
                applied.append(job.id)
                logger.info(f"[EMAIL] Enviado para {job.application_email} ({job.title})")
            except Exception as e:
                logger.error(f"[EMAIL] Falha para {job.application_email}: {e}")
                failed.append(job.id)

        await db.commit()

    return {"status": "success", "applied": len(applied), "failed": len(failed)}


class WorkerSettings:
    functions = [perform_scraping, perform_email_apply]
    redis_settings = RedisSettings(host="redis", port=6379)
