import datetime
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, auth

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    is_admin: bool = False

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    is_admin: bool

@router.post("/signup", response_model=dict)
def signup(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_pwd = auth.get_password_hash(user_data.password)
    new_user = models.User(
        email=user_data.email,
        password_hash=hashed_pwd,
        is_admin=user_data.is_admin
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User created successfully", "email": new_user.email}

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not db_user or not auth.verify_password(login_data.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    
    access_token = auth.create_access_token(data={"sub": db_user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_admin": db_user.is_admin
    }

@router.post("/forgot-password", response_model=dict)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Verify user exists
    db_user = db.query(models.User).filter(models.User.email == req.email).first()
    if not db_user:
        # Avoid user enumeration attacks in production, but here we can return success anyway
        return {"message": "If the email exists, a reset link has been generated."}
    
    # Create reset token (valid for 15 minutes)
    token = secrets.token_hex(16)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    
    # Clear any old tokens for this email
    db.query(models.PasswordResetToken).filter(models.PasswordResetToken.email == req.email).delete()
    
    reset_token = models.PasswordResetToken(
        email=req.email,
        token=token,
        expires_at=expires_at
    )
    db.add(reset_token)
    db.commit()
    
    auth.send_reset_email(req.email, token)
    return {"message": "Password reset token sent/logged successfully."}

@router.post("/reset-password", response_model=dict)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    # Find token
    token_record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.email == req.email,
        models.PasswordResetToken.token == req.token
    ).first()
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token or email"
        )
        
    if token_record.expires_at < datetime.datetime.utcnow():
        db.delete(token_record)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token has expired"
        )
        
    # Update password
    db_user = db.query(models.User).filter(models.User.email == req.email).first()
    if not db_user:
         raise HTTPException(status_code=404, detail="User not found")
         
    db_user.password_hash = auth.get_password_hash(req.new_password)
    
    # Delete token
    db.delete(token_record)
    db.commit()
    
    return {"message": "Password reset successful"}
