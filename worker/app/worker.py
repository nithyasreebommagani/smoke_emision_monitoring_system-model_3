import os
import cv2
import math
import csv
import re
import time
import json
import uuid
import psycopg2
from datetime import datetime
from collections import defaultdict, deque, Counter
import redis
import numpy as np
from ultralytics import YOLO
import easyocr
import torch
import subprocess
import shutil
import tempfile
import logging
import pytz
DEVICE = 0 if torch.cuda.is_available() else "cpu"

print(f"Using device: {DEVICE}")
# =====================================
# ENV CONFIGURATION
# =====================================
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgrespassword@localhost:5432/smoke_emission_db")
EVIDENCE_DIR = os.environ.get("EVIDENCE_DIR", "evidence")
USE_REDIS_STREAM = os.environ.get("USE_REDIS_STREAM", "false").lower() == "true"
VIDEO_INPUT_PATH = os.environ.get("VIDEO_INPUT_PATH", r"C:\Users\Home\Desktop\model3\smoke_emision_monitoring_system-model_3\worker\videos\traffic.mp4")

# Model paths
MODEL_SMOKE_PATH = os.environ.get("MODEL_SMOKE_PATH", "best.pt")
MODEL_VEHICLE_PATH = os.environ.get("MODEL_VEHICLE_PATH", "yolov8n.pt")
MODEL_PLATE_PATH = os.environ.get("MODEL_PLATE_PATH", "plate.pt")

print("Initializing folders...")
os.makedirs(EVIDENCE_DIR, exist_ok=True)
os.makedirs(os.path.join(EVIDENCE_DIR, "crops"), exist_ok=True)
os.makedirs(os.path.join(EVIDENCE_DIR, "plates"), exist_ok=True)
os.makedirs(os.path.join(EVIDENCE_DIR, "frames"), exist_ok=True)
os.makedirs(os.path.join(EVIDENCE_DIR, "videos"), exist_ok=True)

# =====================================
# MODELS
# =====================================
print("Loading YOLO models...")
smoke_model = YOLO(MODEL_SMOKE_PATH)
vehicle_model = YOLO(MODEL_VEHICLE_PATH)
plate_model = YOLO(MODEL_PLATE_PATH)

print("Loading EasyOCR Reader...")
reader = easyocr.Reader(['en'])

# Connect to Redis
try:
    redis_client = redis.Redis.from_url(REDIS_URL)
    print("Connected to Redis successfully.")
except Exception as e:
    print(f"Failed to connect to Redis: {e}")
    redis_client = None

# =====================================
# TRACKER DATA
# =====================================
stable_tracks = {}
next_stable_id = 1
used_ids_this_frame = set()
track_age = defaultdict(int)
smoke_history = defaultdict(lambda: deque(maxlen=150))
saved_suspects = set()
vehicle_ocr_history = defaultdict(list)

# Best frames
best_vehicle_crop = {}
best_vehicle_frame = {}
best_vehicle_area = {}

vehicle_classes = [2, 3, 5, 7] # car, motorcycle, bus, truck

# =====================================
# HELPER FUNCTIONS (PRESERVED)
# =====================================
def center(box):
    x1, y1, x2, y2 = box
    return ((x1 + x2) // 2, (y1 + y2) // 2)

def distance(p1, p2):
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)

def box_area(box):
    x1, y1, x2, y2 = box
    return max(0, x2 - x1) * max(0, y2 - y1)

def iou(boxA, boxB):
    ax1, ay1, ax2, ay2 = boxA
    bx1, by1, bx2, by2 = boxB
    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)
    inter = box_area((ix1, iy1, ix2, iy2))
    union = box_area(boxA) + box_area(boxB) - inter
    if union == 0:
        return 0
    return inter / union

