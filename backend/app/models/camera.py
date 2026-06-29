from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    location = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False)  # 'active', 'inactive'
    created_at = Column(DateTime, default=datetime.utcnow)

    violations = relationship("Violation", back_populates="camera")
