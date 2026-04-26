import logging
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout
from .base import ScrapedJob, extract_email, detect_seniority, detect_stacks

logger = logging.getLogger(__name__)
PLATFORM = "indeed"


async def scrape(page: Page, url: str, limit: int = 15) -> list[ScrapedJob]:
    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    try:
        await page.wait_for_selector(".job_seen_beacon, .tapItem, [data-jk]", timeout=10000)
    except PlaywrightTimeout:
        logger.warning("[indeed] Sem vagas — Cloudflare pode estar bloqueando")
        return []

    cards = await page.locator(".job_seen_beacon, .tapItem").all()
    jobs = []

    for card in cards[:limit]:
        try:
            title = await card.locator(".jobTitle span, h2.jobTitle").first.inner_text(timeout=2000)
            company = await card.locator(".companyName, [data-testid='company-name']").first.inner_text(timeout=2000)
            href = await card.locator("a[data-jk], a.jcs-JobTitle").first.get_attribute("href") or ""
            job_url = f"https://br.indeed.com{href}" if href.startswith("/") else href

            description = ""
            try:
                description = await card.locator(".job-snippet").inner_text(timeout=500)
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
        except Exception:
            continue

    logger.info(f"[indeed] {len(jobs)} vagas extraídas")
    return jobs
