from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from uuid import UUID
from typing import List, Optional, Tuple
from app.models.user import User
from app.models.camera import Camera
from app.models.violation import Violation
from app.models.notification import Notification
from app.models.uploaded_video import UploadedVideo
from app.schemas.schemas import CameraCreate, ViolationCreate

def get_unique_vehicles_count(db):
    return db.query(Violation.plate_number)\
             .distinct()\
             .count()
# User Operations
def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()
def get_recent_violations(db, limit=8):
    return (
        db.query(Violation)
        .order_by(Violation.created_at.desc())
        .limit(limit)
        .all()
    )
# Camera Operations
def get_cameras(db: Session) -> List[Camera]:
    return db.query(Camera).order_by(Camera.created_at.desc()).all()

def get_active_cameras_count(db: Session) -> int:
    return db.query(Camera).filter(Camera.status == "active").count()

def create_camera(db: Session, camera: CameraCreate) -> Camera:
    db_camera = Camera(
        name=camera.name,
        location=camera.location,
        status=camera.status
    )
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    return db_camera

# Violation Operations
def get_violation_by_id(db: Session, violation_id: UUID) -> Optional[Violation]:
    return db.query(Violation).filter(Violation.id == violation_id).first()

def get_violations(
    db: Session, 
    skip: int = 0, 
    limit: int = 10,
    plate_number: Optional[str] = None,
    status: Optional[str] = None,
    camera_id: Optional[UUID] = None,
    uploaded_video_id: Optional[UUID] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc"
) -> Tuple[List[Violation], int]:
    query = db.query(Violation)
    
    if plate_number:
        query = query.filter(Violation.plate_number.ilike(f"%{plate_number}%"))
    if status:
        query = query.filter(Violation.status == status)
    if camera_id:
        query = query.filter(Violation.camera_id == camera_id)
    if uploaded_video_id:
        query = query.filter(Violation.uploaded_video_id == uploaded_video_id)
        
    total = query.count()
    
    # Sorting
    sort_attr = getattr(Violation, sort_by, Violation.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_attr.desc())
    else:
        query = query.order_by(sort_attr.asc())
        
    violations = query.offset(skip).limit(limit).all()
    return violations, total

def create_violation(db: Session, violation: ViolationCreate) -> Violation:
    db_violation = Violation(
        camera_id=violation.camera_id,
        uploaded_video_id=violation.uploaded_video_id,
        plate_number=violation.plate_number,
        timestamp=violation.timestamp,
        confidence=violation.confidence,
        status=violation.status,
        worker_id=violation.worker_id,
        model_version=violation.model_version,
        processing_duration=violation.processing_duration,
        vehicle_crop_path=violation.vehicle_crop_path,
        plate_crop_path=violation.plate_crop_path,
        annotated_frame_path=violation.annotated_frame_path,
        proof_video_path=violation.proof_video_path
    )
    db.add(db_violation)
    db.commit()
    db.refresh(db_violation)
    
    # Automatically generate notification
    message = f"Smoke violation detected for vehicle plate {violation.plate_number}"
    create_notification(db, violation_id=db_violation.id, message=message)
    
    return db_violation

def update_violation_status(db: Session, violation_id: UUID, status: str) -> Optional[Violation]:
    db_violation = get_violation_by_id(db, violation_id)
    if db_violation:
        db_violation.status = status
        db.commit()
        db.refresh(db_violation)
    return db_violation

