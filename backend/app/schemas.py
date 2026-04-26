from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    created_at: datetime


class UserProfileUpdate(BaseModel):
    seniority: Optional[str] = None
    stacks: Optional[list[str]] = None


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    seniority: Optional[str]
    stacks: Optional[list[str]]
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    company: Optional[str]
    url: str
    status: str
    platform: Optional[str]
    application_type: str
    application_email: Optional[str]
    seniority: Optional[str]
    stacks: Optional[list[str]]
    created_at: datetime


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
