from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from ..database import get_db
from ..dependencies import get_current_user
from ..models import Job, User
from ..schemas import JobResponse

router = APIRouter(prefix="/automation", tags=["Automation"])


class TaskRequest(BaseModel):
    target_url: str


@router.post("/start", status_code=status.HTTP_202_ACCEPTED)
async def start_automation(
    task: TaskRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    redis_pool = request.app.state.redis_pool
    job = await redis_pool.enqueue_job("perform_scraping", task.target_url, current_user.id)
    return {
        "message": "Tarefa de automacao enviada para a fila com sucesso.",
        "job_id": job.job_id,
        "user_email": current_user.email,
    }


@router.get("/jobs", response_model=list[JobResponse])
async def list_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Job).where(Job.owner_id == current_user.id).order_by(Job.created_at.desc())
    )
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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissao para apagar esta vaga")

    await db.execute(delete(Job).where(Job.id == job_id))
    await db.commit()
