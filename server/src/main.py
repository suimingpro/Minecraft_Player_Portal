import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import (
    CORSMiddleware,
)
from src.apps.MicrosoftSSO.app import (
    router as microsoft_sso_router,
)
from src.apps.Player.app import (
    router as player_router,
)
from src.apps.Admin.app import (
    router as admin_router,
)
from src.apps.MicrosoftSSO.database import (
    init_db,
)
from src.apps.Yggdrasil.app import (
    app as yggdrasil_app,
)
from src.apps.Server.app import (
    router as server_router,
)
from src.apps.Server.yggdrasil import (
    router as server_yggdrasil_router,
)

# ============================================================
# Application lifespan
# ============================================================


@asynccontextmanager
async def lifespan(
    app: FastAPI,
):

    # Automatically create missing tables.
    await init_db()

    print("Database initialization completed")

    yield


# ============================================================
# FastAPI
# ============================================================

app = FastAPI(
    title="Minecraft Player Portal",
    version="0.1.0",
    lifespan=lifespan,
)


# ============================================================
# CORS
# ============================================================

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://localhost:3000").rstrip("/")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://localhost:3000",
        "https://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        FRONTEND_URL,
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=[
        "*",
    ],
    allow_headers=[
        "*",
    ],
)


# ============================================================
# Microsoft SAML SSO & Player
# ============================================================

app.include_router(microsoft_sso_router)
app.include_router(player_router)
app.include_router(admin_router)
app.include_router(server_router)
app.include_router(server_yggdrasil_router)


# ============================================================
# Yggdrasil
# ============================================================

app.mount(
    "/api/yggdrasil",
    yggdrasil_app,
)


# ============================================================
# Root
# ============================================================


@app.get("/")
async def root():
    return {
        "name": "Minecraft Player Portal",
        "version": "0.1.0",
        "yggdrasil": "/api/yggdrasil/",
        "saml_login": "/auth/saml/login",
        "saml_logout": "/auth/saml/logout",
        "current_user": "/auth/me",
    }
