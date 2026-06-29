from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    violation_id = Column(UUID(as_uuid=True), ForeignKey("violations.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    violation = relationship("Violation", back_populates="notifications")
