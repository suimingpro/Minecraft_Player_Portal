import os
import uuid as _uuid
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError as _IE

from src.apps.MicrosoftSSO.session import get_session_user_uuid
from .database import (
    Player,
    create_player,
    get_player_by_user_uuid,
    update_player_account,
    update_player_skin,
)
from .validation import validate_png_bytes, validate_texture_url

API_BASE_URL = os.getenv("API_BASE_URL", "https://localhost:8000").rstrip("/")
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/auth/api/players", tags=["Players"])


def _player_dict(p: Player) -> dict:
    return {
        "player_uuid": p.player_uuid,
        "minecraft_username": p.minecraft_username,
        "skin_url": p.skin_url,
        "cape_url": p.cape_url,
        "skin_model": p.skin_model,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


# ============================================================
# Request Models
# ============================================================

class PlayerBindRequest(BaseModel):
    auth_token: str
    skin_model: str | None = None  # "default" | "slim"


class PlayerUpdateRequest(BaseModel):
    auth_token: str


class SkinUpdateRequest(BaseModel):
    skin_url: str | None = None
    cape_url: str | None = None
    skin_model: str | None = None  # "default" | "slim"


# ============================================================
# GET /auth/api/players/me
# ============================================================

@router.get("/me")
async def get_my_player(request: Request):
    """Return the Player row linked to the current session user."""
    user_uuid = await get_session_user_uuid(request)
    player = await get_player_by_user_uuid(user_uuid)
    return {"player": _player_dict(player) if player else None}


# ============================================================
# POST /auth/api/players/me  –  bind Minecraft account
# ============================================================

@router.post("/me")
async def bind_my_player(body: PlayerBindRequest, request: Request):
    """
    Create a player profile for the current user using Aristois verification.
    Returns 409 if one already exists.
    """
    user_uuid = await get_session_user_uuid(request)

    # Check if this user already has a player profile
    existing = await get_player_by_user_uuid(user_uuid)
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="A Minecraft account is already bound to this user profile.",
        )

    # Validate Aristois token via auth.aristois.net
    import httpx
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(f"https://auth.aristois.net/token/{body.auth_token}")
        data = res.json()
        if "uuid" not in data or "username" not in data:
            raise HTTPException(status_code=400, detail=data.get("message", "验证码无效或已过期"))
        mc_uuid = data["uuid"]
        mc_user = data["username"]

        # Fetch skin texture from PlayerDB if available
        skin_url = None
        try:
            pdb_res = await client.get(f"https://playerdb.co/api/player/minecraft/{mc_user}")
            if pdb_res.status_code == 200:
                pdb_data = pdb_res.json()
                if pdb_data.get("success"):
                    skin_url = pdb_data["data"]["player"].get("skin_texture")
        except Exception:
            pass

    skin_model = body.skin_model if body.skin_model in ("default", "slim") else "default"

    try:
        player = await create_player(
            user_uuid=user_uuid,
            player_uuid=mc_uuid,
            minecraft_username=mc_user,
            skin_url=skin_url,
            skin_model=skin_model,
        )
    except _IE:
        raise HTTPException(
            status_code=409,
            detail="player_uuid or minecraft_username is already taken.",
        )

    return {"player": _player_dict(player)}


# ============================================================
# PUT /auth/api/players/me  –  Update bound Minecraft account
# ============================================================

@router.put("/me")
async def update_my_player_account(body: PlayerUpdateRequest, request: Request):
    """Update the bound Minecraft username and UUID using Aristois verification."""
    user_uuid = await get_session_user_uuid(request)

    import httpx
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(f"https://auth.aristois.net/token/{body.auth_token}")
        data = res.json()
        if "uuid" not in data or "username" not in data:
            raise HTTPException(status_code=400, detail=data.get("message", "验证码无效或已过期"))
        mc_uuid = data["uuid"]
        mc_user = data["username"]

    try:
        updated = await update_player_account(
            user_uuid=user_uuid,
            player_uuid=mc_uuid,
            minecraft_username=mc_user,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Player profile not found.")
        return {"player": _player_dict(updated)}
    except _IE:
        raise HTTPException(
            status_code=409,
            detail="player_uuid or minecraft_username is already taken by another user.",
        )


# ============================================================
# PATCH /auth/api/players/me/skin  –  update skin / cape
# ============================================================

@router.patch("/me/skin")
async def update_my_skin(body: SkinUpdateRequest, request: Request):
    """Update the skin / cape for the current user's player profile."""
    user_uuid = await get_session_user_uuid(request)

    if body.skin_model is not None and body.skin_model not in ("default", "slim"):
        raise HTTPException(status_code=422, detail="skin_model must be 'default' or 'slim'")

    # Validate skin_url if provided
    if body.skin_url and body.skin_url.strip():
        valid, err_msg = await validate_texture_url(body.skin_url.strip(), "skin")
        if not valid:
            raise HTTPException(status_code=400, detail=f"Skin URL 校验失败: {err_msg}")

    # Validate cape_url if provided
    if body.cape_url and body.cape_url.strip():
        valid, err_msg = await validate_texture_url(body.cape_url.strip(), "cape")
        if not valid:
            raise HTTPException(status_code=400, detail=f"Cape URL 校验失败: {err_msg}")

    updated = await update_player_skin(
        user_uuid=user_uuid,
        skin_url=body.skin_url.strip() if body.skin_url else None,
        cape_url=body.cape_url.strip() if body.cape_url else None,
        skin_model=body.skin_model,
    )
    if updated is None:
        raise HTTPException(
            status_code=404,
            detail="Player profile not found. Bind a Minecraft account first.",
        )

    return {"player": _player_dict(updated)}


# ============================================================
# POST /auth/api/players/me/upload  –  Upload custom skin
# ============================================================

@router.post("/me/upload")
async def upload_my_skin(request: Request, file: UploadFile = File(...)):
    """
    Upload a custom skin file. Max 10MB.
    Returns the URL to access the uploaded skin.
    """
    user_uuid = await get_session_user_uuid(request)

    if not file.filename or not file.filename.lower().endswith(".png"):
        raise HTTPException(status_code=400, detail="Only PNG files are allowed.")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10MB).")

    valid, err_msg = validate_png_bytes(contents, "skin")
    if not valid:
        raise HTTPException(status_code=400, detail=f"上传的皮肤文件无效: {err_msg}")

    ext = ".png"
    filename = f"{user_uuid}_{_uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    url = f"{API_BASE_URL}/auth/api/players/uploads/{filename}"
    return {"url": url}


# ============================================================
# GET /auth/api/players/uploads/{filename}
# ============================================================

@router.get("/uploads/{filename}")
async def get_uploaded_skin(filename: str):
    """Serve uploaded skins."""
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath, media_type="image/png")
