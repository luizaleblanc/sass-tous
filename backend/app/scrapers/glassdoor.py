import logging
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout
from .base import ScrapedJob, detect_seniority, detect_stacks, detect_location_type, detect_work_modality

logger = logging.getLogger(__name__)
PLATFORM = "glassdoor"


async def scrape(page: Page, url: str, limit: int = 15) -> list[ScrapedJob]:
    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    try:
        await page.wait_for_selector(
            "[data-test='jobListing'], .react-job-listing, [class*='JobCard']",
            timeout=12000,
        )
    except PlaywrightTimeout:
        logger.warning("[glassdoor] Sem vagas — pode exigir login ou estar bloqueado")
        return []

    cards = await page.locator(
        "[data-test='jobListing'], .react-job-listing, [class*='JobCard']"
    ).all()
    jobs = []

    for card in cards[:limit]:
        try:
            title = await card.locator(
                "[data-test='job-title'], [class*='JobTitle'], a[class*='jobLink']"
            ).first.inner_text(timeout=2000)
            company = ""
            try:
                company = await card.locator(
                    "[class*='EmployerName'], [data-test='employer-name']"
                ).first.inner_text(timeout=1000)
            except Exception:
                pass

            href = await card.locator("a").first.get_attribute("href") or ""
            job_url = f"https://www.glassdoor.com.br{href}" if href.startswith("/") else href or url

            description = ""
            try:
                description = await card.locator("[class*='jobDescription'], [class*='description']").inner_text(timeout=500)
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

    logger.info(f"[glassdoor] {len(jobs)} vagas extraídas")
    return jobs
