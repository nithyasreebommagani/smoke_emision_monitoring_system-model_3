from fastapi import APIRouter, UploadFile, File
from pathlib import Path
import shutil
import uuid
import asyncio

from app.api.jobs import jobs
from app.services.notifications import manager

router = APIRouter(prefix="/uploads", tags=["Uploads"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/video")
async def upload_video(video: UploadFile = File(...)):
    print("\n==============================")
    print("UPLOAD RECEIVED")
    print("Filename:", video.filename)
    print("==============================\n")

    # Generate unique Job ID
    job_id = str(uuid.uuid4())

    # Save uploaded video
    file_path = UPLOAD_DIR / f"{job_id}.mp4"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    print("Saved to:", file_path)

    # Create Job
    jobs[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "video_path": str(file_path)
    }

    print("Job Created:", jobs[job_id])

    # Fake processing (for testing without GPU)
    async def fake_processing():
        await asyncio.sleep(5)

        jobs[job_id]["status"] = "completed"

        await manager.broadcast(
            f'{{"job_id":"{job_id}","status":"completed"}}'
        )

        print("Job Completed:", jobs[job_id])

    asyncio.create_task(fake_processing())

    return {
        "message": "Video uploaded successfully",
        "job_id": job_id
    }