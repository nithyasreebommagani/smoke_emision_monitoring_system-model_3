import sys
import time
import requests
import json
import websocket
import psycopg2
import redis

# Configuration
DB_URL = "postgresql://postgres:postgrespassword@localhost:5432/smoke_emission_db"
REDIS_URL = "redis://localhost:6379/0"
API_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws"

def run_tests():
    print("====================================================")
    # 1. Test PostgreSQL Connection
    print("1. Testing PostgreSQL Database connection...")
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("SELECT version();")
        db_version = cur.fetchone()[0]
        print(f"   [SUCCESS] Connected to PostgreSQL. Version: {db_version[:50]}...")
        
        # Verify cameras table and seed data
        cur.execute("SELECT id, name, location FROM cameras;")
        cameras = cur.fetchall()
        print(f"   [SUCCESS] Found {len(cameras)} registered cameras:")
        for cam in cameras:
            print(f"      - ID: {cam[0]} | Name: {cam[1]} | Location: {cam[2]}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"   [FAILED] PostgreSQL connection failed: {e}")
        
    print("----------------------------------------------------")
    # 2. Test Redis Connection
    print("2. Testing Redis connection...")
    try:
        r = redis.Redis.from_url(REDIS_URL)
        r.ping()
        print("   [SUCCESS] Connected to Redis Cache & Stream Broker.")
    except Exception as e:
        print(f"   [FAILED] Redis connection failed: {e}")

    print("----------------------------------------------------")
    # 3. Test Backend Health Endpoint
    print("3. Testing Backend Health Endpoint...")
    try:
        res = requests.get(f"{API_URL}/")
        if res.status_code == 200:
            print(f"   [SUCCESS] FastAPI status check code: 200. Response: {res.json()}")
        else:
            print(f"   [FAILED] Status check returned code: {res.status_code}")
    except Exception as e:
        print(f"   [FAILED] Backend REST server unreachable: {e}")

    print("----------------------------------------------------")
    # 4. Test User Authorization Login
    print("4. Testing Admin User JWT Authentication...")
    token = None
    try:
        login_payload = {"username": "admin", "password": "admin123"}
        res = requests.post(f"{API_URL}/api/auth/login", json=login_payload)
        if res.status_code == 200:
            data = res.json()
            token = data["access_token"]
            print(f"   [SUCCESS] Login successful for user 'admin'. Role: {data['role']}")
            print(f"             JWT access token issued: {token[:40]}...")
        else:
            print(f"   [FAILED] Login returned code: {res.status_code}. Detail: {res.text}")
    except Exception as e:
        print(f"   [FAILED] JWT login exception: {e}")

    if not token:
        print("Aborting remaining tests as credentials authentication failed.")
        return

    print("----------------------------------------------------")
    # 5. Connect WebSocket & Emulate Mock Violation
    print("5. Testing Real-time WebSocket Alert Broadcast...")
    
    ws_received_message = None

    def on_message(ws, message):
        nonlocal ws_received_message
        print(f"   [WS EVENT] Notification Received over WebSocket!")
        ws_received_message = json.loads(message)
        ws.close()

    def on_error(ws, error):
        print(f"   [WS ERROR] WebSocket error: {error}")

    def on_open(ws):
        print("   [WS CONNECTED] Listening for alerts on WebSocket...")
        
        # In a small delay, send a mock violation via REST API to trigger WebSocket broadcast
        def trigger_violation():
            time.sleep(1.5)
            print("   [EMULATOR] Posting mock violation event...")
            
            # Fetch a camera ID to associate with
            conn = psycopg2.connect(DB_URL)
            cur = conn.cursor()
            cur.execute("SELECT id FROM cameras LIMIT 1;")
            camera_id = cur.fetchone()[0]
            cur.close()
            conn.close()

            violation_payload = {
                "camera_id": camera_id,
                "plate_number": "KA03MH9876",
                "timestamp": "02:15",
                "confidence": 0.94,
                "worker_id": "verify_script",
                "model_version": "verify_v1",
                "processing_duration": 0.045,
                "vehicle_crop_path": "crops/mock_crop.jpg",
                "plate_crop_path": "plates/mock_plate.jpg",
                "annotated_frame_path": "frames/mock_frame.jpg",
                "proof_video_path": "videos/mock_video.mp4"
            }
            
            # Post mock violation
            headers = {"Authorization": f"Bearer {token}"}
            res = requests.post(f"{API_URL}/api/violations", json=violation_payload, headers=headers)
            if res.status_code == 201:
                print(f"   [EMULATOR] Mock violation posted successfully. Plate: KA03MH9876")
            else:
                print(f"   [EMULATOR] Failed to post mock violation: {res.status_code} - {res.text}")

        # Run trigger in a separate thread to prevent blocking WebSocket client
        import threading
        threading.Thread(target=trigger_violation).start()

    # Launch websocket client
    try:
        # Pass token in query parameter for WebSocket auth
        ws = websocket.WebSocketApp(
            f"{WS_URL}?token={token}",
            on_message=on_message,
            on_error=on_error,
            on_open=on_open
        )
        ws.run_forever()
    except Exception as e:
        print(f"   [FAILED] WebSocket listener connection failed: {e}")

    print("----------------------------------------------------")
    # 6. Evaluate Results
    print("6. Verification Report Summary:")
    if ws_received_message:
        print("   [SUCCESS] Integration Test passed successfully!")
        print(f"             Alert message received: {ws_received_message.get('message')}")
        print(f"             Vehicle license plate: {ws_received_message.get('plate_number')}")
    else:
        print("   [FAILED] Integration Test failed. WebSocket did not receive the broadcast alert.")
    print("====================================================")

if __name__ == "__main__":
    print("Starting verification services verification script...")
    run_tests()
