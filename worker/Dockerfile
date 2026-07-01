FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for OpenCV and postgres client
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg\
    libgl1 \
    libglib2.0-0 \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install PyTorch CPU version to prevent huge image sizes (since default ultralytics pulls CUDA PyTorch which is multi-gigabyte)
RUN pip install --no-cache-dir \
    torch torchvision torchaudio \
    --index-url https://download.pytorch.org/whl/cu121

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Environment variables
ENV PYTHONUNBUFFERED=1

CMD ["python", "app/worker.py"]
