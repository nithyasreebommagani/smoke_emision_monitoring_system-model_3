from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import crud
from app.schemas.schemas import ReportResponse

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("", response_model=ReportResponse)
def get_reports(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    total = crud.get_violations_count(db, only_today=False)
    approved = crud.get_violations_by_status_count(db, "approved")
    dismissed = crud.get_violations_by_status_count(db, "dismissed")
    
    daily_trend = crud.get_daily_violations_trend(db)
    camera_distribution = crud.get_violations_by_camera_distribution(db)
    
    return {
        "total_violations": total,
        "approved_violations": approved,
        "dismissed_violations": dismissed,
        "daily_trend": daily_trend,
        "camera_distribution": camera_distribution
    }
