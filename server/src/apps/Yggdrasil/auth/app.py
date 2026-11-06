from fastapi import FastAPI
from .routers import authenticate, refresh, validate, invalidate, signout

app = FastAPI(docs_url=None, redoc_url=None)

app.include_router(authenticate.router)
app.include_router(refresh.router)
app.include_router(validate.router)
app.include_router(invalidate.router)
app.include_router(signout.router)
