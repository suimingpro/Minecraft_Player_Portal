from fastapi import APIRouter, Response
from pydantic import BaseModel
from src.apps.MicrosoftSSO.database import SessionLocal, User
from sqlalchemy import select

router = APIRouter()

class SignoutRequest(BaseModel):
    username: str
    password: str

@router.post("/signout")
async def signout(body: SignoutRequest):
    async with SessionLocal() as session:
        result = await session.execute(select(User).where(User.email == body.username))
        user = result.scalar_one_or_none()
        if not user or user.launcher_password != body.password:
            return Response(status_code=403)
            
    # For a perfect implementation we would delete all tokens for this user in Redis,
    # but storing a user->tokens map in Redis is complex. For now just return 204.
    return Response(status_code=204)
