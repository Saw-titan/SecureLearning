import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    enrollments = relationship("Enrollment", back_populates="user", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    video_url = Column(String)  # This should store the video ID or encrypted stream URL
    notes_path = Column(String)  # This should store the file path/URL of course PDF notes
    fee = Column(Float, nullable=False, default=0.0)
    duration_days = Column(Integer, nullable=False, default=30)  # Validity period in days
    instructor = Column(String, default="Admin Instructor")
    category = Column(String, default="Development")
    rating = Column(Float, default=4.8)
    reviews_count = Column(Integer, default=15)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    purchased_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)  # purchased_at + duration_days
    
    user = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
