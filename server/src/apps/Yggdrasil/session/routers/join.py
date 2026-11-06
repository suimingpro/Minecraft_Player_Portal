import json

from fastapi import APIRouter, Request, Response

from pydantic import BaseModel

from src.apps.Yggdrasil.redis import redis_client


router = APIRouter()


class JoinRequest(BaseModel):
    accessToken: str
    selectedProfile: str
    serverId: str


@router.post("/join")
async def join(
    body: JoinRequest,
    request: Request,
):
    raw = await redis_client.get(f"yggdrasil:token:{body.accessToken}")
    if not raw:
        return Response(status_code=403)
        
    token_data = json.loads(raw)
    selected_profile = token_data.get("selectedProfile")
    if not selected_profile:
        return Response(status_code=403)
        
    expected_uuid = selected_profile["id"].replace("-", "")
    received_uuid = body.selectedProfile.replace("-", "")
    if expected_uuid != received_uuid:
        return Response(status_code=403)

    client_ip = None
    if request.client:
        client_ip = request.client.host

    session = {
        "accessToken": body.accessToken,
        "profile": received_uuid,
        "username": selected_profile["name"],
        "ip": client_ip,
    }

    await redis_client.setex(
        f"yggdrasil:join:{body.serverId}",
        30,
        json.dumps(session),
    )

    return Response(
        status_code=204
    )
