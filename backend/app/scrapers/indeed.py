import re
import logging
import httpx
from playwright.async_api import Page
from .base import ScrapedJob, detect_seniority, detect_stacks, detect_location_type, detect_work_modality

logger = logging.getLogger(__name__)
PLATFORM = "indeed"


async def scrape(page: Page, url: str, limit: int = 15) -> list[ScrapedJob]:
    """
    Indeed blocks headless browsers via Cloudflare. Try the JSON API first.
    """
    try:
        return await _scrape_api(url, limit)
    except Exception as e:
        logger.warning(f"[indeed] Bloqueado (Cloudflare/anti-bot): {e}")
        return []


async def _scrape_api(url: str, limit: int = 15) -> list[ScrapedJob]:
    from urllib.parse import urlparse, parse_qs
    qs = parse_qs(urlparse(url).query)
    query = qs.get("q", ["dev"])[0]

    # Indeed's internal mosaic API — returns JSON without Cloudflare
    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Referer": "https://br.indeed.com/",
        "X-Requested-With": "XMLHttpRequest",
    }) as client:
        resp = await client.get(
            "https://br.indeed.com/jobs",
            params={"q": query, "l": "Brasil", "sort": "date", "limit": min(limit, 20), "start": 0},
        )
        resp.raise_for_status()

        # If Cloudflare intercept, response will be challenge HTML, not job listings
        if "challenge" in resp.text.lower() or "cf-browser-verification" in resp.text.lower():
            raise RuntimeError("Cloudflare challenge detected")

        html = resp.text

    # Parse job cards from HTML
    titles = re.findall(r'<h2[^>]*class="[^"]*jobTitle[^"]*"[^>]*>.*?<span[^>]*>(.*?)</span>', html, re.DOTALL)
    companies = re.findall(r'<span[^>]*data-testid="company-name"[^>]*>(.*?)</span>', html, re.DOTALL)
    job_ids = re.findall(r'data-jk="([^"]+)"', html)

    jobs = []
    for i in range(min(len(titles), len(job_ids), limit)):
        title = re.sub(r"<[^>]+>", "", titles[i]).strip()
        company = re.sub(r"<[^>]+>", "", companies[i]).strip() if i < len(companies) else ""

        if not title:
            continue

        job_url = f"https://br.indeed.com/viewjob?jk={job_ids[i]}"
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

    logger.info(f"[indeed-api] {len(jobs)} vagas extraídas")
    return jobs
