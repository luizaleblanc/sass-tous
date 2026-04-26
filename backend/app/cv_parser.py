import re
import io
from typing import Optional
from .scrapers.base import detect_stacks, EMAIL_RE

_PHONE_RE = re.compile(r'(\+?[\d][\d\s\-\(\)]{7,14}[\d])')
_LINKEDIN_RE = re.compile(r'linkedin\.com/in/[\w\-]+', re.I)
_GITHUB_RE = re.compile(r'github\.com/[\w\-]+', re.I)


def _extract_text_pdf(content: bytes) -> str:
    import pdfplumber
    text = ""
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text += (page.extract_text() or "") + "\n"
    return text


def _extract_text_docx(content: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs)


def _extract_text_txt(content: bytes) -> str:
    return content.decode("utf-8", errors="ignore")


def parse_cv(content: bytes, filename: str) -> dict:
    name = filename.lower()
    if name.endswith(".pdf"):
        raw_text = _extract_text_pdf(content)
    elif name.endswith((".docx", ".doc")):
        raw_text = _extract_text_docx(content)
    else:
        raw_text = _extract_text_txt(content)

    emails = EMAIL_RE.findall(raw_text)
    email: Optional[str] = emails[0] if emails else None

    phone_match = _PHONE_RE.search(raw_text)
    phone: Optional[str] = phone_match.group(1).strip() if phone_match else None

    linkedin_match = _LINKEDIN_RE.search(raw_text)
    linkedin: Optional[str] = f"https://{linkedin_match.group()}" if linkedin_match else None

    github_match = _GITHUB_RE.search(raw_text)
    github: Optional[str] = f"https://{github_match.group()}" if github_match else None

    stacks = detect_stacks(raw_text)

    return {
        "raw_text": raw_text,
        "email": email,
        "phone": phone,
        "linkedin": linkedin,
        "github": github,
        "stacks": stacks,
    }
