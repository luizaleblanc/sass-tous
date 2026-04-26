import logging
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from arq.connections import RedisSettings
from .database import SessionLocal
from .models import Job

logger = logging.getLogger(__name__)


async def perform_scraping(ctx, target_url: str, user_id: str):
    logger.info(f"[WORKER] Iniciando scraping em: {target_url}")
    jobs_saved = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )

        await page.goto(target_url, wait_until="domcontentloaded", timeout=30000)

        # Espera a lista de vagas carregar antes de tentar ler
        try:
            await page.wait_for_selector("tr.job", timeout=10000)
        except PlaywrightTimeout:
            logger.warning("[WORKER] Seletor 'tr.job' nao encontrado — verifique o site alvo.")
            await browser.close()
            return {"status": "error", "message": "Nenhuma vaga encontrada na pagina"}

        job_rows = await page.locator("tr.job").all()
        logger.info(f"[WORKER] {len(job_rows)} linhas de vaga encontradas")

        vagas = []
        for row in job_rows[:15]:  # limita a 15 por execucao
            try:
                title = await row.locator("[itemprop='title']").inner_text(timeout=2000)
                company = await row.locator("[itemprop='name']").inner_text(timeout=2000)
                job_path = await row.get_attribute("data-url") or ""
                job_url = (
                    f"https://remoteok.com{job_path}"
                    if job_path.startswith("/")
                    else job_path or target_url
                )
                vagas.append({"title": title.strip(), "company": company.strip(), "url": job_url})
            except PlaywrightTimeout:
                # linha sem os campos esperados, ignora
                continue

        await browser.close()

    async with SessionLocal() as db:
        for vaga in vagas:
            nova_vaga = Job(
                title=vaga["title"],
                company=vaga["company"],
                url=vaga["url"],
                owner_id=user_id,
            )
            db.add(nova_vaga)
            jobs_saved += 1

        await db.commit()

    logger.info(f"[WORKER] {jobs_saved} vagas salvas no banco para user {user_id}")
    return {"status": "success", "jobs_saved": jobs_saved}


class WorkerSettings:
    functions = [perform_scraping]
    redis_settings = RedisSettings(host="redis", port=6379)
