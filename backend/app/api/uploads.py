from fastapi import APIRouter, UploadFile, File
from pathlib import Path
import shutil
import uuid

router = APIRouter(prefix="/uploads", tags=["Uploads"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/video")
async def upload_video(video: UploadFile = File(...)):
    file_id = str(uuid.uuid4())

    file_path = UPLOAD_DIR / f"{file_id}.mp4"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    return {
        "message": "Video uploaded successfully",
        "file_id": file_id
    }