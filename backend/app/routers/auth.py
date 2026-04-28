from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import User
from ..auth import verify_password, create_access_token, get_password_hash
from ..dependencies import get_current_user
from ..schemas import UserCreate, UserResponse, Token, UserProfileUpdate, UserProfileResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

_VALID_SENIORITY = {"Estágio", "Trainee", "Junior", "Pleno", "Senior"}
_VALID_WORK_MODALITY = {"remoto", "presencial", "hibrido"}
_VALID_AREA = {"backend", "frontend", "fullstack", "mobile", "qa", "ux_ui", "devops", "data", "seguranca", "produto"}
_VALID_LOCATION_TYPE = {"nacional", "internacional", "ambos"}
_ALLOWED_CV_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email já registrado")
    new_user = User(email=user_data.email, password=get_password_hash(user_data.password))
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"access_token": create_access_token(data={"sub": user.email}), "token_type": "bearer"}


@router.get("/me", response_model=UserProfileResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=UserProfileResponse)
async def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.seniority is not None:
        if payload.seniority not in _VALID_SENIORITY:
            raise HTTPException(
                status_code=400,
                detail=f"Senioridade inválida. Valores aceitos: {sorted(_VALID_SENIORITY)}",
            )
        current_user.seniority = payload.seniority
    if payload.area is not None:
        if payload.area not in _VALID_AREA:
            raise HTTPException(
                status_code=400,
                detail=f"Área inválida. Valores aceitos: {sorted(_VALID_AREA)}",
            )
        current_user.area = payload.area
    if payload.stacks is not None:
        current_user.stacks = payload.stacks
    if payload.work_modality is not None:
        if payload.work_modality not in _VALID_WORK_MODALITY:
            raise HTTPException(
                status_code=400,
                detail=f"Modalidade inválida. Valores aceitos: {sorted(_VALID_WORK_MODALITY)}",
            )
        current_user.work_modality = payload.work_modality
    if payload.location_type is not None:
        if payload.location_type not in _VALID_LOCATION_TYPE:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de localização inválido. Valores aceitos: {sorted(_VALID_LOCATION_TYPE)}",
            )
        current_user.location_type = payload.location_type
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/cv", response_model=UserProfileResponse)
async def upload_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in _ALLOWED_CV_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato não suportado. Aceitos: {sorted(_ALLOWED_CV_EXTENSIONS)}",
        )

    from fastapi.concurrency import run_in_threadpool
    from ..cv_parser import parse_cv
    content = await file.read()
    parsed = await run_in_threadpool(parse_cv, content, file.filename)

    current_user.cv_filename = file.filename
    current_user.cv_text = parsed.pop("raw_text", "")
    current_user.cv_parsed = parsed

    if not current_user.stacks and parsed.get("stacks"):
        current_user.stacks = parsed["stacks"]

    await db.commit()
    await db.refresh(current_user)
    return current_user
