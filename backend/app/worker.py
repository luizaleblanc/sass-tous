import asyncio
import json
import logging
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

import httpx
from playwright.async_api import async_playwright, Browser, BrowserContext
from arq.connections import RedisSettings
from .database import SessionLocal
from .models import Job, User
from .scrapers.dispatcher import dispatch
from .scrapers.base import is_tech_relevant

logger = logging.getLogger(__name__)

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
_CONCURRENCY = 8
_LIMIT_PER_URL = 25
_URL_TIMEOUT = 30


class _SafeFormatDict(dict):
    def __missing__(self, key: str) -> str:
        return f"{{{key}}}"


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _get_linkedin_cookies(user_id: str) -> list[dict] | None:
    from sqlalchemy import select
    from .security import crypto_provider

    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.linkedin_cookies:
            return None
        try:
            return json.loads(crypto_provider.decrypt_str(user.linkedin_cookies))
        except Exception as e:
            logger.warning(f"[WORKER] Falha ao descriptografar cookies LinkedIn: {e}")
            return None


async def _fetch_template_vars(user_id: str) -> dict:
    from sqlalchemy import select

    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

    if not user:
        return {}

    cv = user.cv_parsed or {}
    name_from_email = (user.email or "").split("@")[0].replace(".", " ").replace("_", " ").title()

    return {
        "sender_name": cv.get("name") or name_from_email,
        "email": cv.get("email") or user.email or "",
        "phone": cv.get("phone") or "",
        "linkedin": cv.get("linkedin") or "",
        "github": cv.get("github") or "",
        "portfolio": cv.get("github") or cv.get("linkedin") or "",
        "seniority": user.seniority or "",
        "stacks": ", ".join(user.stacks or []),
    }


async def _filter_valid_urls(jobs: list) -> list:
    """Removes jobs with inaccessible URLs (HTTP 404/410). Fail-open on network errors."""
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(connect=4.0, read=6.0, write=4.0, pool=4.0),
        follow_redirects=True,
        headers={"User-Agent": _UA},
    ) as client:
        async def check(job):
            try:
                r = await client.head(job.url)
                if r.status_code in (404, 410):
                    logger.debug(f"[WORKER] URL inválida ({r.status_code}): {job.url}")
                    return None
                return job
            except Exception:
                return job  # fail-open: network error does not discard the job

        results = await asyncio.gather(*[check(j) for j in jobs])

    valid = [j for j in results if j is not None]
    removed = len(jobs) - len(valid)
    if removed:
        logger.info(f"[WORKER] URL check: {removed} vaga(s) removidas (404/410)")
    return valid


async def _remove_duplicates(jobs: list, user_id: str) -> list:
    """Removes jobs already stored in the database for this user (by URL)."""
    from sqlalchemy import select

    if not jobs:
        return jobs

    urls = {j.url for j in jobs}
    async with SessionLocal() as db:
        result = await db.execute(
            select(Job.url).where(Job.owner_id == user_id, Job.url.in_(urls))
        )
        existing = {row[0] for row in result.fetchall()}

    unique = [j for j in jobs if j.url not in existing]
    dupes = len(jobs) - len(unique)
    if dupes:
        logger.info(f"[WORKER] Deduplicação: {dupes} vaga(s) já existentes ignoradas")
    return unique


# ─── Scraping pipeline ───────────────────────────────────────────────────────

async def _scrape_one(
    browser: Browser,
    url: str,
    sem: asyncio.Semaphore,
    linkedin_cookies: list[dict] | None = None,
) -> list:
    is_linkedin = "linkedin.com" in url.lower()
    ctx: BrowserContext | None = None
    page = None

    async with sem:
        try:
            if is_linkedin and linkedin_cookies:
                ctx = await browser.new_context(user_agent=_UA)
                await ctx.add_cookies(linkedin_cookies)
                page = await ctx.new_page()
            else:
                page = await browser.new_page(user_agent=_UA)

            result = await asyncio.wait_for(
                dispatch(
                    page, url, limit=_LIMIT_PER_URL,
                    linkedin_cookies=linkedin_cookies if is_linkedin else None,
                ),
                timeout=_URL_TIMEOUT,
            )
            logger.info(f"[WORKER] {len(result)} vagas brutas de {url}")
            return result
        except asyncio.TimeoutError:
            logger.warning(f"[WORKER] Timeout em {url}")
            return []
        except Exception as e:
            logger.error(f"[WORKER] Erro em {url}: {e}")
            return []
        finally:
            if ctx is not None:
                await ctx.close()
            elif page is not None:
                await page.close()


