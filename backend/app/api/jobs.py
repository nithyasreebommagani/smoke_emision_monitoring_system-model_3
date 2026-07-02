from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/jobs", tags=["Jobs"])

# Temporary Job Storage
jobs = {}


@router.get("/{job_id}")
async def get_job_status(job_id: str):

    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    return jobs[job_id]