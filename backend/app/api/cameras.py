from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user, verify_admin
from app.crud import crud
from app.schemas.schemas import CameraCreate, CameraResponse

router = APIRouter(prefix="/cameras", tags=["Cameras"])

@router.get("", response_model=List[CameraResponse])
def read_cameras(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return crud.get_cameras(db)

@router.post("", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
def register_camera(
    camera: CameraCreate,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    return crud.create_camera(db, camera)
