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


class TaskRequest(BaseModel):
    target_urls: list[str]


@router.post("/start", status_code=status.HTTP_202_ACCEPTED)
async def start_automation(
    task: TaskRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    arq_job = await request.app.state.redis_pool.enqueue_job(
        "perform_scraping", task.target_urls, current_user.id
    )
    return {
        "message": f"Scraping enfileirado para {len(task.target_urls)} site(s).",
        "job_id": arq_job.job_id,
        "user_email": current_user.email,
    }


@router.get("/jobs", response_model=list[JobResponse])
async def list_jobs(
    platform: Optional[str] = Query(None, description="remoteok | gupy | indeed | linkedin"),
    application_type: Optional[str] = Query(None, description="email | platform"),
    status: Optional[str] = Query(None, description="Encontrada | Aplicada"),
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
    query = query.order_by(Job.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vaga nao encontrada")
    if job.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissao")
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
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhuma vaga com email de aplicacao encontrada nos IDs fornecidos",
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nenhuma vaga encontrada")

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
