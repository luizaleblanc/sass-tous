import re
import logging
import httpx
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout
from .base import ScrapedJob, detect_seniority, detect_stacks, detect_location_type, detect_work_modality

logger = logging.getLogger(__name__)
PLATFORM = "linkedin"

_JOB_CARD = (
    ".job-search-card, "
    ".jobs-search__results-list li, "
    "[data-job-id], "
    ".scaffold-layout__list-item"
)


async def scrape(
    page: Page,
    url: str,
    limit: int = 15,
    cookies: list[dict] | None = None,
) -> list[ScrapedJob]:
    try:
        if cookies:
            # Cookies are already injected at the browser context level by the worker.
            # Switch to the Playwright path so the authenticated session is used.
            return await _scrape_authenticated(page, url, limit)
        return await _scrape_api(url, limit)
    except Exception as e:
        logger.warning(f"[linkedin] Scraping falhou ({e}), retornando vazio")
        return []


async def _scrape_api(url: str, limit: int = 15) -> list[ScrapedJob]:
    from urllib.parse import urlparse, parse_qs
    qs = parse_qs(urlparse(url).query)
    keywords = qs.get("keywords", ["dev"])[0]

    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "Referer": "https://www.linkedin.com/jobs/",
    }) as client:
        resp = await client.get(
            "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search",
            params={"keywords": keywords, "location": "Brazil", "start": 0, "count": min(limit, 25)},
        )
        resp.raise_for_status()
        html = resp.text

    titles = re.findall(
        r'<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>\s*(.*?)\s*</h3>',
        html, re.DOTALL,
    )
    companies = re.findall(
        r'<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>.*?<a[^>]*>(.*?)</a>',
        html, re.DOTALL,
    )
    job_urls = re.findall(
        r'href="(https://www\.linkedin\.com/jobs/view/[^"?]+)',
        html,
    )

    jobs = []
    for i in range(min(len(titles), len(job_urls), limit)):
        title = re.sub(r"<[^>]+>", "", titles[i]).strip()
        company = re.sub(r"<[^>]+>", "", companies[i]).strip() if i < len(companies) else ""

        if not title:
            continue

        corpus = f"{title} {company}"
        jobs.append(ScrapedJob(
            title=title,
            company=company,
            url=job_urls[i],
            platform=PLATFORM,
            application_type="platform",
            seniority=detect_seniority(corpus),
            stacks=detect_stacks(corpus),
            location_type=detect_location_type(corpus, PLATFORM),
            work_modality=detect_work_modality(corpus, PLATFORM),
        ))

    logger.info(f"[linkedin-api] {len(jobs)} vagas extraídas (keywords={keywords})")
    return jobs


async def _scrape_authenticated(page: Page, url: str, limit: int) -> list[ScrapedJob]:
    """Uses an authenticated Playwright session to scrape LinkedIn job listings.

    Cookies must already be injected at the browser context level by the caller.
    """
    await page.goto(url, wait_until="domcontentloaded", timeout=20000)

    try:
        await page.wait_for_selector(_JOB_CARD, timeout=12000)
    except PlaywrightTimeout:
        logger.warning(f"[linkedin-auth] Sem resultados em {url} (possível bloqueio ou sessão expirada)")
        return []

    cards = await page.locator(_JOB_CARD).all()
    jobs = []

    for card in cards[:limit]:
        try:
            title = (await card.locator(
                ".base-search-card__title, .job-card-list__title, h3, h4"
            ).first.inner_text(timeout=2000)).strip()

            company = ""
            try:
                company = (await card.locator(
                    ".base-search-card__subtitle, .job-card-container__company-name, [class*='company']"
                ).first.inner_text(timeout=1000)).strip()
            except Exception:
                pass

            href = await card.locator("a").first.get_attribute("href", timeout=1000) or ""
            job_url = href.split("?")[0] if href.startswith("http") else f"https://www.linkedin.com{href.split('?')[0]}"

            if not title:
                continue

            corpus = f"{title} {company}"
            jobs.append(ScrapedJob(
                title=title,
                company=company,
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

    logger.info(f"[linkedin-auth] {len(jobs)} vagas extraídas (autenticado)")
    return jobs
