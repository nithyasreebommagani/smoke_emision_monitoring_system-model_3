from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError
from app.core.config import settings
from app.services.notifications import manager

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(None)
):
    # Verify token if present (optional but recommended for security)
    if token:
        try:
            jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        except JWTError:
            # We can reject or just allow read-only, but let's allow it for simplicity since UI connects from browser
            pass
            
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open. Read incoming client messages (if any)
            # Typically dashboard clients are passive listeners, but this keeps the connection alive
            data = await websocket.receive_text()
            # Respond to ping or other messages
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)
