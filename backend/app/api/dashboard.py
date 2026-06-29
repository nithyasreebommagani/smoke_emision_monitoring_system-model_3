from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import crud
from app.schemas.schemas import DashboardSummaryResponse, NotificationResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_summary(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    total_violations = crud.get_violations_count(db, only_today=False)
    today_violations = crud.get_violations_count(db, only_today=True)
    active_cameras = crud.get_active_cameras_count(db)
    
    notifications = crud.get_recent_notifications(db, limit=8)
    recent_alerts = []
    for n in notifications:
        recent_alerts.append(NotificationResponse(
            id=n.id,
            violation_id=n.violation_id,
            message=n.message,
            is_read=n.is_read,
            created_at=n.created_at
        ))
        
    return {
        "total_violations": total_violations,
        "today_violations": today_violations,
        "active_cameras": active_cameras,
        "recent_alerts": recent_alerts,
        "system_status": "operational"
    }
