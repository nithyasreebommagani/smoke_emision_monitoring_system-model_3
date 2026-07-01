from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base

class UploadedVideo(Base):
    __tablename__ = "uploaded_videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    filename = Column(String(255), nullable=False)

    filepath = Column(String(500), nullable=False)

    status = Column(
        String(20),
        default="queued"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    user = relationship("User", backref="uploaded_videos")
    violations = relationship("Violation", back_populates="uploaded_video", cascade="all, delete-orphan")