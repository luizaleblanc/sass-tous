import logging
from playwright.async_api import Page
from .base import ScrapedJob

logger = logging.getLogger(__name__)
PLATFORM = "glassdoor"


async def scrape(page: Page, url: str, limit: int = 15) -> list[ScrapedJob]:
    """
    Glassdoor requires login and has Cloudflare protection — skipping silently.
    """
    logger.info("[glassdoor] Plataforma requer login, pulando")
    return []
