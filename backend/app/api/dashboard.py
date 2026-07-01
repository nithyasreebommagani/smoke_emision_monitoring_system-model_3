from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import crud
from app.schemas.schemas import DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_summary(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    total_violations = crud.get_violations_count(db, only_today=False)
    today_violations = crud.get_violations_count(db, only_today=True)
    active_cameras = crud.get_active_cameras_count(db)
    
    violations = crud.get_recent_violations(db, limit=8)

    recent_alerts = []

    for v in violations:
        recent_alerts.append({
            "id": str(v.id),
            "violation_id": str(v.id),
            "message": f"Smoke detected from vehicle {v.plate_number}",
            "status": v.status,
            "is_read": False,
            "created_at": v.created_at
        })
            
    return {
        "total_violations": total_violations,
        "today_violations": today_violations,
        "active_cameras": active_cameras,
        "recent_alerts": recent_alerts,
        "system_status": "operational"
    }
