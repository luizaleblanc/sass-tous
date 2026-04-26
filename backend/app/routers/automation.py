from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from ..database import get_db
from ..dependencies import get_current_user
from ..models import Job, User
from ..schemas import JobResponse, EmailApplyRequest, PlatformApplyRequest, PlatformApplyResponse

router = APIRouter(prefix="/automation", tags=["Automation"])

_PLATFORM_URL = {
    "remoteok": "https://remoteok.com/remote-{slug}-jobs",
    "gupy":     "https://www.gupy.io/vagas?jobName={encoded}",
    "indeed":   "https://br.indeed.com/jobs?q={encoded}",
    "linkedin": "https://www.linkedin.com/jobs/search/?keywords={encoded}",
}


class TaskRequest(BaseModel):
    target_urls: list[str] = []
    keywords: list[str] = []
    platforms: list[str] = ["remoteok", "gupy"]


def _expand_keywords(keywords: list[str], platforms: list[str]) -> list[str]:
    urls = []
    for kw in keywords:
        slug = kw.lower().replace(" ", "-")
        encoded = kw.replace(" ", "+")
        for p in platforms:
            tpl = _PLATFORM_URL.get(p)
            if tpl:
                urls.append(tpl.format(slug=slug, encoded=encoded))
    return urls


@router.post("/start", status_code=status.HTTP_202_ACCEPTED)
async def start_automation(
    task: TaskRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    urls = list(task.target_urls) + _expand_keywords(task.keywords, task.platforms)
    if not urls:
        raise HTTPException(status_code=400, detail="Informe target_urls ou keywords")
    arq_job = await request.app.state.redis_pool.enqueue_job(
        "perform_scraping", urls, current_user.id
    )
    return {
        "message": f"Scraping enfileirado para {len(urls)} site(s).",
        "job_id": arq_job.job_id,
        "user_email": current_user.email,
    }


@router.get("/jobs/matches", response_model=list[JobResponse])
async def get_matching_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.seniority and not current_user.stacks:
        raise HTTPException(
            status_code=400,
            detail="Configure seu perfil primeiro: PUT /auth/profile",
        )

    query = select(Job).where(Job.owner_id == current_user.id)
    if current_user.seniority:
        query = query.where(
            (Job.seniority == current_user.seniority) | (Job.seniority == None)  # noqa: E711
        )
    result = await db.execute(query.order_by(Job.created_at.desc()))
    jobs = result.scalars().all()

    if current_user.stacks:
        user_stacks = {s.lower() for s in current_user.stacks}
        jobs = [
            j for j in jobs
            if j.stacks and {s.lower() for s in j.stacks} & user_stacks
        ]

    return jobs


@router.get("/jobs", response_model=list[JobResponse])
async def list_jobs(
    platform: Optional[str] = Query(None, description="remoteok | gupy | indeed | linkedin"),
    application_type: Optional[str] = Query(None, description="email | platform"),
    status: Optional[str] = Query(None, description="Encontrada | Aplicada"),
    seniority: Optional[str] = Query(None, description="Junior | Pleno | Senior"),
    stack: Optional[str] = Query(None, description="Ex: react, python, docker"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Job).where(Job.owner_id == current_user.id)
    if platform:
        query = query.where(Job.platform == platform)
    if application_type:
        query = query.where(Job.application_type == application_type)
    if status:
        query = query.where(Job.status == status)
    if seniority:
        query = query.where(Job.seniority == seniority)
    query = query.order_by(Job.created_at.desc())

    result = await db.execute(query)
    jobs = result.scalars().all()

    if stack:
        needle = stack.lower()
        jobs = [j for j in jobs if j.stacks and any(needle in s.lower() for s in j.stacks)]

    return jobs


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vaga não encontrada")
    if job.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")
    await db.execute(delete(Job).where(Job.id == job_id))
    await db.commit()


@router.post("/apply/email", status_code=status.HTTP_202_ACCEPTED)
async def apply_via_email(
    payload: EmailApplyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Job).where(
            Job.id.in_(payload.job_ids),
            Job.owner_id == current_user.id,
            Job.application_type == "email",
        )
    )
    valid_jobs = result.scalars().all()
    if not valid_jobs:
        raise HTTPException(
            status_code=400,
            detail="Nenhuma vaga com email de aplicação encontrada nos IDs fornecidos",
        )
    arq_job = await request.app.state.redis_pool.enqueue_job(
        "perform_email_apply",
        [j.id for j in valid_jobs],
        current_user.id,
        payload.subject,
        payload.body,
    )
    return {
        "message": f"{len(valid_jobs)} email(s) enfileirado(s).",
        "job_id": arq_job.job_id,
        "targets": [
            {"job_id": j.id, "title": j.title, "email": j.application_email}
            for j in valid_jobs
        ],
    }


@router.post("/apply/platform", response_model=list[PlatformApplyResponse])
async def apply_via_platform(
    payload: PlatformApplyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Job).where(
            Job.id.in_(payload.job_ids),
            Job.owner_id == current_user.id,
        )
    )
    jobs = result.scalars().all()
    if not jobs:
        raise HTTPException(status_code=404, detail="Nenhuma vaga encontrada")

    for job in jobs:
        job.status = "Aplicada"
    await db.commit()

    return [
        PlatformApplyResponse(
            job_id=j.id,
            title=j.title,
            platform=j.platform or "unknown",
            url=j.url,
        )
        for j in jobs
    ]
