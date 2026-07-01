from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
import shutil
import os
import uuid
import json
import redis

from app.core.database import get_db
from app.core.security import get_current_user, verify_admin
from app.core.config import settings
from app.crud import crud
from app.schemas.schemas import UploadedVideoResponse
from typing import List

router = APIRouter(prefix="/upload", tags=["Upload"])

@router.post("", response_model=UploadedVideoResponse, status_code=status.HTTP_201_CREATED)
async def upload_video(
    video: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Validate extension
    ext = os.path.splitext(video.filename)[1].lower()
    if ext not in [".mp4", ".avi", ".mov"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .mp4, .avi, and .mov video formats are supported."
        )

    # Ensure uploads folder inside evidence exists
    uploads_dir = os.path.join(settings.UPLOAD_DIR, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    # Create a unique filename to prevent collisions
    unique_id = uuid.uuid4()
    unique_filename = f"{unique_id}{ext}"
    save_path = os.path.join(uploads_dir, unique_filename)

    # Save file
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save video: {e}"
        )

    # Relative path for worker and database
    rel_path = f"uploads/{unique_filename}"

    # Insert UploadedVideo database record
    db_video = crud.create_uploaded_video(
        db,
        user_id=current_user.id,
        filename=video.filename,
        filepath=rel_path
    )

    # Push task to Redis queue
    try:
        r = redis.Redis.from_url(settings.REDIS_URL)
        task_payload = {
            "video_id": str(db_video.id),
            "filepath": rel_path,
            "filename": video.filename,
            "user_id": str(current_user.id)
        }
        r.rpush("video:tasks", json.dumps(task_payload))
    except Exception as e:
        print(f"Error pushing video task to Redis: {e}")
        # Note: we don't abort since the file is saved and DB record is created;
        # the worker or admin can re-trigger or we can recover.

    return db_video

@router.get("", response_model=List[UploadedVideoResponse])
def get_my_videos(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve history of uploaded videos for current operator."""
    return crud.get_uploaded_videos_by_user(db, current_user.id)

@router.get("/all", response_model=List[UploadedVideoResponse])
def get_all_videos(
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    """Retrieve all uploaded videos (Admin only)."""
    return crud.get_all_uploaded_videos(db)

@router.get("/{video_id}", response_model=UploadedVideoResponse)
def get_video_status(
    video_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve status of a specific uploaded video."""
    video = crud.get_uploaded_video_by_id(db, video_id)
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )
    
    # Enforce role-based access: owner or admin
    if current_user.role != "admin" and video.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this video's status."
        )
        
    return video