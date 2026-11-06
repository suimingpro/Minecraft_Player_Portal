from fastapi import APIRouter, Depends, HTTPException

from src.apps.Admin.app import require_admin
from src.apps.Server.crud import (
    create_server,
    delete_server,
    get_all_servers_with_stats,
    update_server,
)
from src.apps.Server.schemas import ServerCreateRequest, ServerUpdateRequest

router = APIRouter()


@router.get("/auth/api/admin/servers")
async def admin_list_servers(admin_uuid: str = Depends(require_admin)):
    """List all servers with rule statistics for administrators."""
    servers = await get_all_servers_with_stats()
    return {"servers": servers}


@router.post("/auth/api/admin/servers")
async def admin_create_server(
    body: ServerCreateRequest,
    admin_uuid: str = Depends(require_admin),
):
    """Add a new Minecraft server with auto-assigned UUID and configuration."""
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="服务器名称不能为空")

    server = await create_server(
        name=name,
        description=body.description,
        address=body.address,
        icon_url=body.icon_url,
        access_mode=body.access_mode,
        is_public=body.is_public,
    )
    return {"success": True, "server": server}


@router.put("/auth/api/admin/servers/{server_id}")
async def admin_update_server(
    server_id: str,
    body: ServerUpdateRequest,
    admin_uuid: str = Depends(require_admin),
):
    """Update server settings."""
    server = await update_server(
        server_id=server_id,
        name=body.name,
        description=body.description,
        address=body.address,
        icon_url=body.icon_url,
        access_mode=body.access_mode,
        is_public=body.is_public,
    )
    if not server:
        raise HTTPException(status_code=404, detail="服务器未找到")
    return {"success": True, "server": server}


@router.delete("/auth/api/admin/servers/{server_id}")
async def admin_delete_server(
    server_id: str,
    admin_uuid: str = Depends(require_admin),
):
    """Delete server and all its player rules."""
    deleted = await delete_server(server_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="服务器未找到")
    return {"success": True}
