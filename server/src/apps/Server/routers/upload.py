import os
import uuid as _uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from src.apps.Admin.app import require_admin

router = APIRouter()

API_BASE_URL = os.getenv("API_BASE_URL", "https://localhost:8000").rstrip("/")
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/auth/api/admin/servers/upload-icon")
async def admin_upload_server_icon(
    file: UploadFile = File(...),
    admin_uuid: str = Depends(require_admin),
):
    """
    Upload a server icon / avatar image (max 10MB).
    Allowed formats: PNG, JPG, JPEG, WEBP, GIF, ICO, SVG.
    Returns the URL to access the uploaded image.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="未提供有效的文件名")

    ext = os.path.splitext(file.filename)[1].lower()
    allowed_extensions = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".svg"}
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"仅支持图片格式文件 ({', '.join(sorted(allowed_extensions))})",
        )

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="文件过大（最大支持 10MB）")

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="上传的文件内容为空")

    filename = f"server_icon_{_uuid.uuid4().hex[:12]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    url = f"{API_BASE_URL}/auth/api/servers/uploads/{filename}"
    return {"url": url}
