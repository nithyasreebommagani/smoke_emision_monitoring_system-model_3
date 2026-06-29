import os
import shutil
from abc import ABC, abstractmethod
from app.core.config import settings

class BaseStorage(ABC):
    @abstractmethod
    def save_file(self, folder: str, filename: str, content: bytes) -> str:
        """Saves file content to storage and returns its accessible path/url."""
        pass

    @abstractmethod
    def get_file_url(self, file_path: str) -> str:
        """Returns public URL for a file path."""
        pass

class LocalStorage(BaseStorage):
    def __init__(self, base_dir: str = None):
        self.base_dir = base_dir or settings.UPLOAD_DIR
        os.makedirs(self.base_dir, exist_ok=True)

    def save_file(self, folder: str, filename: str, content: bytes) -> str:
        target_dir = os.path.join(self.base_dir, folder)
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, filename)
        with open(file_path, "wb") as f:
            f.write(content)
        # Return path relative to base_dir
        return f"{folder}/{filename}"

    def get_file_url(self, file_path: str) -> str:
        # Static files route on backend
        return f"/evidence/{file_path}"

# Future S3 implementation placeholder
class S3Storage(BaseStorage):
    def __init__(self):
        # Initialize boto3 client
        pass

    def save_file(self, folder: str, filename: str, content: bytes) -> str:
        # self.s3_client.put_object(Bucket=self.bucket, Key=f"{folder}/{filename}", Body=content)
        return f"s3://bucket-name/{folder}/{filename}"

    def get_file_url(self, file_path: str) -> str:
        # return pre-signed URL or CDN URL
        return f"https://cdn.example.com/{file_path}"

# Export the active storage service based on config
# We can add an env variable STORAGE_TYPE if needed, defaulting to local
def get_storage_service() -> BaseStorage:
    # If settings.STORAGE_TYPE == "s3", return S3Storage()
    return LocalStorage()
