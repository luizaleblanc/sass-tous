import re
import logging
import httpx
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout
from .base import ScrapedJob, extract_email, detect_seniority, detect_stacks, detect_location_type, detect_work_modality

logger = logging.getLogger(__name__)
PLATFORM = "remoteok"


async def scrape(page: Page, url: str, limit: int = 15) -> list[ScrapedJob]:
    try:
        return await _scrape_api(url, limit)
    except Exception as e:
        logger.warning(f"[remoteok] API falhou ({e}), tentando Playwright")
        return await _scrape_page(page, url, limit)


async def _scrape_api(url: str, limit: int = 15) -> list[ScrapedJob]:
    tag = "dev"
    m = re.search(r"/remote-(.+?)-jobs", url)
    if m:
        tag = m.group(1)

    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers={
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
    }) as client:
        resp = await client.get("https://remoteok.com/api", params={"tag": tag})
        resp.raise_for_status()
        data = resp.json()

    jobs = []
    for item in data[1:limit + 1]:  # data[0] is metadata
        if not isinstance(item, dict):
            continue
        title = item.get("position", "Sem título")
        company = item.get("company", "")
        job_url = item.get("url", "")
        description = item.get("description", "")
        tags = item.get("tags") or []
        corpus = f"{title} {description} {' '.join(tags)}"

        if not job_url.startswith("http"):
            job_url = f"https://remoteok.com{job_url}"

        jobs.append(ScrapedJob(
            title=title,
            company=company,
            url=job_url,
            platform=PLATFORM,
            application_type="platform",
            seniority=detect_seniority(corpus),
            stacks=detect_stacks(corpus),
            location_type="internacional",
            work_modality="remoto",
        ))

    logger.info(f"[remoteok-api] {len(jobs)} vagas extraídas (tag={tag})")
    return jobs


async def _scrape_page(page: Page, url: str, limit: int = 15) -> list[ScrapedJob]:
    await page.goto(url, wait_until="domcontentloaded", timeout=15000)
    try:
        await page.wait_for_selector("tr.job", timeout=7000)
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
                location_type=detect_location_type(corpus, PLATFORM),
                work_modality=detect_work_modality(corpus, PLATFORM),
            ))
        except PlaywrightTimeout:
            continue

    logger.info(f"[remoteok] {len(jobs)} vagas extraídas")
    return jobs
