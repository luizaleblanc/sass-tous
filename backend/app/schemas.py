from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
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
    company: str | None
    url: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True