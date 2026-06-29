from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

class Violation(Base):
    __tablename__ = "violations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camera_id = Column(UUID(as_uuid=True), ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True)
    plate_number = Column(String(20), nullable=False)
    timestamp = Column(String(20), nullable=False)  # Time offset in video
    confidence = Column(Float, nullable=False)
    status = Column(String(20), default="pending")  # 'pending', 'approved', 'dismissed'
    worker_id = Column(String(50), nullable=False)
    model_version = Column(String(50), nullable=False)
    processing_duration = Column(Float, nullable=False)
    vehicle_crop_path = Column(String(255), nullable=False)
    plate_crop_path = Column(String(255), nullable=False)
    annotated_frame_path = Column(String(255), nullable=False)
    proof_video_path = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    camera = relationship("Camera", back_populates="violations")
    notifications = relationship("Notification", back_populates="violation", cascade="all, delete-orphan")
