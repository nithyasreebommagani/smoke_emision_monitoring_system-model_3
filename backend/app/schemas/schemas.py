from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: Optional[UUID] = None

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# User Schemas
class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: UUID
    username: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# Camera Schemas
class CameraCreate(BaseModel):
    name: str = Field(..., max_length=100)
    location: str = Field(..., max_length=255)
    status: str = Field("active", max_length=20)

class CameraResponse(BaseModel):
    id: UUID
    name: str
    location: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Violation Schemas
class ViolationCreate(BaseModel):
    camera_id: Optional[UUID] = None
    uploaded_video_id: Optional[UUID] = None
    plate_number: str
    timestamp: str
    confidence: float
    status: str = "pending"
    worker_id: str
    model_version: str
    processing_duration: float
    vehicle_crop_path: str
    plate_crop_path: str
    annotated_frame_path: str
    proof_video_path: str

class ViolationResponse(BaseModel):
    id: UUID
    camera_id: Optional[UUID] = None
    uploaded_video_id: Optional[UUID] = None
    camera_name: Optional[str] = None
    plate_number: str
    timestamp: str
    confidence: float
    status: str
    worker_id: str
    model_version: str
    processing_duration: float
    vehicle_crop_path: str
    plate_crop_path: str
    annotated_frame_path: str
    proof_video_path: str
    created_at: datetime

    class Config:
        from_attributes = True

class ViolationUpdateStatus(BaseModel):
    status: str = Field(..., pattern="^(approved|dismissed|pending)$")

# Notification Schemas
class NotificationResponse(BaseModel):
    id: UUID
    violation_id: UUID
    message: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Dashboard Summary
class DashboardSummaryResponse(BaseModel):
    total_violations: int
    today_violations: int
    active_cameras: int
    recent_alerts: List[NotificationResponse]
    system_status: str

# Report Summary
class DailyStats(BaseModel):
    date: str
    count: int

class CameraStats(BaseModel):
    camera_name: str
    count: int

class VehicleStats(BaseModel):
    status: str
    count: int

class ReportResponse(BaseModel):
    total_violations: int
    approved_violations: int
    dismissed_violations: int
    daily_trend: List[DailyStats]
    camera_distribution: List[CameraStats]

class UploadedVideoResponse(BaseModel):
    id: UUID
    user_id: UUID
    filename: str
    filepath: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserRegister(BaseModel):
    username: str
    password: str
    confirm_password: str
    role: str = "user"

class UserDashboardResponse(BaseModel):
    total_uploaded_videos: int
    total_violations: int
    recent_uploads: List[UploadedVideoResponse]
    recent_violations: List[ViolationResponse]
