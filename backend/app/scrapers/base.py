import re
from dataclasses import dataclass
from typing import Optional

EMAIL_RE = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')
_NOISE = {"noreply", "no-reply", "support", "info", "contact", "privacy", "legal"}


@dataclass
class ScrapedJob:
    title: str
    company: str
    url: str
    platform: str
    application_type: str = "platform"  # "email" | "platform"
    application_email: Optional[str] = None


def extract_email(text: str) -> Optional[str]:
    for email in EMAIL_RE.findall(text):
        if not any(n in email.split("@")[0].lower() for n in _NOISE):
            return email
    return None
