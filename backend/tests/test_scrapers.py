import pytest
from app.scrapers.base import (
    detect_seniority,
    detect_stacks,
    detect_location_type,
    detect_work_modality,
    extract_email,
)


# --- detect_seniority ---

def test_seniority_senior():
    assert detect_seniority("Senior Python Developer") == "Senior"

def test_seniority_senior_sr():
    assert detect_seniority("Sr. Software Engineer") == "Senior"

def test_seniority_lead():
    assert detect_seniority("Tech Lead Backend") == "Senior"

def test_seniority_staff():
    assert detect_seniority("Staff Engineer - Platform") == "Senior"

def test_seniority_pleno():
    assert detect_seniority("Desenvolvedor Pleno React") == "Pleno"

def test_seniority_mid():
    assert detect_seniority("Mid-level Full Stack Developer") == "Pleno"

def test_seniority_junior():
    assert detect_seniority("Junior Frontend Engineer") == "Junior"

def test_seniority_jr():
    assert detect_seniority("Jr. Data Analyst") == "Junior"

def test_seniority_trainee():
    assert detect_seniority("Programa Trainee Tecnologia 2025") == "Trainee"

def test_seniority_estagio():
    assert detect_seniority("Estágio em Desenvolvimento de Software") == "Estágio"

def test_seniority_internship():
    assert detect_seniority("Software Engineering Internship") == "Estágio"

def test_seniority_none():
    assert detect_seniority("Product Manager - Fintech") is None

def test_seniority_senior_beats_junior():
    assert detect_seniority("Senior Engineer managing Junior team") == "Senior"


# --- detect_stacks ---

def test_stacks_python():
    assert "python" in detect_stacks("We need a Python developer")

def test_stacks_react():
    assert "react" in detect_stacks("Frontend with React and TypeScript")

def test_stacks_typescript():
    assert "typescript" in detect_stacks("TypeScript experience required")

def test_stacks_multiple():
    stacks = detect_stacks("Full stack: Python, Django, React, Docker, AWS")
    assert "python" in stacks
    assert "django" in stacks
    assert "react" in stacks
    assert "docker" in stacks
    assert "aws" in stacks

def test_stacks_ux_ui():
    stacks = detect_stacks("UX Designer with Figma and prototyping skills")
    assert "ux" in stacks
    assert "figma" in stacks
    assert "prototyping" in stacks

def test_stacks_no_false_positive_go():
    stacks = detect_stacks("Good communication skills required")
    assert "golang" not in stacks

def test_stacks_golang_explicit():
    assert "golang" in detect_stacks("Backend engineer with Golang experience")

def test_stacks_kubernetes():
    assert "kubernetes" in detect_stacks("Deploy using Kubernetes and Docker")

def test_stacks_empty():
    assert detect_stacks("Customer success manager needed") == []

def test_stacks_machine_learning():
    assert "machine learning" in detect_stacks("Machine Learning engineer with PyTorch")


# --- detect_location_type ---

def test_location_nacional_default():
    assert detect_location_type("Desenvolvedor Python - São Paulo") == "nacional"

def test_location_brasil_keyword():
    assert detect_location_type("Vaga para trabalhar no Brasil") == "nacional"

def test_location_internacional_worldwide():
    assert detect_location_type("Remote position open worldwide") == "internacional"

def test_location_internacional_global():
    assert detect_location_type("Global company seeking engineers") == "internacional"

def test_location_remoteok_platform():
    assert detect_location_type("Python Developer", platform="remoteok") == "internacional"

def test_location_glassdoor_platform():
    assert detect_location_type("Software Engineer", platform="glassdoor") == "internacional"

def test_location_brasil_overrides_platform():
    assert detect_location_type("Vaga em São Paulo Brasil", platform="remoteok") == "nacional"


# --- detect_work_modality ---

def test_modality_remoto_keyword():
    assert detect_work_modality("100% remoto, home office") == "remoto"

def test_modality_remote_english():
    assert detect_work_modality("Fully remote position") == "remoto"

def test_modality_home_office():
    assert detect_work_modality("Trabalho em home office") == "remoto"

def test_modality_hibrido():
    assert detect_work_modality("Modelo híbrido, 3 dias no escritório") == "hibrido"

def test_modality_hybrid_english():
    assert detect_work_modality("Hybrid work model available") == "hibrido"

def test_modality_presencial_default():
    assert detect_work_modality("Desenvolvedor para trabalhar em Curitiba") == "presencial"

def test_modality_remoteok_platform():
    assert detect_work_modality("Python Developer", platform="remoteok") == "remoto"


# --- extract_email ---

def test_extract_email_found():
    assert extract_email("Send CV to jobs@company.com for details") == "jobs@company.com"

def test_extract_email_filters_noreply():
    assert extract_email("Contact noreply@company.com") is None

def test_extract_email_filters_support():
    assert extract_email("Questions? support@company.com") is None

def test_extract_email_none():
    assert extract_email("Apply via the platform button below") is None

def test_extract_email_multiple_returns_first_valid():
    result = extract_email("noreply@x.com or hr@company.com")
    assert result == "hr@company.com"
