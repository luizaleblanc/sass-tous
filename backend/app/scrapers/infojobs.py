import logging
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout
from .base import ScrapedJob, extract_email, detect_seniority, detect_stacks, detect_location_type, detect_work_modality

logger = logging.getLogger(__name__)
PLATFORM = "infojobs"


async def scrape(page: Page, url: str, limit: int = 15) -> list[ScrapedJob]:
    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    try:
        await page.wait_for_selector(".ij-offersearch-list-item, .offer-item, [class*='offer']", timeout=10000)
    except PlaywrightTimeout:
        logger.warning(f"[infojobs] Nenhuma vaga encontrada em {url}")
        return []

    cards = await page.locator(".ij-offersearch-list-item, .offer-item, [class*='offer']").all()
    jobs = []

    for card in cards[:limit]:
        try:
            title = await card.locator("h2, h3, .ij-offersearch-item-title, [class*='title']").first.inner_text(timeout=2000)
            company = ""
            try:
                company = await card.locator(".ij-offersearch-item-company, [class*='company']").first.inner_text(timeout=1000)
            except Exception:
                pass

            href = await card.locator("a").first.get_attribute("href") or ""
            job_url = f"https://www.infojobs.com.br{href}" if href.startswith("/") else href or url

            description = ""
            try:
                description = await card.locator("[class*='description'], [class*='summary']").inner_text(timeout=500)
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
        except Exception:
            continue

    logger.info(f"[infojobs] {len(jobs)} vagas extraídas")
    return jobs
