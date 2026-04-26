import re
from dataclasses import dataclass, field
from typing import Optional

EMAIL_RE = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')
_NOISE = {"noreply", "no-reply", "support", "info", "contact", "privacy", "legal"}

_SENIOR_TERMS = {"senior", "sr", "lead", "staff", "principal", "architect", "head", "director", "vp"}
_PLENO_TERMS  = {"pleno", "mid", "mid-level", "intermediate", "ii", "iii"}
_JUNIOR_TERMS = {"junior", "jr", "entry", "trainee", "estagiario", "estagiária", "internship", "intern", "associate"}

TECH_STACKS = [
    "python", "javascript", "typescript", "java", "golang", "rust", "php",
    "ruby", "swift", "kotlin", "scala", "dart", "elixir",
    "react", "vue", "angular", "nextjs", "svelte", "nuxt",
    "django", "fastapi", "flask", "spring", "nodejs", "express", "laravel", "rails", "nestjs",
    "react native", "flutter",
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra",
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible",
    "graphql", "grpc",
    "selenium", "cypress", "jest", "pytest", "junit", "playwright",
    "tensorflow", "pytorch", "machine learning",
    "devops", "sre", "datadog", "kafka",
]


@dataclass
class ScrapedJob:
    title: str
    company: str
    url: str
    platform: str
    application_type: str = "platform"
    application_email: Optional[str] = None
    seniority: Optional[str] = None
    stacks: list[str] = field(default_factory=list)


def extract_email(text: str) -> Optional[str]:
    for email in EMAIL_RE.findall(text):
        if not any(n in email.split("@")[0].lower() for n in _NOISE):
            return email
    return None


def detect_seniority(text: str) -> Optional[str]:
    tokens = set(re.split(r'[\s\-/|,]+', text.lower()))
    if tokens & _SENIOR_TERMS:
        return "Senior"
    if tokens & _PLENO_TERMS:
        return "Pleno"
    if tokens & _JUNIOR_TERMS:
        return "Junior"
    return None


def detect_stacks(text: str) -> list[str]:
    lower = text.lower()
    found = []
    for stack in TECH_STACKS:
        if len(stack) <= 3:
            if re.search(r'(?<![a-z0-9])' + re.escape(stack) + r'(?![a-z0-9])', lower):
                found.append(stack)
        else:
            if stack in lower:
                found.append(stack)
    return found
