import asyncio
import json
import logging
from typing import List
from fastapi import WebSocket
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("notifications")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket client connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        logger.info(f"Broadcasting message to {len(self.active_connections)} clients")
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to client: {e}")
                # We don't remove during iteration to avoid modifying list, disconnect handler will clean it up

manager = ConnectionManager()

# Global listener for Redis Pub/Sub
async def redis_notification_listener(manager: ConnectionManager):
    logger.info("Starting Redis notification listener...")
    while True:
        try:
            redis_client = aioredis.from_url(settings.REDIS_URL)
            pubsub = redis_client.pubsub()
            await pubsub.subscribe("violations:notifications")
            logger.info("Subscribed to Redis channel 'violations:notifications'")
            
            async for message in pubsub.listen():
                if message['type'] == 'message':
                    data = message['data'].decode('utf-8')
                    logger.info(f"Received notification from Redis: {data}")
                    await manager.broadcast(data)
        except aioredis.ConnectionError as e:
            logger.error(f"Redis connection error in listener: {e}. Retrying in 5 seconds...")
            await asyncio.sleep(5)
        except Exception as e:
            logger.error(f"Error in Redis listener loop: {e}. Retrying in 5 seconds...")
            await asyncio.sleep(5)