# Notification Operations
def create_notification(db: Session, violation_id: UUID, message: str) -> Notification:
    db_notification = Notification(
        violation_id=violation_id,
        message=message
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification

def get_recent_notifications(db: Session, limit: int = 10) -> List[Notification]:
    return db.query(Notification).order_by(Notification.created_at.desc()).limit(limit).all()

# Dashboard & Analytics Operations
def get_violations_count(db: Session, only_today: bool = False) -> int:
    query = db.query(Violation)
    if only_today:
        today_start = datetime.combine(date.today(), datetime.min.time())
        query = query.filter(Violation.created_at >= today_start)
    return query.count()

def get_violations_by_status_count(db: Session, status: str) -> int:
    return db.query(Violation).filter(Violation.status == status).count()

def get_daily_violations_trend(db: Session, days: int = 7) -> List[dict]:
    # Query database for violations grouped by date
    # Format dates as YYYY-MM-DD
    results = db.query(
        func.to_char(Violation.created_at, 'YYYY-MM-DD').label('date'),
        func.count(Violation.id).label('count')
    ).group_by('date').order_by('date').limit(days).all()
    
    return [{"date": r.date, "count": r.count} for r in results]

def get_violations_by_camera_distribution(db: Session) -> List[dict]:
    results = db.query(
        Camera.name.label('camera_name'),
        func.count(Violation.id).label('count')
    ).join(Violation, Violation.camera_id == Camera.id)\
     .group_by(Camera.name).all()
     
    return [{"camera_name": r.camera_name, "count": r.count} for r in results]

def create_uploaded_video(db: Session, user_id: UUID, filename: str, filepath: str) -> UploadedVideo:
    db_video = UploadedVideo(
        user_id=user_id,
        filename=filename,
        filepath=filepath,
        status="queued"
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    return db_video

def get_uploaded_video_by_id(db: Session, video_id: UUID) -> Optional[UploadedVideo]:
    return db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()

def get_uploaded_videos_by_user(db: Session, user_id: UUID) -> List[UploadedVideo]:
    return db.query(UploadedVideo).filter(UploadedVideo.user_id == user_id).order_by(UploadedVideo.created_at.desc()).all()

def get_all_uploaded_videos(db: Session) -> List[UploadedVideo]:
    return db.query(UploadedVideo).order_by(UploadedVideo.created_at.desc()).all()

def update_uploaded_video_status(db: Session, video_id: UUID, status: str) -> Optional[UploadedVideo]:
    db_video = get_uploaded_video_by_id(db, video_id)
    if db_video:
        db_video.status = status
        db.commit()
        db.refresh(db_video)
    return db_video

def get_violations_by_user(
    db: Session,
    user_id: UUID,
    skip: int = 0,
    limit: int = 10,
    plate_number: Optional[str] = None,
    status: Optional[str] = None,
    uploaded_video_id: Optional[UUID] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc"
) -> Tuple[List[Violation], int]:
    query = db.query(Violation).join(UploadedVideo, Violation.uploaded_video_id == UploadedVideo.id).filter(UploadedVideo.user_id == user_id)
    
    if plate_number:
        query = query.filter(Violation.plate_number.ilike(f"%{plate_number}%"))
    if status:
        query = query.filter(Violation.status == status)
    if uploaded_video_id:
        query = query.filter(Violation.uploaded_video_id == uploaded_video_id)
        
    total = query.count()
    
    sort_attr = getattr(Violation, sort_by, Violation.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_attr.desc())
    else:
        query = query.order_by(sort_attr.asc())
        
    violations = query.offset(skip).limit(limit).all()
    return violations, total

def get_user_dashboard_stats(db: Session, user_id: UUID) -> dict:
    total_videos = db.query(UploadedVideo).filter(UploadedVideo.user_id == user_id).count()
    total_violations = db.query(Violation).join(UploadedVideo, Violation.uploaded_video_id == UploadedVideo.id).filter(UploadedVideo.user_id == user_id).count()
    
    recent_videos = db.query(UploadedVideo).filter(UploadedVideo.user_id == user_id).order_by(UploadedVideo.created_at.desc()).limit(5).all()
    
    recent_violations = db.query(Violation).join(UploadedVideo, Violation.uploaded_video_id == UploadedVideo.id).filter(UploadedVideo.user_id == user_id).order_by(Violation.created_at.desc()).limit(5).all()
    
    return {
        "total_uploaded_videos": total_videos,
        "total_violations": total_violations,
        "recent_uploads": recent_videos,
        "recent_violations": recent_violations
    }
