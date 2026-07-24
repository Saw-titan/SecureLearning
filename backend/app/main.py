import os
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from .database import engine, Base, get_db
from .routes import auth, courses, admin
from . import models, auth as auth_utils

# Create database tables automatically
Base.metadata.create_all(bind=engine)

# Seed predefined admin user
from .database import SessionLocal
def seed_admin_user():
    db = SessionLocal()
    try:
        admin_email = "admin@elearning.com"
        admin = db.query(models.User).filter(models.User.email == admin_email).first()
        if not admin:
            hashed_pwd = auth_utils.get_password_hash("AdminPassword123")
            admin_user = models.User(
                email=admin_email,
                password_hash=hashed_pwd,
                is_admin=True
            )
            db.add(admin_user)
            db.commit()
            print("\n" + "="*50)
            print("PREDEFINED ADMIN CREATED:")
            print(f"Email: {admin_email}")
            print("Password: AdminPassword123")
            print("="*50 + "\n")
    except Exception as e:
        print(f"Failed to seed admin: {e}")
    finally:
        db.close()

seed_admin_user()

app = FastAPI(
    title="Secure E-Learning API",
    description="Backend API for managing secure courses, authentication, and admin tasks.",
    version="1.0.0"
)

# CORS configuration to allow cross-origin requests from mobile/web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

# Include Routes under prefix /api
app.include_router(auth.router, prefix="/api")
app.include_router(courses.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

# Mount HTML/CSS/JS frontend client has been removed since we transitioned to native Expo mobile client
# FRONTEND_DIR = os.path.join(
#     os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
#     "frontend_html"
# )
# app.mount("/client", StaticFiles(directory=FRONTEND_DIR, html=True), name="client")

# Secure Directory Paths
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
VIDEOS_DIR = os.path.join(UPLOAD_DIR, "videos")
NOTES_DIR = os.path.join(UPLOAD_DIR, "notes")

@app.get("/api/media/video/{filename}")
def serve_secure_video(
    filename: str, 
    token: str, 
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Secure endpoint to serve course videos.
    Requires a valid JWT token passed as a query parameter (since video players 
    often retrieve files via standard GET links where auth headers are hard to customize).
    Verifies that the user has an active enrollment. Supports HTTP Range Requests (206).
    """
    # 1. Validate JWT Token
    try:
        payload = auth_utils.jwt.decode(token, auth_utils.settings.SECRET_KEY, algorithms=[auth_utils.settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except auth_utils.JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
    # 2. Match video to course
    video_relative_url = f"/static/videos/{filename}"
    course = db.query(models.Course).filter(models.Course.video_url == video_relative_url).first()
    if not course:
        raise HTTPException(status_code=404, detail="Resource not found in course list")
        
    # 3. Check enrollment
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == user.id,
        models.Enrollment.course_id == course.id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=403, detail="Course not purchased")
        
    if enrollment.expires_at < auth_utils.datetime.datetime.utcnow():
        raise HTTPException(status_code=403, detail="Course enrollment has expired")
        
    # 4. Return file if authenticated and active
    video_file_path = os.path.join(VIDEOS_DIR, filename)
    if not os.path.exists(video_file_path):
        raise HTTPException(status_code=404, detail="Video file not found on disk")
        
    file_size = os.path.getsize(video_file_path)
    range_header = request.headers.get("range")
    
    if range_header:
        try:
            parts = range_header.replace("bytes=", "").split("-")
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if parts[1] else file_size - 1
        except Exception:
            start, end = 0, file_size - 1
            
        if start >= file_size:
            raise HTTPException(status_code=416, detail="Requested Range Not Satisfiable")
            
        end = min(end, file_size - 1)
        
        def range_generator(start_byte, end_byte, chunk_size=1024 * 1024):
            with open(video_file_path, "rb") as f:
                f.seek(start_byte)
                remaining = end_byte - start_byte + 1
                while remaining > 0:
                    chunk = f.read(min(chunk_size, remaining))
                    if not chunk:
                        break
                    yield chunk
                    remaining -= len(chunk)
                    
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(end - start + 1),
        }
        return StreamingResponse(
            range_generator(start, end),
            status_code=206,
            headers=headers,
            media_type="video/mp4"
        )
    else:
        return FileResponse(video_file_path, media_type="video/mp4")


@app.get("/api/media/notes/{filename}")
def serve_secure_notes(
    filename: str, 
    token: str, 
    db: Session = Depends(get_db)
):
    """
    Secure endpoint to serve course notes (PDF/text).
    Requires a valid JWT token. Verifies user access before serving.
    """
    # 1. Validate JWT Token
    try:
        payload = auth_utils.jwt.decode(token, auth_utils.settings.SECRET_KEY, algorithms=[auth_utils.settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except auth_utils.JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
    # 2. Match note to course
    notes_relative_url = f"/static/notes/{filename}"
    course = db.query(models.Course).filter(models.Course.notes_path == notes_relative_url).first()
    if not course:
        raise HTTPException(status_code=404, detail="Resource not found in course list")
        
    # 3. Check enrollment
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == user.id,
        models.Enrollment.course_id == course.id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=403, detail="Course not purchased")
        
    if enrollment.expires_at < auth_utils.datetime.datetime.utcnow():
        raise HTTPException(status_code=403, detail="Course enrollment has expired")
        
    # 4. Return file if authenticated and active
    notes_file_path = os.path.join(NOTES_DIR, filename)
    if not os.path.exists(notes_file_path):
        raise HTTPException(status_code=404, detail="Notes file not found on disk")
        
    return FileResponse(notes_file_path, media_type="application/pdf")


@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Secure E-Learning API is active. Access docs at /docs"
    }
