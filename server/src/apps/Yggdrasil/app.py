from fastapi import FastAPI

from src.apps.Yggdrasil.session.app import app as session_app
from src.apps.Yggdrasil.auth.app import app as auth_app


app = FastAPI(
    title="Minecraft Player Portal Yggdrasil",
    docs_url=None,
    redoc_url=None,
)


app.mount(
    "/sessionserver/session/minecraft",
    session_app
)
app.mount("/authserver", auth_app)



import os
def get_public_key():
    pub_path = os.path.join("certs", "yggdrasil", "public.pem")
    if os.path.exists(pub_path):
        with open(pub_path, "r") as f:
            return f.read()
    return ""

@app.get("/")
async def metadata():
    return {
        "meta": {
            "implementationName": "MinecraftPlayerPortal",
            "implementationVersion": "0.1.0",
            "serverName": "Minecraft Player Portal",
            "feature.non_email_login": True,
            "feature.enable_profile_key": False,
        },
        "skinDomains": [
            "localhost",
            "127.0.0.1"
        ],
        "signaturePublickey": get_public_key()
    }