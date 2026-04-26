import logging
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout
from .base import ScrapedJob, detect_seniority, detect_stacks, detect_location_type, detect_work_modality

logger = logging.getLogger(__name__)
PLATFORM = "linkedin"


async def scrape(page: Page, url: str, limit: int = 15) -> list[ScrapedJob]:
    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    try:
        await page.wait_for_selector(".job-search-card, .base-card", timeout=12000)
    except PlaywrightTimeout:
        logger.warning("[linkedin] Nenhum card encontrado — pode exigir login")
        return []

    cards = await page.locator(".job-search-card, .base-card").all()
    jobs = []

    for card in cards[:limit]:
        try:
            title = await card.locator(
                "h3.base-search-card__title, .job-search-card__title"
            ).inner_text(timeout=2000)
            company = await card.locator(
                "h4.base-search-card__subtitle, .job-search-card__company-name"
            ).inner_text(timeout=2000)
            href = await card.locator(
                "a.base-card__full-link, a[data-tracking-control-name]"
            ).first.get_attribute("href") or url

            jobs.append(ScrapedJob(
                title=title.strip(),
                company=company.strip(),
                url=href,
                platform=PLATFORM,
                application_type="platform",
                seniority=detect_seniority(title),
                stacks=detect_stacks(title),
                location_type=detect_location_type(title, PLATFORM),
                work_modality=detect_work_modality(title, PLATFORM),
            ))
        except Exception:
            continue

    logger.info(f"[linkedin] {len(jobs)} vagas extraídas")
    return jobs
