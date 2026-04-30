import logging
import httpx
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout
from .base import ScrapedJob, extract_email, detect_seniority, detect_stacks, detect_location_type, detect_work_modality

logger = logging.getLogger(__name__)
PLATFORM = "meupadrinho"


async def scrape(page: Page, url: str, limit: int = 15) -> list[ScrapedJob]:
    try:
        return await _scrape_api(url, limit)
    except Exception as e:
        logger.warning(f"[meupadrinho] API falhou ({e}), tentando Playwright")
        return await _scrape_page(page, url, limit)


async def _scrape_api(url: str, limit: int = 15) -> list[ScrapedJob]:
    from urllib.parse import urlparse, parse_qs
    qs = parse_qs(urlparse(url).query)
    query = qs.get("search", qs.get("q", [""]))[0]

    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://meupadrinho.com/",
    }) as client:
        resp = await client.get(
            "https://meupadrinho.com/api/jobs",
            params={"search": query, "limit": limit, "page": 1},
        )
        resp.raise_for_status()

        if "text/html" in resp.headers.get("content-type", ""):
            raise RuntimeError("Meu Padrinho retornou HTML — endpoint da API pode ter mudado")

        data = resp.json()

    jobs = []
    for item in data.get("data", data.get("jobs", [])):
        title = item.get("title") or item.get("name", "Sem título")
        company_raw = item.get("company") or {}
        company_name = company_raw.get("name", "") if isinstance(company_raw, dict) else str(company_raw)
        job_url = item.get("url") or f"https://meupadrinho.com/vagas/{item.get('id', '')}"
        description = item.get("description", "")
        corpus = f"{title} {company_name} {description}"
        app_email = extract_email(description)

        jobs.append(ScrapedJob(
            title=title,
            company=company_name,
            url=job_url,
            platform=PLATFORM,
            application_type="email" if app_email else "platform",
            application_email=app_email,
            seniority=detect_seniority(corpus),
            stacks=detect_stacks(corpus),
            location_type=detect_location_type(corpus, PLATFORM),
            work_modality=detect_work_modality(corpus, PLATFORM),
        ))

        if len(jobs) >= limit:
            break

    logger.info(f"[meupadrinho-api] {len(jobs)} vagas extraídas (query={query!r})")
    return jobs


async def _scrape_page(page: Page, url: str, limit: int = 15) -> list[ScrapedJob]:
    await page.goto(url, wait_until="domcontentloaded", timeout=15000)

    card_selector = "[class*='job-card'], [class*='JobCard'], [class*='vaga'], article"
    try:
        await page.wait_for_selector(card_selector, timeout=7000)
    except PlaywrightTimeout:
        logger.warning(f"[meupadrinho] Nenhuma vaga em {url}")
        return []

    cards = await page.locator(card_selector).all()
    jobs = []

    for card in cards[:limit]:
        try:
            title = (await card.locator(
                "h2, h3, [class*='title'], [class*='titulo']"
            ).first.inner_text(timeout=2000)).strip()

            company = ""
            try:
                company = (await card.locator(
                    "[class*='company'], [class*='empresa']"
                ).first.inner_text(timeout=1000)).strip()
            except Exception:
                pass

            href = await card.locator("a").first.get_attribute("href") or ""
            job_url = (
                f"https://meupadrinho.com{href}" if href.startswith("/")
                else href or url
            )

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

    logger.info(f"[meupadrinho-page] {len(jobs)} vagas extraídas")
    return jobs