# =====================================
# STABLE TRACKER (PRESERVED)
# =====================================
def match_or_create_stable_id(vehicle_box, vehicle_name, frame_no):
    global next_stable_id
    vc = center(vehicle_box)
    best_id = None
    best_score = -1

    for stable_id, data in stable_tracks.items():
        if stable_id in used_ids_this_frame:
            continue
        frames_missing = frame_no - data["last_seen"]
        if frames_missing > 300:
            continue
        old_box = data["box"]
        overlap = iou(vehicle_box, old_box)
        if overlap < 0.01:
            continue
        d = distance(vc, center(old_box))
        size_ratio = box_area(vehicle_box) / max(box_area(old_box), 1)
        if not (0.3 <= size_ratio <= 3.0):
            continue
        score = overlap * 5
        score += max(0, (150 - d) / 150)
        if vehicle_name == data["name"]:
            score += 1
        if score > best_score:
            best_score = score
            best_id = stable_id

    if best_id is not None:
        stable_tracks[best_id]["box"] = vehicle_box
        stable_tracks[best_id]["last_seen"] = frame_no
        stable_tracks[best_id]["name"] = vehicle_name
        used_ids_this_frame.add(best_id)
        return best_id

    stable_id = next_stable_id
    next_stable_id += 1
    stable_tracks[stable_id] = {
        "box": vehicle_box,
        "name": vehicle_name,
        "last_seen": frame_no
    }
    used_ids_this_frame.add(stable_id)
    return stable_id

# =====================================
# SMOKE ASSOCIATION (PRESERVED)
# =====================================
def smoke_near_vehicle(smoke_box, vehicle_box):
    sx1, sy1, sx2, sy2 = smoke_box
    vx1, vy1, vx2, vy2 = vehicle_box
    vw = vx2 - vx1
    vh = vy2 - vy1
    expanded = (
        vx1 - int(0.5 * vw),
        vy1 - int(0.5 * vh),
        vx2 + int(1.0 * vw),
        vy2 + int(1.0 * vh)
    )
    ex1, ey1, ex2, ey2 = expanded
    sc = center(smoke_box)
    return (ex1 <= sc[0] <= ex2 and ey1 <= sc[1] <= ey2)

# =====================================
# PLATE OCR HELPERS (PRESERVED)
# =====================================
def fix_plate_ocr(plate_number):
    if len(plate_number) != 10:
        return plate_number
    result = list(plate_number)
    digit_positions = [2, 3, 6, 7, 8, 9]
    letter_positions = [0, 1, 4, 5]
    letter_fixes = {'0': 'O', '1': 'I', '8': 'B', '5': 'S'}
    digit_fixes  = {'O': '0', 'I': '1', 'B': '8', 'S': '5', 'Z': '2', 'G': '6'}
    for i in digit_positions:
        if result[i] in digit_fixes:
            result[i] = digit_fixes[result[i]]
    for i in letter_positions:
        if result[i] in letter_fixes:
            result[i] = letter_fixes[result[i]]
    return "".join(result)

