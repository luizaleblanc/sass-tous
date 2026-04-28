import logging
import httpx
from datetime import datetime, timedelta
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout
from .base import ScrapedJob, detect_seniority, detect_stacks, detect_location_type, detect_work_modality

logger = logging.getLogger(__name__)
PLATFORM = "gupy"

# Titles that indicate talent banks / evergreen pools — not active openings
_EXCLUDE_TITLES = {
    "banco de talentos",
    "talent pool",
    "talent bank",
    "banco de cv",
    "banco de currículos",
    "banco de curriculos",
    "cadastro de talentos",
    "reserva de talentos",
}


def _is_active_opening(title: str) -> bool:
    lower = title.lower()
    return not any(kw in lower for kw in _EXCLUDE_TITLES)


async def scrape(page: Page, url: str, limit: int = 15) -> list[ScrapedJob]:
    if "gupy.io/vagas" in url or "portal.api.gupy.io" in url:
        from urllib.parse import urlparse, parse_qs
        qs = parse_qs(urlparse(url).query)
        keyword = qs.get("jobName", qs.get("q", [""]))[0]
        return await _scrape_api(keyword, limit)

    return await _scrape_page(page, url, limit)


async def _scrape_api(keyword: str = "", limit: int = 15) -> list[ScrapedJob]:
    # Only fetch jobs published in the last 45 days
    cutoff = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%dT00:00:00.000Z")

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://portal.api.gupy.io/api/v1/jobs",
                params={
                    "jobName": keyword,
                    "limit": limit * 3,  # fetch extra to compensate for filtered-out entries
                    "offset": 0,
                    "publishedDateAfter": cutoff,
                },
                headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.error(f"[gupy] Falha na API: {e}")
        return []

    jobs = []
    for item in data.get("data", []):
        title = item.get("name", "Sem título")

        if not _is_active_opening(title):
            logger.debug(f"[gupy] Pulando talent pool: {title}")
            continue

        company = item.get("company") or {}
        company_name = company.get("name", "") if isinstance(company, dict) else str(company)
        job_url = item.get("jobUrl") or f"https://gupy.io/vagas/{item.get('id', '')}"
        description = item.get("description", "")
        corpus = f"{title} {description}"

        jobs.append(ScrapedJob(
            title=title,
            company=company_name,
            url=job_url,
            platform=PLATFORM,
            application_type="platform",
            seniority=detect_seniority(corpus),
            stacks=detect_stacks(corpus),
            location_type=detect_location_type(corpus, PLATFORM),
            work_modality=detect_work_modality(corpus, PLATFORM),
        ))

        if len(jobs) >= limit:
            break

    logger.info(f"[gupy-api] {len(jobs)} vagas ativas extraídas (keyword={keyword!r})")
    return jobs


async def _scrape_page(page: Page, url: str, limit: int = 15) -> list[ScrapedJob]:
    await page.goto(url, wait_until="domcontentloaded", timeout=15000)
    try:
        await page.wait_for_selector("[data-testid='job-list-item'], .sc-fzoLsD", timeout=7000)
    except PlaywrightTimeout:
        logger.warning(f"[gupy] Nenhuma vaga encontrada em {url}")
        return []

    items = await page.locator("[data-testid='job-list-item']").all()
    if not items:
        items = await page.locator(".sc-fzoLsD").all()

    jobs = []
    for item in items[:limit]:
        try:
            title = await item.locator("h3, h2").first.inner_text(timeout=2000)
            if not _is_active_opening(title):
                continue
            href = await item.locator("a").first.get_attribute("href") or ""
            job_url = href if href.startswith("http") else f"{url.rstrip('/')}{href}"
            jobs.append(ScrapedJob(
                title=title.strip(),
                company="",
                url=job_url,
                platform=PLATFORM,
                application_type="platform",
                seniority=detect_seniority(title),
                stacks=detect_stacks(title),
                location_type=detect_location_type(title, PLATFORM),
                work_modality=detect_work_modality(title, PLATFORM),
            ))
        except Exception:
            continue

    logger.info(f"[gupy-page] {len(jobs)} vagas extraídas")
    return jobs
