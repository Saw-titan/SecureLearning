import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db
from . import models

# JWT configuration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        # bcrypt checks work by comparing byte strings
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    # bcrypt hashes work on byte strings
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have administrative privileges."
        )
    return current_user

def send_reset_email(email: str, token: str):
    """
    Attempts to send a password reset email using the SMTP settings from .env.
    If it fails, it prints the token to the stdout console as a backup, 
    allowing local developers to simulate the flow easily.
    """
    subject = "Password Reset - E-Learning App"
    reset_link = f"http://localhost:8000/api/auth/reset-password?token={token}&email={email}"
    
    body = f"""Hello,
    
You requested to reset your password. Please use the following token:
Token: {token}

Alternatively, open this link in your browser:
{reset_link}

This link and token will expire in 15 minutes.
"""
    
    # Check if SMTP details are configured
    if not settings.SMTP_USERNAME or settings.SMTP_USERNAME == "your_email@gmail.com":
        print("\n" + "="*60)
        print(f"SMTP NOT CONFIGURED. PRINTING PASSWORD RESET LINK FOR DEVELOPER:")
        print(f"To: {email}")
        print(f"Token: {token}")
        print(f"Link: {reset_link}")
        print("="*60 + "\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.SENDER_EMAIL
        msg['To'] = email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.sendmail(settings.SENDER_EMAIL, email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email via SMTP: {e}")
        print("\n" + "="*60)
        print(f"SMTP ERROR. PRINTING PASSWORD RESET LINK AS FALLBACK:")
        print(f"To: {email}")
        print(f"Token: {token}")
        print(f"Link: {reset_link}")
        print("="*60 + "\n")
        return False
