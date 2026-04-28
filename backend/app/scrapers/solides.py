import logging
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout
from .base import ScrapedJob, detect_seniority, detect_stacks, detect_location_type, detect_work_modality

logger = logging.getLogger(__name__)
PLATFORM = "solides"


async def scrape(page: Page, url: str, limit: int = 15) -> list[ScrapedJob]:
    await page.goto(url, wait_until="domcontentloaded", timeout=15000)
    try:
        await page.wait_for_selector(".job-card, [class*='job-card'], [class*='vacancy-card']", timeout=7000)
    except PlaywrightTimeout:
        logger.warning(f"[solides] Nenhuma vaga encontrada em {url}")
        return []

    cards = await page.locator(".job-card, [class*='job-card'], [class*='vacancy-card']").all()
    jobs = []

    for card in cards[:limit]:
        try:
            title = await card.locator("h2, h3, [class*='title'], [class*='nome']").first.inner_text(timeout=2000)
            company = ""
            try:
                company = await card.locator("[class*='company'], [class*='empresa']").first.inner_text(timeout=1000)
            except Exception:
                pass

            href = await card.locator("a").first.get_attribute("href") or ""
            job_url = href if href.startswith("http") else f"https://jobs.solides.com.br{href}" if href else url

            description = ""
            try:
                description = await card.locator("[class*='description'], [class*='info']").inner_text(timeout=500)
            except Exception:
                pass

            corpus = f"{title} {description}"
            jobs.append(ScrapedJob(
                title=title.strip(),
                company=company.strip(),
                url=job_url,
                platform=PLATFORM,
                application_type="platform",
                seniority=detect_seniority(corpus),
                stacks=detect_stacks(corpus),
                location_type=detect_location_type(corpus, PLATFORM),
                work_modality=detect_work_modality(corpus, PLATFORM),
            ))
        except Exception:
            continue

    logger.info(f"[solides] {len(jobs)} vagas extraídas")
    return jobs
