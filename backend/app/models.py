from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    seniority = Column(String(20), nullable=True)
    area = Column(String(30), nullable=True)
    stacks = Column(JSON, nullable=True)
    work_modality = Column(String(20), nullable=True)
    location_type = Column(String(20), nullable=True)
    cv_filename = Column(String(255), nullable=True)
    cv_text = Column(Text, nullable=True)
    cv_parsed = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    jobs = relationship("Job", back_populates="owner", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=True)
    url = Column(String(2048), nullable=False)
    status = Column(String(50), default="Encontrada")
    platform = Column(String(50), nullable=True)
    application_type = Column(String(50), default="platform")
    application_email = Column(String(255), nullable=True)
    seniority = Column(String(20), nullable=True)
    stacks = Column(JSON, nullable=True)
    location_type = Column(String(20), default="nacional")
    work_modality = Column(String(20), default="presencial")
    created_at = Column(DateTime, default=datetime.utcnow)

    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="jobs")
