from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import crud
from app.schemas.schemas import UserDashboardResponse, ViolationResponse

router = APIRouter(prefix="/user", tags=["User Portal"])

@router.get("/dashboard", response_model=UserDashboardResponse)
def get_user_dashboard(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    stats = crud.get_user_dashboard_stats(db, current_user.id)
    return stats

@router.get("/violations", response_model=dict)
def get_user_violations(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    plate_number: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    uploaded_video_id: Optional[UUID] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    violations, total = crud.get_violations_by_user(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        plate_number=plate_number,
        status=status,
        uploaded_video_id=uploaded_video_id,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    items = []
    for v in violations:
        items.append(ViolationResponse(
            id=v.id,
            camera_id=v.camera_id,
            uploaded_video_id=v.uploaded_video_id,
            camera_name=v.camera.name if v.camera else "Unknown",
            plate_number=v.plate_number,
            timestamp=v.timestamp,
            confidence=v.confidence,
            status=v.status,
            worker_id=v.worker_id,
            model_version=v.model_version,
            processing_duration=v.processing_duration,
            vehicle_crop_path=v.vehicle_crop_path,
            plate_crop_path=v.plate_crop_path,
            annotated_frame_path=v.annotated_frame_path,
            proof_video_path=v.proof_video_path,
            created_at=v.created_at
        ))
        
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/violations/{violation_id}", response_model=ViolationResponse)
def get_user_violation(
    violation_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    v = crud.get_violation_by_id(db, violation_id)
    if not v:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Violation not found"
        )
    
    # Verify ownership: violation must be linked to an uploaded video owned by this user
    if not v.uploaded_video or v.uploaded_video.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this violation."
        )
        
    return ViolationResponse(
        id=v.id,
        camera_id=v.camera_id,
        uploaded_video_id=v.uploaded_video_id,
        camera_name=v.camera.name if v.camera else "Unknown",
        plate_number=v.plate_number,
        timestamp=v.timestamp,
        confidence=v.confidence,
        status=v.status,
        worker_id=v.worker_id,
        model_version=v.model_version,
        processing_duration=v.processing_duration,
        vehicle_crop_path=v.vehicle_crop_path,
        plate_crop_path=v.plate_crop_path,
        annotated_frame_path=v.annotated_frame_path,
        proof_video_path=v.proof_video_path,
        created_at=v.created_at
    )
