import re
from dataclasses import dataclass, field
from typing import Optional

EMAIL_RE = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')
_NOISE = {"noreply", "no-reply", "support", "info", "contact", "privacy", "legal"}

# Multi-word and long signals checked via substring match (lowercase title)
_TECH_TITLE_SIGNALS = frozenset({
    # Portuguese tech roles
    "desenvolvedor", "desenvolvedora", "programador", "programadora",
    "engenheiro de software", "engenheira de software",
    "engenheiro de dados", "engenheira de dados",
    "analista de sistemas", "analista de dados", "analista de segurança",
    "arquiteto de software", "arquiteta de software",
    "suporte técnico", "técnico em ti", "técnica em ti",
    # English tech roles
    "developer", "engineer", "programmer", "architect",
    "software", "data scientist", "data engineer", "data analyst",
    "machine learning", "ml engineer", "ai engineer",
    "tech lead", "technical lead", "quality assurance",
    "devops", "platform engineer", "site reliability",
    "cybersecurity", "security engineer", "penetration",
    "product designer", "scrum master", "product owner",
    # Tech areas that appear in titles
    "frontend", "front-end", "backend", "back-end",
    "fullstack", "full-stack", "full stack",
    "mobile", "android", "cloud engineer",
    "database administrator", "infrastructure",
})

# Short signals (<=3 chars) — require word-boundary check to avoid false positives
_TECH_TITLE_SHORT = frozenset({"qa", "bi", "ux", "ui", "ios", "dba", "sre", "ti", "ti"})

_TECH_TITLE_SHORT_RE = re.compile(
    r'(?<![a-z0-9])(' + '|'.join(re.escape(t) for t in _TECH_TITLE_SHORT) + r')(?![a-z0-9])'
)

_SENIOR_TERMS  = {"senior", "sr", "lead", "staff", "principal", "architect", "head", "director", "vp"}
_PLENO_TERMS   = {"pleno", "mid", "mid-level", "intermediate", "ii", "iii"}
_JUNIOR_TERMS  = {"junior", "jr", "entry", "associate"}
_TRAINEE_TERMS = {"trainee"}
_ESTAGIO_TERMS = {"estágio", "estagio", "estagiário", "estagiaria", "estagiária", "internship", "intern"}

_INTERNATIONAL_TERMS = {
    "worldwide", "global", "international", "anywhere", "us-based", "usa",
    "canada", "europe", "uk-based", "latam", "latin america", "north america",
}
_BRAZIL_TERMS = {"brasil", "brazil", "são paulo", "rio de janeiro", "belo horizonte", "curitiba", "porto alegre"}

_REMOTE_WORK_TERMS  = {"remote", "remoto", "home office", "work from home", "wfh", "fully remote", "100% remote", "100% remoto", "trabalho remoto"}
_HYBRID_WORK_TERMS  = {"híbrido", "hibrido", "hybrid", "flexível", "flexivel", "modelo híbrido", "modelo hibrido"}

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
    "figma", "sketch", "adobe xd", "axure", "invision", "zeplin",
    "ux", "ui", "user experience", "user interface", "wireframe", "prototyping",
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
    location_type: str = "nacional"
    work_modality: Optional[str] = None


def extract_email(text: str) -> Optional[str]:
    for email in EMAIL_RE.findall(text):
        if not any(n in email.split("@")[0].lower() for n in _NOISE):
            return email
    return None


def detect_seniority(text: str) -> Optional[str]:
    tokens = {t.strip('.,;:()') for t in re.split(r'[\s\-/|,]+', text.lower())}
    if tokens & _SENIOR_TERMS:
        return "Senior"
    if tokens & _PLENO_TERMS:
        return "Pleno"
    if tokens & _JUNIOR_TERMS:
        return "Junior"
    if tokens & _TRAINEE_TERMS:
        return "Trainee"
    if tokens & _ESTAGIO_TERMS:
        return "Estágio"
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


def detect_location_type(text: str, platform: str = "") -> str:
    lower = text.lower()
    if any(t in lower for t in _BRAZIL_TERMS):
        return "nacional"
    if any(t in lower for t in _INTERNATIONAL_TERMS) or platform in ("remoteok", "glassdoor"):
        return "internacional"
    return "nacional"


def detect_work_modality(text: str, platform: str = "") -> str | None:
    lower = text.lower()
    if any(t in lower for t in _REMOTE_WORK_TERMS) or platform == "remoteok":
        return "remoto"
    if any(t in lower for t in _HYBRID_WORK_TERMS):
        return "hibrido"
    return None  # unknown — don't filter out by default


def is_tech_relevant(title: str, stacks: list[str]) -> bool:
    """Quality gate: the job title MUST contain a developer/engineer role signal.

    Stacks alone are intentionally not sufficient — a 'Social Media Manager'
    posting mentioning React should not pass. The title is the sole authority.
    """
    lower = title.lower()
    if _TECH_TITLE_SHORT_RE.search(lower):
        return True
    return any(signal in lower for signal in _TECH_TITLE_SIGNALS)
