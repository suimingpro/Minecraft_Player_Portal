import json
import os
from fastapi import HTTPException, Request
from redis.asyncio import Redis

REDIS_URL = os.getenv(
    "REDIS_URL",
    "redis://localhost:6379/0",
)

COOKIE_NAME = os.getenv(
    "SESSION_COOKIE_NAME",
    "minecraft_portal_session",
)

SESSION_TTL = 60 * 60 * 24 * 7

redis = Redis.from_url(
    REDIS_URL,
    decode_responses=True,
)


async def get_session_user_uuid(request: Request) -> str:
    """
    Read the Portal session cookie and return the user's UUID.
    Raises HTTPException 401 if not authenticated.
    """
    session_id = request.cookies.get(COOKIE_NAME)
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session_json = await redis.get(f"portal:session:{session_id}")
    if not session_json:
        raise HTTPException(status_code=401, detail="Session expired")

    session_data = json.loads(session_json)
    user = session_data.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")

    return user["uuid"]


_get_session_user_uuid = get_session_user_uuid
