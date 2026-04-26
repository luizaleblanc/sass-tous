import logging
from playwright.async_api import Page
from .base import ScrapedJob
from . import remoteok, gupy, indeed, linkedin, programathor, infojobs, solides, glassdoor

logger = logging.getLogger(__name__)


def detect_platform(url: str) -> str:
    u = url.lower()
    if "remoteok.com" in u:
        return "remoteok"
    if "gupy.io" in u or "gupy.com" in u:
        return "gupy"
    if "indeed.com" in u:
        return "indeed"
    if "linkedin.com" in u:
        return "linkedin"
    if "programathor.com" in u:
        return "programathor"
    if "infojobs.com" in u:
        return "infojobs"
    if "solides.com" in u or "solides.io" in u:
        return "solides"
    if "glassdoor.com" in u:
        return "glassdoor"
    return "generic"


async def dispatch(page: Page, url: str, limit: int = 15) -> list[ScrapedJob]:
    platform = detect_platform(url)
    logger.info(f"[dispatcher] plataforma={platform} url={url}")

    if platform == "remoteok":
        return await remoteok.scrape(page, url, limit)
    if platform == "gupy":
        return await gupy.scrape(page, url, limit)
    if platform == "indeed":
        return await indeed.scrape(page, url, limit)
    if platform == "linkedin":
        return await linkedin.scrape(page, url, limit)
    if platform == "programathor":
        return await programathor.scrape(page, url, limit)
    if platform == "infojobs":
        return await infojobs.scrape(page, url, limit)
    if platform == "solides":
        return await solides.scrape(page, url, limit)
    if platform == "glassdoor":
        return await glassdoor.scrape(page, url, limit)

    logger.warning(f"[dispatcher] Sem scraper para '{platform}', ignorando {url}")
    return []
