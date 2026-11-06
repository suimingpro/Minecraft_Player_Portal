from fastapi import FastAPI

from src.apps.Yggdrasil.session.routers.join import router as join_router
from src.apps.Yggdrasil.session.routers.hasJoined import router as has_joined_router
from src.apps.Yggdrasil.session.routers.profile import router as profile_router


app = FastAPI(
    docs_url=None,
    redoc_url=None,
)

app.include_router(join_router)
app.include_router(has_joined_router)
app.include_router(profile_router)
