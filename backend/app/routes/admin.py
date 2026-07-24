import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from .. import models, auth

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
VIDEOS_DIR = os.path.join(UPLOAD_DIR, "videos")
NOTES_DIR = os.path.join(UPLOAD_DIR, "notes")

# Create upload directories if they don't exist
os.makedirs(VIDEOS_DIR, exist_ok=True)
os.makedirs(NOTES_DIR, exist_ok=True)

@router.post("/courses", response_model=dict)
async def create_course(
    title: str = Form(...),
    description: str = Form(None),
    fee: float = Form(...),
    duration_days: int = Form(...),
    instructor: str = Form("Admin Instructor"),
    category: str = Form("Development"),
    video: UploadFile = File(...),
    notes: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(auth.get_current_admin)
):
    """
    Admin-only endpoint to upload course video and notes, setting title,
    description, price, and expiration duration.
    """
    # 1. Save Video File
    video_filename = f"{os.urandom(8).hex()}_{video.filename}"
    video_path = os.path.join(VIDEOS_DIR, video_filename)
    try:
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save video file: {e}"
        )
        
    # 2. Save Notes File
    notes_filename = f"{os.urandom(8).hex()}_{notes.filename}"
    notes_path = os.path.join(NOTES_DIR, notes_filename)
    try:
        with open(notes_path, "wb") as buffer:
            shutil.copyfileobj(notes.file, buffer)
    except Exception as e:
        # Clean up video file if notes fail
        if os.path.exists(video_path):
            os.remove(video_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save notes file: {e}"
        )

    # 3. Create Course Record
    # For local testing, video_url will point to a static server mount path
    new_course = models.Course(
        title=title,
        description=description,
        fee=fee,
        duration_days=duration_days,
        instructor=instructor,
        category=category,
        video_url=f"/static/videos/{video_filename}",
        notes_path=f"/static/notes/{notes_filename}"
    )
    
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    
    return {
        "message": "Course created successfully!",
        "course_id": new_course.id,
        "title": new_course.title,
        "duration_days": new_course.duration_days,
        "fee": new_course.fee
    }

from pydantic import BaseModel

class CourseUpdate(BaseModel):
    title: str
    description: Optional[str] = None
    fee: float
    duration_days: int
    instructor: str
    category: str

@router.put("/courses/{course_id}", response_model=dict)
def update_course(
    course_id: int,
    course_data: CourseUpdate,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(auth.get_current_admin)
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    course.title = course_data.title
    course.description = course_data.description
    course.fee = course_data.fee
    course.duration_days = course_data.duration_days
    course.instructor = course_data.instructor
    course.category = course_data.category
    
    db.commit()
    return {"message": "Course updated successfully!"}

@router.delete("/courses/{course_id}", response_model=dict)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(auth.get_current_admin)
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully!"}