async def perform_scraping(ctx, target_urls: list[str], user_id: str):
    logger.info(f"[WORKER] Scraping de {len(target_urls)} URL(s) para user {user_id}")

    linkedin_cookies = await _get_linkedin_cookies(user_id)
    if linkedin_cookies:
        logger.info(f"[WORKER] Sessão LinkedIn ativa para user {user_id}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        sem = asyncio.Semaphore(_CONCURRENCY)
        results = await asyncio.gather(
            *[_scrape_one(browser, url, sem, linkedin_cookies) for url in target_urls],
            return_exceptions=False,
        )
        await browser.close()

    all_jobs = [job for batch in results for job in batch]

    # Stage 1: title-based tech filter (strict — stacks alone do not qualify)
    tech_jobs = [j for j in all_jobs if is_tech_relevant(j.title, j.stacks)]
    logger.info(
        f"[WORKER] Filtro tech: {len(all_jobs)} brutas → {len(tech_jobs)} aprovadas "
        f"({len(all_jobs) - len(tech_jobs)} descartadas)"
    )

    # Stage 2: remove 404/410 URLs
    valid_jobs = await _filter_valid_urls(tech_jobs)

    # Stage 3: remove duplicates already in DB
    new_jobs = await _remove_duplicates(valid_jobs, user_id)

    async with SessionLocal() as db:
        for j in new_jobs:
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

    logger.info(f"[WORKER] {len(new_jobs)} vagas novas salvas")
    return {
        "status": "success",
        "jobs_saved": len(new_jobs),
        "discarded_non_tech": len(all_jobs) - len(tech_jobs),
        "discarded_invalid_url": len(tech_jobs) - len(valid_jobs),
        "discarded_duplicate": len(valid_jobs) - len(new_jobs),
    }


# ─── Auto-apply pipeline ─────────────────────────────────────────────────────

async def perform_auto_apply(ctx, job_ids: list[str], user_id: str):
    """Uses Playwright to attempt automated application for each job."""
    from sqlalchemy import select
    from .scrapers.auto_apply import apply_for_job

    user_data = await _fetch_template_vars(user_id)
    linkedin_cookies = await _get_linkedin_cookies(user_id)

    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        async with SessionLocal() as db:
            result = await db.execute(
                select(Job).where(Job.id.in_(job_ids), Job.owner_id == user_id)
            )
            jobs_to_apply = result.scalars().all()

            for job in jobs_to_apply:
                ctx_browser: BrowserContext | None = None
                page = None
                try:
                    is_linkedin = (job.platform or "") == "linkedin"
                    if is_linkedin and linkedin_cookies:
                        ctx_browser = await browser.new_context(user_agent=_UA)
                        await ctx_browser.add_cookies(linkedin_cookies)
                        page = await ctx_browser.new_page()
                    else:
                        page = await browser.new_page(user_agent=_UA)

                    apply_result = await asyncio.wait_for(
                        apply_for_job(page, job.url, job.platform or "", user_data),
                        timeout=60,
                    )

                    if apply_result.success:
                        job.status = "Aplicada"

                    results.append({
                        "job_id": job.id,
                        "title": job.title,
                        "success": apply_result.success,
                        "message": apply_result.message,
                    })
                    logger.info(
                        f"[AUTO-APPLY] {'OK' if apply_result.success else 'FAIL'} "
                        f"{job.title} — {apply_result.message}"
                    )
                except asyncio.TimeoutError:
                    results.append({"job_id": job.id, "title": job.title, "success": False, "message": "Timeout"})
                except Exception as e:
                    results.append({"job_id": job.id, "title": job.title, "success": False, "message": str(e)})
                finally:
                    if ctx_browser:
                        await ctx_browser.close()
                    elif page:
                        await page.close()

            await db.commit()
        await browser.close()

    applied = sum(1 for r in results if r["success"])
    logger.info(f"[AUTO-APPLY] {applied}/{len(results)} candidaturas enviadas")
    return {"status": "success", "applied": applied, "failed": len(results) - applied, "details": results}


# ─── Email apply pipeline ─────────────────────────────────────────────────────

async def perform_email_apply(ctx, job_ids: list[str], user_id: str, subject: str, body: str):
    import aiosmtplib
    from email.message import EmailMessage
    from sqlalchemy import select

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")

    if not smtp_user or not smtp_password:
        logger.error("[EMAIL] SMTP não configurado")
        return {"status": "error", "message": "SMTP nao configurado"}

    template_vars = await _fetch_template_vars(user_id)
    applied, failed = [], []

    async with SessionLocal() as db:
        result = await db.execute(
            select(Job).where(Job.id.in_(job_ids), Job.owner_id == user_id)
        )
        all_jobs = result.scalars().all()

        for job in all_jobs:
            if not job.application_email:
                failed.append(job.id)
                continue
            try:
                job_vars = _SafeFormatDict({
                    **template_vars,
                    "job_title": job.title,
                    "company": job.company or "a empresa",
                })
                msg = EmailMessage()
                msg["From"] = smtp_user
                msg["To"] = job.application_email
                msg["Subject"] = subject.format_map(job_vars)
                msg.set_content(body.format_map(job_vars))

                await aiosmtplib.send(
                    msg, hostname=smtp_host, port=smtp_port,
                    username=smtp_user, password=smtp_password, start_tls=True,
                )
                job.status = "Aplicada"
                applied.append(job.id)
            except Exception as e:
                logger.error(f"[EMAIL] Falha para {job.application_email}: {e}")
                failed.append(job.id)

        await db.commit()

    return {"status": "success", "applied": len(applied), "failed": len(failed)}


class WorkerSettings:
    functions = [perform_scraping, perform_auto_apply, perform_email_apply]
    redis_settings = RedisSettings(host="redis", port=6379)
