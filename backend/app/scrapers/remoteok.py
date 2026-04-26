import logging
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout
from .base import ScrapedJob, extract_email, detect_seniority, detect_stacks

logger = logging.getLogger(__name__)
PLATFORM = "remoteok"


async def scrape(page: Page, url: str, limit: int = 15) -> list[ScrapedJob]:
    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    try:
        await page.wait_for_selector("tr.job", timeout=10000)
    except PlaywrightTimeout:
        logger.warning(f"[remoteok] Nenhuma vaga encontrada em {url}")
        return []

    rows = await page.locator("tr.job").all()
    jobs = []

    for row in rows[:limit]:
        try:
            title = await row.locator("[itemprop='title']").inner_text(timeout=2000)
            company = await row.locator("[itemprop='name']").inner_text(timeout=2000)
            job_path = await row.get_attribute("data-url") or ""
            job_url = f"https://remoteok.com{job_path}" if job_path.startswith("/") else job_path or url

            description = ""
            try:
                description = await row.locator(".description").inner_text(timeout=500)
            except Exception:
                pass

            corpus = f"{title} {description}"
            app_email = extract_email(description)
            jobs.append(ScrapedJob(
                title=title.strip(),
                company=company.strip(),
                url=job_url,
                platform=PLATFORM,
                application_type="email" if app_email else "platform",
                application_email=app_email,
                seniority=detect_seniority(corpus),
                stacks=detect_stacks(corpus),
            ))
        except PlaywrightTimeout:
            continue

    logger.info(f"[remoteok] {len(jobs)} vagas extraídas")
    return jobs
