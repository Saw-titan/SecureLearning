import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from .. import models, auth

router = APIRouter(prefix="/courses", tags=["Courses"])

class CoursePublic(BaseModel):
    id: int
    title: str
    description: Optional[str]
    fee: float
    duration_days: int
    instructor: str
    category: str
    rating: float
    reviews_count: int

    class Config:
        from_attributes = True

class CourseDetail(BaseModel):
    id: int
    title: str
    description: Optional[str]
    fee: float
    duration_days: int
    instructor: str
    category: str
    rating: float
    reviews_count: int
    video_url: str  # Only visible to enrolled users
    notes_path: str # Only visible to enrolled users
    expires_at: datetime.datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[CoursePublic])
def list_courses(db: Session = Depends(get_db)):
    """
    Lists all available courses. Does NOT leak secure files (video_url, notes_path).
    """
    courses = db.query(models.Course).all()
    return courses

@router.get("/enrolled", response_model=List[CoursePublic])
def list_enrolled_courses(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns a list of courses that the current student has active, unexpired access to.
    """
    now = datetime.datetime.utcnow()
    enrollments = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == current_user.id,
        models.Enrollment.expires_at > now
    ).all()
    
    courses = [enrollment.course for enrollment in enrollments]
    return courses

@router.post("/purchase/{course_id}", response_model=dict)
def purchase_course(
    course_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Simulates buying a course. Creates a new enrollment record 
    with a validity period derived from course.duration_days.
    """
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Check if active enrollment already exists
    existing = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == current_user.id,
        models.Enrollment.course_id == course_id,
        models.Enrollment.expires_at > datetime.datetime.utcnow()
    ).first()
    
    if existing:
        return {"message": "You are already enrolled in this course.", "expires_at": existing.expires_at}
        
    # Calculate expiration datetime
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=course.duration_days)
    
    # In case duration_days is set very small (e.g. for testing purposes, like 0 for minutes, 
    # we'll interpret values <= 0 as minutes for easy developer testing).
    if course.duration_days <= 0:
        # If duration is 0, let's set it to expire in 2 minutes for testing lock/unlock logic
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=2)
        
    enrollment = models.Enrollment(
        user_id=current_user.id,
        course_id=course_id,
        expires_at=expires_at
    )
    db.add(enrollment)
    db.commit()
    
    return {
        "message": "Course purchased successfully!",
        "course_title": course.title,
        "expires_at": expires_at
    }

@router.get("/{course_id}", response_model=CourseDetail)
def get_course_detail(
    course_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns full course contents, including video and note files.
    Enforces active enrollment checks.
    """
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Check enrollment status
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == current_user.id,
        models.Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Course not purchased. Please purchase to unlock content."
        )
        
    if enrollment.expires_at < datetime.datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Enrollment has expired. Course locked."
        )
        
    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "fee": course.fee,
        "duration_days": course.duration_days,
        "instructor": course.instructor or "Admin Instructor",
        "category": course.category or "Development",
        "rating": course.rating or 4.8,
        "reviews_count": course.reviews_count or 15,
        "video_url": course.video_url,
        "notes_path": course.notes_path,
        "expires_at": enrollment.expires_at
    }

@router.get("/{course_id}/verify", response_model=dict)
def verify_access(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Checks if user has active, unexpired access to the course.
    Returns dynamic lock state and expiration details.
    """
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == current_user.id,
        models.Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        return {"locked": True, "reason": "Not enrolled", "expires_at": None}
        
    now = datetime.datetime.utcnow()
    if enrollment.expires_at < now:
        return {"locked": True, "reason": "Enrollment expired", "expires_at": enrollment.expires_at}
        
    time_remaining = enrollment.expires_at - now
    return {
        "locked": False,
        "reason": "Active enrollment",
        "expires_at": enrollment.expires_at,
        "seconds_remaining": int(time_remaining.total_seconds())
    }
