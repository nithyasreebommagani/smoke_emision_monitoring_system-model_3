from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
import json
import redis
from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import crud
from app.schemas.schemas import ViolationCreate, ViolationResponse, ViolationUpdateStatus
from app.core.config import settings

router = APIRouter(prefix="/violations", tags=["Violations"])

@router.get("", response_model=dict)
def read_violations(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    plate_number: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    camera_id: Optional[UUID] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    violations, total = crud.get_violations(
        db, 
        skip=skip, 
        limit=limit,
        plate_number=plate_number,
        status=status,
        camera_id=camera_id,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    # Map violations to response schema, embedding camera details if available
    items = []
    for v in violations:
        items.append(ViolationResponse(
            id=v.id,
            camera_id=v.camera_id,
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

@router.get("/{violation_id}", response_model=ViolationResponse)
def read_violation(
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
    return ViolationResponse(
        id=v.id,
        camera_id=v.camera_id,
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

@router.post("", response_model=ViolationResponse, status_code=status.HTTP_201_CREATED)
def create_new_violation(
    violation: ViolationCreate,
    db: Session = Depends(get_db)
):
    """
    Endpoint for AI Worker to post violations.
    It saves violation and triggers notification broadcast.
    """
    v = crud.create_violation(db, violation)
    
    # Publish notification payload to Redis channel
    try:
        r = redis.from_url(settings.REDIS_URL)
        payload = {
            "id": str(v.id),
            "plate_number": v.plate_number,
            "timestamp": v.timestamp,
            "confidence": v.confidence,
            "status": v.status,
            "camera_name": v.camera.name if v.camera else "Unknown Camera",
            "message": f"Smoke violation detected for plate {v.plate_number}",
            "created_at": v.created_at.isoformat()
        }
        r.publish("violations:notifications", json.dumps(payload))
    except Exception as e:
        # Don't fail the request if Redis notification failed, log it
        print(f"Error publishing violation notification to Redis: {e}")
        
    return ViolationResponse(
        id=v.id,
        camera_id=v.camera_id,
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

@router.put("/{violation_id}/status", response_model=ViolationResponse)
def update_status(
    violation_id: UUID,
    status_update: ViolationUpdateStatus,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    v = crud.update_violation_status(db, violation_id, status_update.status)
    if not v:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Violation not found"
        )
    return ViolationResponse(
        id=v.id,
        camera_id=v.camera_id,
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