def read_plate_from_crop(plate_crop, stable_id):
    gray = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, (333, 75))
    
    gray = cv2.bilateralFilter(gray, 11, 17, 17)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    results = reader.readtext(thresh, allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", detail=1, paragraph=False)
    print(f"  Raw OCR for Vehicle {stable_id}: {results}")
    results_sorted = sorted(results, key=lambda x: x[2], reverse=True)

    for ocr_item in results_sorted:
        text = re.sub(r'[^A-Z0-9]', '', ocr_item[1].upper())
        fixed = fix_plate_ocr(text)
        print(f"  Chunk: '{text}' -> Fixed: '{fixed}' (conf: {ocr_item[2]:.2f})")
        if re.match(r'^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$', fixed):
            print(f"  VALID (single chunk): {fixed}")
            return fixed

    joined = "".join([re.sub(r'[^A-Z0-9]', '', r[1].upper()) for r in results_sorted[:6]])
    print(f"  Joined: '{joined}'")
    for i in range(len(joined) - 9):
        chunk = joined[i:i+10]
        fixed = fix_plate_ocr(chunk)
        if re.match(r'^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$', fixed):
            print(f"  VALID (sliding window): {fixed}")
            return fixed

    for ocr_item in results_sorted:
        text = re.sub(r'[^A-Z0-9]', '', ocr_item[1].upper())
        if 8 <= len(text) <= 11:
            fixed = fix_plate_ocr(text)
            print(f"  Partial fallback: {fixed}")
            return fixed
    print(f"  No plate found")
    return None

# =====================================
# POSTGRES WRITER
# =====================================

def save_violation_to_postgres(stable_id, final_plate, timestamp, smoke_count, rel_crop_path, rel_plate_path, rel_frame_path, rel_video_path, uploaded_video_id=None):
    if not final_plate or final_plate == "UNKNOWN":
        print("Skipping UNKNOWN plate")
        return
    print(f"Saving violation event for stable ID {stable_id} to Postgres (Upload Ref: {uploaded_video_id})...")
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        # Skip duplicates within last 1 hour
        cur.execute("""
            SELECT id
            FROM violations
            WHERE plate_number = %s
            AND created_at >= NOW() - INTERVAL '1 hour'
            LIMIT 1
        """, (final_plate,))

        if cur.fetchone():
            print(f"Duplicate violation skipped for {final_plate}")
            return
        # Check if camera exists, get first camera
        cur.execute("SELECT id FROM cameras LIMIT 1;")
        res = cur.fetchone()
        camera_id = res[0] if res else None
        
        violation_id = str(uuid.uuid4())
        confidence = 0.85  # default confidence for visual verification
        status = "pending"
        worker_id = "worker_1"
        model_version = "yolov8n-smoke-v1"
        processing_duration = 0.05
        from datetime import datetime
        import pytz

        ist = pytz.timezone("Asia/Kolkata")
        created_at = datetime.now(ist)

        # Insert violation record
        cur.execute("""
            INSERT INTO violations (
                id, camera_id, uploaded_video_id, plate_number, timestamp, confidence, status, 
                worker_id, model_version, processing_duration, 
                vehicle_crop_path, plate_crop_path, annotated_frame_path, proof_video_path, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, (
            violation_id, camera_id, uploaded_video_id, final_plate, timestamp, confidence, status,
            worker_id, model_version, processing_duration,
            rel_crop_path, rel_plate_path, rel_frame_path, rel_video_path, created_at
        ))

        # Insert notification record
        notification_id = str(uuid.uuid4())
        msg = f"Violation alert: Smoke detected from vehicle {final_plate} at {timestamp}"
        cur.execute("""
            INSERT INTO notifications (id, violation_id, message, is_read, created_at)
            VALUES (%s, %s, %s, %s, %s);
        """, (notification_id, violation_id, msg, False, created_at))

        conn.commit()
        cur.close()
        print(f"Successfully inserted violation {violation_id} into PostgreSQL")

        # Publish notification event via Redis Pub/Sub
        if redis_client:
            event_payload = {
                "id": violation_id,
                "plate_number": final_plate,
                "timestamp": timestamp,
                "confidence": confidence,
                "status": status,
                "camera_name": "Video Source",
                "message": msg,
                "created_at": created_at.isoformat()
            }
            redis_client.publish("violations:notifications", json.dumps(event_payload))
            print("Successfully published notification event to Redis.")

    except Exception as e:
        print(f"Error inserting violation to PostgreSQL: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

# =====================================
# PROCESSING FRAME FUNCTION
# =====================================
# We maintain buffered frames for generating proof videos
recent_frames = deque(maxlen=300)
logger = logging.getLogger("proof_video")

def _transcode_to_h264(src_path, dst_path):
    cmd = [
        "ffmpeg",
        "-y",
        "-i", src_path,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "veryfast",
        "-movflags", "+faststart",
        dst_path,
    ]

    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    return result.returncode == 0


def generate_proof_video(recent_frames, video_path, fps, width, height):

    temp_video = video_path.replace(".mp4", "_temp.mp4")

    writer = cv2.VideoWriter(
        temp_video,
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height)
    )

    for f_buf in recent_frames:
        writer.write(f_buf)

    writer.release()

    success = _transcode_to_h264(temp_video, video_path)

    if success:
        print(f"Proof video converted to browser-compatible H264: {video_path}")

        if os.path.exists(temp_video):
            os.remove(temp_video)
    else:
        print(f"FFmpeg conversion failed for {video_path}")

def process_image_frame(frame, frame_no, fps, out_writer, uploaded_video_id=None):
    global next_stable_id
    used_ids_this_frame.clear()
    
    # Store frame for video replay buffer
    recent_frames.append(frame.copy())

    # Detect Smoke
    smoke_results = smoke_model(frame, conf=0.18, imgsz=960, device=DEVICE, verbose=False)
    smoke_boxes = []
    
    for box in smoke_results[0].boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        smoke_boxes.append((x1, y1, x2, y2))
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
        cv2.putText(frame, "Smoke", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

    # Detect Vehicles
    vehicle_results = vehicle_model(frame, conf=0.20, imgsz=960, device=DEVICE, verbose=False)
    current_vehicles = []

    for box in vehicle_results[0].boxes:
        cls = int(box.cls[0])
        if cls not in vehicle_classes:
            continue
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        vehicle_box = (x1, y1, x2, y2)
        name = vehicle_model.names[cls]
        stable_id = match_or_create_stable_id(vehicle_box, name, frame_no)
        track_age[stable_id] += 1
        current_vehicles.append((stable_id, vehicle_box, name))

    for stable_id, vehicle_box, name in current_vehicles:
        smoke_found = False
        for smoke_box in smoke_boxes:
            if smoke_near_vehicle(smoke_box, vehicle_box):
                smoke_found = True
                break

        smoke_history[stable_id].append(1 if smoke_found else 0)
        smoke_count = sum(smoke_history[stable_id])
        checked = len(smoke_history[stable_id])

        x1, y1, x2, y2 = vehicle_box
        crop = frame[y1:y2, x1:x2]
        area = (x2 - x1) * (y2 - y1)

        # Save Best Frame
        if crop.size > 0:
            if stable_id not in best_vehicle_area or area > best_vehicle_area[stable_id]:
                best_vehicle_area[stable_id] = area
                best_vehicle_crop[stable_id] = crop.copy()
                best_vehicle_frame[stable_id] = frame.copy()

        suspect = (
            checked >= 150
            and smoke_count >= 60
            and track_age[stable_id] >= 100
        )

        if suspect and stable_id not in saved_suspects:
            timestamp_sec = frame_no / fps
            minutes = int(timestamp_sec // 60)
            seconds = int(timestamp_sec % 60)
            time_string = f"{minutes:02d}:{seconds:02d}"

            # Prepare relative paths and write files
            prefix = f"upload_{uploaded_video_id}_" if uploaded_video_id else "default_"
            crop_filename = f"Vehicle_{prefix}{stable_id}_crop.jpg"
            frame_filename = f"Vehicle_{prefix}{stable_id}_frame.jpg"
            plate_filename = f"Vehicle_{prefix}{stable_id}_plate.jpg"
            video_filename_temp = f"Vehicle_{prefix}{stable_id}_proof_temp.mp4"
            video_filename = f"Vehicle_{prefix}{stable_id}_proof.mp4"

            crop_path = os.path.join(EVIDENCE_DIR, "crops", crop_filename)
            frame_path = os.path.join(EVIDENCE_DIR, "frames", frame_filename)
            plate_path = os.path.join(EVIDENCE_DIR, "plates", plate_filename)
            video_path_temp = os.path.join(EVIDENCE_DIR, "videos", video_filename_temp)
            video_path = os.path.join(EVIDENCE_DIR, "videos", video_filename)

            if stable_id in best_vehicle_frame:
                cv2.imwrite(frame_path, best_vehicle_frame[stable_id])
            else:
                cv2.imwrite(frame_path, frame)
            
            if stable_id in best_vehicle_crop:
                cv2.imwrite(crop_path, best_vehicle_crop[stable_id])
            elif crop.size > 0:
                cv2.imwrite(crop_path, crop)

            # Plate Extraction
            vehicle_crop = best_vehicle_crop.get(stable_id, None)
            plate_results = None
            if vehicle_crop is not None and vehicle_crop.size > 0:
                try:
                    plate_results = plate_model(vehicle_crop, conf=0.10, device=DEVICE, verbose=False)
                except Exception as e:
                    print(f"Plate model error: {e}")

            plate_saved = False
            if plate_results is not None:
                for plate_box in plate_results[0].boxes:
                    px1, py1, px2, py2 = map(int, plate_box.xyxy[0])
                    pad = 5
                    px1 = max(0, px1 - pad)
                    py1 = max(0, py1 - pad)
                    px2 = min(vehicle_crop.shape[1], px2 + pad)
                    py2 = min(vehicle_crop.shape[0], py2 + pad)
                    plate_crop = vehicle_crop[py1:py2, px1:px2]
                    
                    if plate_crop.size > 0:
                        cv2.imwrite(plate_path, plate_crop)
                        plate_saved = True
                        print(
                            f"Vehicle {stable_id} plate size = "
                            f"{plate_crop.shape[1]}x{plate_crop.shape[0]}"
                        )
                        plate_number = read_plate_from_crop(plate_crop, stable_id)
                        if plate_number:
                            vehicle_ocr_history[stable_id].append(plate_number)

            if not plate_saved:
                # Fallback empty plate image
                dummy_plate = np.zeros((100, 300, 3), dtype=np.uint8)
                cv2.putText(dummy_plate, "PLATE CROP", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                cv2.imwrite(plate_path, dummy_plate)

            final_plate = "UNKNOWN"

            if vehicle_ocr_history[stable_id]:
                final_plate = Counter(
                    vehicle_ocr_history[stable_id]
                ).most_common(1)[0][0]

            # Skip if OCR failed
            if final_plate == "UNKNOWN":
                print(
                    f"Skipping Vehicle {stable_id} - "
                    f"no valid plate detected"
                )
                saved_suspects.add(stable_id)
                continue
            # Validate Indian plate format
            INDIAN_PLATE_REGEX = r'^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$'

            if not re.match(INDIAN_PLATE_REGEX, final_plate):
                print(f"Rejected invalid plate: {final_plate}")
                saved_suspects.add(stable_id)
                continue
            # Generate Proof Video from buffer
            print(f"Generating proof video for Vehicle {stable_id}...")
            height, width = frame.shape[:2]
            generate_proof_video(
                recent_frames,
                video_path,
                fps,
                width,
                height
            )
            print(f"Frames in buffer: {len(recent_frames)}")

            cap = cv2.VideoCapture(video_path)
            print("Proof video opened:", cap.isOpened())
            print("Frame count:", int(cap.get(cv2.CAP_PROP_FRAME_COUNT)))
            print("FPS:", cap.get(cv2.CAP_PROP_FPS))
            cap.release()
            # Save violation details in PostgreSQL
            save_violation_to_postgres(
                stable_id,
                final_plate,
                time_string,
                smoke_count,
                f"crops/{crop_filename}",
                f"plates/{plate_filename}",
                f"frames/{frame_filename}",
                f"videos/{video_filename}",
                uploaded_video_id
            )
            saved_suspects.add(stable_id)

        color = (0, 0, 255) if suspect else (255, 0, 0)
        label = f"SUSPECT Vehicle-{stable_id}" if suspect else f"Vehicle-{stable_id}"
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

    if out_writer is not None:
        out_writer.write(frame)

# =====================================
# QUEUE TASK RUNNER
# =====================================
def process_video_file(filepath, uploaded_video_id=None):
    abs_path = os.path.join(EVIDENCE_DIR, filepath) if not os.path.isabs(filepath) else filepath
    print(f"Worker processing video: {abs_path}")
    
    cap = cv2.VideoCapture(abs_path)
    if not cap.isOpened():
        print(f"ERROR: Could not open video file {abs_path}")
        return False
        
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0:
        fps = 30
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    frame_no = 0
    # Clear tracker data between runs to prevent bleed-through
    global stable_tracks, next_stable_id, track_age, smoke_history, saved_suspects, vehicle_ocr_history, best_vehicle_crop, best_vehicle_frame, best_vehicle_area
    stable_tracks.clear()
    next_stable_id = 1
    track_age.clear()
    smoke_history.clear()
    saved_suspects.clear()
    vehicle_ocr_history.clear()
    best_vehicle_crop.clear()
    best_vehicle_frame.clear()
    best_vehicle_area.clear()
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_no += 1
        if frame_no % 30 == 0:
            print(f"Processing frame: {frame_no}")
        process_image_frame(frame, frame_no, fps, None, uploaded_video_id)
        
    cap.release()
    print(f"Finished processing video file {abs_path}")
    return True

def update_video_status_in_postgres(video_id, status):
    if not video_id:
        return
    print(f"Updating video {video_id} status to '{status}'...")
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Get filename first for notification payload
        cur.execute("SELECT filename FROM uploaded_videos WHERE id = %s", (video_id,))
        res = cur.fetchone()
        filename = res[0] if res else "Unknown Video"

        cur.execute("""
            UPDATE uploaded_videos
            SET status = %s
            WHERE id = %s
        """, (status, video_id))
        conn.commit()
        cur.close()
        print(f"Video {video_id} status updated to {status} successfully.")
        
        # Publish WebSocket / Redis notification event
        if redis_client:
            event_payload = {
                "type": "video_status",
                "video_id": str(video_id),
                "status": status,
                "filename": filename,
                "message": f"Video '{filename}' processing has {status}.",
                "created_at": datetime.utcnow().isoformat()
            }
            redis_client.publish("violations:notifications", json.dumps(event_payload))
            print("Published video status update to Redis.")
    except Exception as e:
        print(f"Error updating video status in PostgreSQL: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

# =====================================
# MAIN INGESTION LAYER
# =====================================
def run_worker():
    if USE_REDIS_STREAM:
        print("Starting in REDIS STREAM ingestion mode...")
        # Consumer loop for Redis stream 'camera:frames'
        r = redis.Redis.from_url(REDIS_URL)
        stream_name = "camera:frames"
        group_name = "worker_group"
        consumer_name = "worker_1"

        try:
            r.xgroup_create(stream_name, group_name, mkstream=True)
        except Exception:
            # Group might exist
            pass

        print(f"Listening to Redis Stream {stream_name}...")
        frame_no = 0
        fps = 30
        
        while True:
            try:
                # Read new message
                response = r.xreadgroup(group_name, consumer_name, {stream_name: ">"}, count=1, block=5000)
                if not response:
                    continue
                
                for stream, messages in response:
                    for msg_id, payload in messages:
                        frame_no += 1
                        frame_bytes = payload[b'frame']
                        nparr = np.frombuffer(frame_bytes, np.uint8)
                        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                        
                        if frame is not None:
                            process_image_frame(frame, frame_no, fps, None)
                            
                        # Acknowledge processed frame
                        r.xack(stream_name, group_name, msg_id)
            except Exception as e:
                print(f"Error reading from Redis Stream: {e}")
                time.sleep(1)
    else:
        print("Starting in QUEUE/VIDEO ingestion mode...")
        has_processed_default = False
        
        while True:
            task_data = None
            if redis_client:
                try:
                    # Wait up to 2 seconds for a task
                    task_bytes = redis_client.blpop("video:tasks", timeout=2)
                    if task_bytes:
                        # blpop returns a tuple (key, value)
                        task_data = json.loads(task_bytes[1])
                except Exception as e:
                    print(f"Error reading from Redis queue: {e}")
                    time.sleep(2)
                    continue

            if task_data:
                video_id = task_data.get("video_id")
                filepath = task_data.get("filepath")
                filename = task_data.get("filename")
                print(f"Received video task: {filename} (ID: {video_id})")
                
                update_video_status_in_postgres(video_id, "processing")
                try:
                    success = process_video_file(filepath, video_id)
                    if success:
                        update_video_status_in_postgres(video_id, "completed")
                    else:
                        update_video_status_in_postgres(video_id, "failed")
                except Exception as e:
                    print(f"Error processing video task: {e}")
                    update_video_status_in_postgres(video_id, "failed")
            else:
                # Process default video if it exists and hasn't been processed yet
                if not has_processed_default and VIDEO_INPUT_PATH and os.path.exists(VIDEO_INPUT_PATH):
                    print(f"No queued tasks. Processing default video: {VIDEO_INPUT_PATH}")
                    try:
                        process_video_file(VIDEO_INPUT_PATH, None)
                    except Exception as e:
                        print(f"Error processing default video: {e}")
                    has_processed_default = True
                else:
                    time.sleep(1)

if __name__ == "__main__":
    print("Worker process running...")
    # Sleep to allow DB to startup
    time.sleep(5)
    run_worker()