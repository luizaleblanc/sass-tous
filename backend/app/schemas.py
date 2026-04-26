from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class JobResponse(BaseModel):
    id: str
    title: str
    company: Optional[str]
    url: str
    status: str
    platform: Optional[str]
    application_type: str
    application_email: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class EmailApplyRequest(BaseModel):
    job_ids: list[str]
    subject: str
    body: str


class PlatformApplyRequest(BaseModel):
    job_ids: list[str]


class PlatformApplyResponse(BaseModel):
    job_id: str
    title: str
    platform: str
    url: str
