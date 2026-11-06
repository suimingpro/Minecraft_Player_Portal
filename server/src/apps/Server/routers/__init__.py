from fastapi import APIRouter

from src.apps.Server.routers.admin_rules import router as admin_rules_router
from src.apps.Server.routers.admin_servers import router as admin_servers_router
from src.apps.Server.routers.public import router as public_router
from src.apps.Server.routers.upload import router as upload_router

router = APIRouter(tags=["Server Management"])

router.include_router(public_router)
router.include_router(admin_servers_router)
router.include_router(admin_rules_router)
router.include_router(upload_router)

__all__ = ["router"]
