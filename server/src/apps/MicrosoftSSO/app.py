import struct
import json
import os
import secrets
import time
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from fastapi.responses import JSONResponse, RedirectResponse, Response
from onelogin.saml2.auth import OneLogin_Saml2_Auth
from onelogin.saml2.settings import OneLogin_Saml2_Settings
from redis.asyncio import Redis
from sqlalchemy.exc import IntegrityError

from .database import (
    get_or_create_microsoft_user,
    User,
    SessionLocal,
    get_user_groups,
    get_user_groups_async,
    get_user_group_details_async,
    is_guid_string,
    check_user_is_admin,
    get_admin_groups,
    get_app_name,
)
from src.apps.Player.database import (
    get_player_by_user_uuid,
    create_player,
)
from sqlalchemy import select

# ============================================================
# Environment
# ============================================================

load_dotenv()


def require_env(name: str) -> str:
    value = os.getenv(name)

    if not value:
        raise RuntimeError(f"Environment variable {name} is required")

    return value


SAML_SP_ENTITY_ID = require_env("SAML_SP_ENTITY_ID")

SAML_SP_ACS_URL = require_env("SAML_SP_ACS_URL")

SAML_IDP_ENTITY_ID = require_env("SAML_IDP_ENTITY_ID")

SAML_IDP_SSO_URL = require_env("SAML_IDP_SSO_URL")
SAML_SP_SLS_URL = require_env("SAML_SP_SLS_URL")

SAML_IDP_SLO_URL = require_env("SAML_IDP_SLO_URL")
SAML_IDP_CERT_PATH = require_env("SAML_IDP_CERT_PATH")


FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "https://localhost:3000",
).rstrip("/")


from .session import (
    COOKIE_NAME,
    REDIS_URL,
    SESSION_TTL,
    _get_session_user_uuid,
    get_session_user_uuid,
    redis,
)

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"


COOKIE_SAMESITE = os.getenv(
    "COOKIE_SAMESITE",
    "lax",
)

# AuthnRequest -> SAML Response correlation
SAML_FLOW_TTL = 60 * 10

# Replay protection
SAML_REPLAY_TTL = 60 * 60


# ============================================================
# Load Microsoft Entra signing certificate
# ============================================================

candidate_cert_paths = [
    Path(SAML_IDP_CERT_PATH),
    Path.cwd() / SAML_IDP_CERT_PATH.lstrip("./"),
    Path("/app") / SAML_IDP_CERT_PATH.lstrip("./"),
    Path("/app/certs") / Path(SAML_IDP_CERT_PATH).name,
    Path("/app/cert") / Path(SAML_IDP_CERT_PATH).name,
    Path("certs") / Path(SAML_IDP_CERT_PATH).name,
    Path("cert") / Path(SAML_IDP_CERT_PATH).name,
]

certificate_path = None
for p in candidate_cert_paths:
    if p.exists() and p.is_file():
        certificate_path = p
        break

if certificate_path is None:
    raise RuntimeError(
        f"SAML certificate not found: {SAML_IDP_CERT_PATH} "
        f"(searched: {[str(p) for p in candidate_cert_paths]})"
    )

IDP_CERTIFICATE = certificate_path.read_text(encoding="utf-8")


# ============================================================
# Redis (managed in .session)
# ============================================================


# ============================================================
# Router
# ============================================================

router = APIRouter(
    prefix="/auth",
    tags=["Microsoft SAML SSO"],
)


# ============================================================
# SAML Settings
# ============================================================


def get_saml_settings() -> dict:
    return {
        "strict": True,
        "debug": False,
        "sp": {
            "entityId": SAML_SP_ENTITY_ID,
            "assertionConsumerService": {
                "url": SAML_SP_ACS_URL,
                "binding": ("urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"),
            },
            "singleLogoutService": {
                "url": SAML_SP_SLS_URL,
                "responseUrl": SAML_SP_SLS_URL,
                "binding": ("urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"),
            },
            "NameIDFormat": ("urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified"),
        },
        "idp": {
            "entityId": SAML_IDP_ENTITY_ID,
            "singleSignOnService": {
                "url": SAML_IDP_SSO_URL,
                "binding": ("urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"),
            },
            "singleLogoutService": {
                "url": SAML_IDP_SLO_URL,
                "responseUrl": SAML_IDP_SLO_URL,
                "binding": ("urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"),
            },
            "x509cert": IDP_CERTIFICATE,
        },
        "security": {
            # We currently don't sign our AuthnRequest.
            # Therefore the SP itself doesn't need
            # its own certificate/private key.
            "authnRequestsSigned": False,
            "logoutRequestSigned": False,
            "logoutResponseSigned": False,
            "signMetadata": False,
            # Require Microsoft's assertion to be signed.
            "wantAssertionsSigned": True,
            # Response itself does not also have to be
            # signed as long as the assertion is signed.
            "wantMessagesSigned": False,
            "wantAssertionsEncrypted": False,
            "wantNameIdEncrypted": False,
            # We validate NameID if one is present.
            "wantNameId": True,
            # Don't force an AuthnContext Microsoft
            # may not support for this tenant.
            "requestedAuthnContext": False,
            # Reject SHA-1 etc.
            "rejectDeprecatedAlgorithm": True,
        },
    }


# ============================================================
# Convert FastAPI request to python3-saml format
# ============================================================


async def prepare_saml_request(
    request: Request,
) -> dict:

    post_data = {}

    if request.method == "POST":
        form = await request.form()

        post_data = {key: str(value) for key, value in form.items()}

    return {
        "https": ("on" if request.url.scheme == "https" else "off"),
        "http_host": request.headers.get(
            "host",
            "localhost:8000",
        ),
        "script_name": request.url.path,
        "get_data": dict(request.query_params),
        "post_data": post_data,
        "query_string": request.url.query,
        "validate_signature_from_qs": True,
    }


def create_saml_auth(
    request_data: dict,
) -> OneLogin_Saml2_Auth:

    return OneLogin_Saml2_Auth(
        request_data,
        old_settings=get_saml_settings(),
    )


# ============================================================
# Helper for Microsoft claims
# ============================================================


def first_attribute(
    attributes: dict,
    *names: str,
) -> str | None:

    for name in names:
        values = attributes.get(name)

        if values and len(values) > 0:
            return values[0]

    return None


# (admin check functions imported from .database)


# ============================================================
# SAML Login
# ============================================================


@router.get("/saml/login")
async def saml_login(
    request: Request,
):
    """
    SP-initiated login.

    Browser:
        Portal
          -> FastAPI
          -> Microsoft Entra
    """

    request_data = await prepare_saml_request(request)

    auth = create_saml_auth(request_data)

    # Random RelayState.
    #
    # It is NOT a redirect URL.
    # It identifies this SAML login flow.
    relay_state = secrets.token_urlsafe(32)

    redirect_url = auth.login(
        return_to=relay_state,
        # Let Entra use its configured
        # NameID settings.
        set_nameid_policy=False,
    )

    request_id = auth.get_last_request_id()

    if not request_id:
        raise HTTPException(
            status_code=500,
            detail=("Unable to create SAML AuthnRequest"),
        )

    # Store correlation server-side.
    await redis.setex(
        f"saml:flow:{relay_state}",
        SAML_FLOW_TTL,
        request_id,
    )

    return RedirectResponse(
        url=redirect_url,
        status_code=302,
    )


# ============================================================
# Assertion Consumer Service
# ============================================================


@router.post("/saml/acs")
async def saml_acs(
    request: Request,
):
    """
    Microsoft Entra POSTs the SAMLResponse here.
    """

    request_data = await prepare_saml_request(request)

    post_data = request_data["post_data"]

    if "SAMLResponse" not in post_data:
        raise HTTPException(
            status_code=400,
            detail="Missing SAMLResponse",
        )

    relay_state = post_data.get("RelayState")

    request_id = None

    # ========================================================
    # SP initiated SSO:
    # validate InResponseTo against our AuthnRequest
    # ========================================================

    if relay_state:
        request_id = await redis.get(f"saml:flow:{relay_state}")

        if request_id is None:
            return RedirectResponse(
                (f"{FRONTEND_URL}/login?error=invalid_saml_state"),
                status_code=303,
            )

        # A flow may only be consumed once.
        await redis.delete(f"saml:flow:{relay_state}")

    auth = create_saml_auth(request_data)

    try:
        auth.process_response(request_id=request_id)

    except Exception as exc:
        print(
            "SAML validation exception:",
            repr(exc),
        )

        return RedirectResponse(
            (f"{FRONTEND_URL}/login?error=saml_validation_failed"),
            status_code=303,
        )

    errors = auth.get_errors()

    if errors:
        print(
            "SAML errors:",
            errors,
        )

        print(
            "SAML error reason:",
            auth.get_last_error_reason(),
        )

        return RedirectResponse(
            (f"{FRONTEND_URL}/login?error=saml_invalid_response"),
            status_code=303,
        )

    if not auth.is_authenticated():
        return RedirectResponse(
            (f"{FRONTEND_URL}/login?error=saml_not_authenticated"),
            status_code=303,
        )

    # ========================================================
    # Replay protection
    # ========================================================

    response_id = auth.get_last_message_id()

    assertion_id = auth.get_last_assertion_id()

    if response_id:
        inserted = await redis.set(
            f"saml:replay:response:{response_id}",
            "1",
            ex=SAML_REPLAY_TTL,
            nx=True,
        )

        if not inserted:
            return RedirectResponse(
                (f"{FRONTEND_URL}/login?error=saml_replay_detected"),
                status_code=303,
            )

    if assertion_id:
        inserted = await redis.set(
            (f"saml:replay:assertion:{assertion_id}"),
            "1",
            ex=SAML_REPLAY_TTL,
            nx=True,
        )

        if not inserted:
            return RedirectResponse(
                (f"{FRONTEND_URL}/login?error=saml_replay_detected"),
                status_code=303,
            )

    # ========================================================
    # Get Entra claims
    # ========================================================

    attributes = auth.get_attributes()

    name_id = auth.get_nameid()

    # Entra Object ID
    object_id = first_attribute(
        attributes,
        "http://schemas.microsoft.com/identity/claims/objectidentifier",
    )

    # Entra Tenant ID
    tenant_id = first_attribute(
        attributes,
        "http://schemas.microsoft.com/identity/claims/tenantid",
        "tid",
    )

    # Usually the user's UPN
    upn = first_attribute(
        attributes,
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
    )

    email = first_attribute(
        attributes,
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    )

    given_name = first_attribute(
        attributes,
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
    )

    surname = first_attribute(
        attributes,
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
    )

    display_name = " ".join(
        part
        for part in [
            given_name,
            surname,
        ]
        if part
    )

    if not display_name:
        display_name = upn or email or name_id or "Microsoft User"

    # ========================================================
    # Extract Microsoft Entra groups & roles
    # ========================================================
    groups = []
    for claim_name in [
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups",
        "http://schemas.xmlsoap.org/claims/Group",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/group",
        "http://schemas.microsoft.com/identity/claims/groups",
        "groups",
        "group",
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
        "http://schemas.microsoft.com/identity/claims/role",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role",
        "roles",
        "role",
    ]:
        vals = attributes.get(claim_name)
        if vals:
            for v in vals:
                s = str(v).strip()
                if s and s not in groups:
                    groups.append(s)

    if not groups:
        for k, vals in attributes.items():
            k_lower = k.lower().strip()
            if (
                k_lower.endswith("/groups")
                or k_lower.endswith("/group")
                or k_lower.endswith("/roles")
                or k_lower.endswith("/role")
                or k_lower in ("groups", "group", "roles", "role")
            ):
                if isinstance(vals, list):
                    for v in vals:
                        s = str(v).strip()
                        if s and s not in groups:
                            groups.append(s)

    # Ensure ONLY Object IDs (GUID format) are kept for database storage
    object_id_groups = [str(g).strip() for g in groups if is_guid_string(str(g).strip())]

    print(f"[SAML ACS] Claims received from Microsoft: {list(attributes.keys())}")
    print(f"[SAML ACS] Extracted Microsoft raw groups: {groups}")
    print(f"[SAML ACS] Extracted Microsoft Object IDs for DB: {object_id_groups}")

    # Microsoft Object ID is required
    # for identifying the Portal database user.
    if not object_id:
        return RedirectResponse(
            (f"{FRONTEND_URL}/login?error=missing_microsoft_oid"),
            status_code=303,
        )
    # ========================================================
    # Get/Create database user
    # ========================================================

    try:
        db_user = await get_or_create_microsoft_user(
            microsoft_oid=object_id,
            microsoft_tid=tenant_id,
            email=email or upn,
            display_name=display_name,
            groups=object_id_groups if object_id_groups else None,
        )

    except IntegrityError as exc:
        print(
            "Database user conflict:",
            repr(exc),
        )

        return RedirectResponse(
            (f"{FRONTEND_URL}/login?error=user_account_conflict"),
            status_code=303,
        )

    # ========================================================
    # Create Portal session
    # ========================================================

    session_id = secrets.token_urlsafe(32)

    # ========================================================
    # Get player data (may be None if not yet bound)
    # ========================================================

    db_player = await get_player_by_user_uuid(db_user.uuid)

    # ========================================================
    # Auto-bind player on first login via email prefix
    # ========================================================
    #
    # Only attempted when the user has no player record yet.
    # The email prefix is used as the candidate Minecraft username.
    # PlayerDB is queried; if the username does not exist there,
    # we silently skip creating the player row.

    if db_player is None and db_user.email:
        email_prefix = db_user.email.split("@")[0]

        # Minecraft usernames: letters, digits, underscore, 1-16 chars.
        import re as _re
        candidate = _re.sub(r"[^a-zA-Z0-9_]", "", email_prefix)[:16]

        if candidate:
            try:
                import httpx as _httpx

                async with _httpx.AsyncClient(timeout=5.0) as _client:
                    _resp = await _client.get(
                        f"https://playerdb.co/api/player/minecraft/{candidate}",
                        headers={"User-Agent": "MinecraftPlayerPortal/1.0"},
                    )

                if _resp.status_code == 200:
                    _pdb = _resp.json()

                    if _pdb.get("success"):
                        _p = _pdb["data"]["player"]

                        db_player = await create_player(
                            user_uuid=db_user.uuid,
                            player_uuid=_p.get("id"),
                            minecraft_username=_p.get("username"),
                            skin_url=_p.get("skin_texture"),
                        )

                        print(
                            f"[auto-bind] New user {db_user.uuid}"
                            f" -> Minecraft '{_p.get('username')}'"
                        )

            except Exception as _exc:
                # Never block login due to PlayerDB failure.
                print(f"[auto-bind] PlayerDB lookup failed: {_exc!r}")

    # ========================================================
    # Build session user data
    # ========================================================

    user_data = {
        # Portal database UUID
        "id": db_user.uuid,
        "launcher_password": getattr(db_user, "launcher_password", None),
        "uuid": db_user.uuid,
        "userid": db_user.userid,
        # Microsoft
        "microsoft_oid": db_user.microsoft_oid,
        "microsoft_tid": db_user.microsoft_tid,
        # Basic profile
        "name": db_user.display_name,
        "display_name": db_user.display_name,
        "email": db_user.email,
        "groups": await get_user_groups_async(db_user),
        "group_details": await get_user_group_details_async(db_user),
        "is_admin": check_user_is_admin(db_user),
        # Time
        "created_at": (db_user.created_at.isoformat() if db_user.created_at else None),
        "updated_at": (db_user.updated_at.isoformat() if db_user.updated_at else None),
        "last_login_at": (
            db_user.last_login_at.isoformat() if db_user.last_login_at else None
        ),
        # Minecraft player (None if not yet bound)
        "player": {
            "player_uuid": db_player.player_uuid if db_player else None,
            "minecraft_username": db_player.minecraft_username if db_player else None,
            "skin_url": db_player.skin_url if db_player else None,
            "cape_url": db_player.cape_url if db_player else None,
            "skin_model": db_player.skin_model if db_player else "default",
        },
    }

    # 保存以后 SAML Logout 需要的信息
    session_data = {
        "user": user_data,
        "saml": {
            "name_id": auth.get_nameid(),
            "session_index": auth.get_session_index(),
            "name_id_format": auth.get_nameid_format(),
            "name_id_nq": auth.get_nameid_nq(),
            "name_id_spnq": auth.get_nameid_spnq(),
        },
    }

    await redis.setex(
        f"portal:session:{session_id}",
        SESSION_TTL,
        json.dumps(session_data),
    )
    # ========================================================
    # Set HttpOnly cookie and return to Next.js
    # ========================================================

    response = RedirectResponse(
        url=FRONTEND_URL,
        status_code=303,
    )

    response.set_cookie(
        key=COOKIE_NAME,
        value=session_id,
        max_age=SESSION_TTL,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
    )

    return response


# ============================================================
# Current logged in user
# ============================================================



# ============================================================
# Public Config
# ============================================================

@router.get("/api/public/config")
async def get_public_config():
    """Return public configuration such as application name."""
    app_name = await get_app_name()
    return {
        "app_name": app_name,
    }


@router.get("/me")
async def get_current_user(
    request: Request,
):

    session_id = request.cookies.get(COOKIE_NAME)

    if not session_id:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
        )

    session_json = await redis.get(f"portal:session:{session_id}")

    if not session_json:
        raise HTTPException(
            status_code=401,
            detail="Session expired",
        )

    session_data = json.loads(session_json)

    user_data = session_data.get("user")

    if not user_data:
        raise HTTPException(
            status_code=401,
            detail="Invalid session",
        )

    user_uuid = user_data.get("uuid")
    if user_uuid:
        async with SessionLocal() as db_session:
            res = await db_session.execute(select(User).where(User.uuid == user_uuid))
            db_user = res.scalar_one_or_none()
            if db_user:
                user_data["groups"] = await get_user_groups_async(db_user, db_session)
                user_data["group_details"] = await get_user_group_details_async(db_user, db_session)
                user_data["is_admin"] = check_user_is_admin(db_user)
    if "groups" not in user_data or user_data["groups"] is None:
        user_data["groups"] = []
    if "group_details" not in user_data or user_data["group_details"] is None:
        user_data["group_details"] = []
    if "is_admin" not in user_data:
        user_data["is_admin"] = False

    app_name = await get_app_name()
    return {
        "authenticated": True,
        "user": user_data,
        "app_name": app_name,
    }


# ============================================================
# Reset Launcher Password
# ============================================================


@router.post("/me/reset-launcher-password")
async def reset_launcher_password(request: Request):
    import random, string as strmod

    session_id = request.cookies.get(COOKIE_NAME)
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    raw = await redis.get(f"portal:session:{session_id}")
    if not raw:
        raise HTTPException(status_code=401, detail="Invalid session")

    session_data = json.loads(raw)
    user_data = session_data.get("user")
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid session")

    user_uuid = user_data.get("uuid")
    if not user_uuid:
        raise HTTPException(status_code=400, detail="Missing user UUID")

    new_password = "".join(
        random.choices(strmod.ascii_letters + strmod.digits, k=10)
    )

    # Write to database
    async with SessionLocal() as db_session:
        result = await db_session.execute(select(User).where(User.uuid == user_uuid))
        db_user = result.scalar_one_or_none()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        db_user.launcher_password = new_password
        await db_session.commit()

    # Update Redis session
    user_data["launcher_password"] = new_password
    session_data["user"] = user_data
    ttl = await redis.ttl(f"portal:session:{session_id}")
    await redis.setex(
        f"portal:session:{session_id}",
        ttl if ttl > 0 else 86400 * 7,
        json.dumps(session_data),
    )

    return {"launcher_password": new_password}


# ============================================================
# Logout
# ============================================================


@router.post("/logout")
async def logout(
    request: Request,
):

    session_id = request.cookies.get(COOKIE_NAME)

    if session_id:
        await redis.delete(f"portal:session:{session_id}")

    response = JSONResponse(
        {
            "success": True,
        }
    )

    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )

    return response


# ============================================================
# SP Metadata
# ============================================================


@router.get("/saml/metadata")
async def saml_metadata():

    settings = OneLogin_Saml2_Settings(get_saml_settings())

    metadata = settings.get_sp_metadata()

    errors = settings.validate_metadata(metadata)

    if errors:
        raise HTTPException(
            status_code=500,
            detail={
                "message": ("Invalid SP metadata"),
                "errors": errors,
            },
        )

    return Response(
        content=metadata,
        media_type="application/xml",
    )


# ============================================================
# saml logout
# ============================================================
@router.get("/saml/logout")
async def saml_logout(
    request: Request,
):
    session_id = request.cookies.get(COOKIE_NAME)

    if not session_id:
        return RedirectResponse(
            f"{FRONTEND_URL}/login",
            status_code=303,
        )

    session_json = await redis.get(f"portal:session:{session_id}")

    if not session_json:
        response = RedirectResponse(
            f"{FRONTEND_URL}/login",
            status_code=303,
        )

        response.delete_cookie(
            key=COOKIE_NAME,
            path="/",
            secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE,
        )

        return response

    session_data = json.loads(session_json)

    saml_data = session_data.get(
        "saml",
        {},
    )

    request_data = await prepare_saml_request(request)

    auth = create_saml_auth(request_data)

    relay_state = secrets.token_urlsafe(32)

    microsoft_logout_url = auth.logout(
        return_to=relay_state,
        name_id=saml_data.get("name_id"),
        session_index=saml_data.get("session_index"),
        nq=saml_data.get("name_id_nq"),
        name_id_format=saml_data.get("name_id_format"),
        spnq=saml_data.get("name_id_spnq"),
    )

    logout_request_id = auth.get_last_request_id()

    if not logout_request_id:
        raise HTTPException(
            status_code=500,
            detail="Unable to create SAML LogoutRequest",
        )

    await redis.setex(
        f"saml:logout:{relay_state}",
        SAML_FLOW_TTL,
        json.dumps(
            {
                "request_id": logout_request_id,
                "session_id": session_id,
            }
        ),
    )

    await redis.delete(f"portal:session:{session_id}")

    response = RedirectResponse(
        url=microsoft_logout_url,
        status_code=302,
    )

    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )

    return response


# ============================================================
# sls
# ============================================================


@router.get("/saml/sls")
async def saml_sls(
    request: Request,
):
    request_data = await prepare_saml_request(request)

    auth = create_saml_auth(request_data)

    relay_state = request.query_params.get("RelayState")

    request_id = None
    session_id = None

    if relay_state:
        flow_json = await redis.get(f"saml:logout:{relay_state}")

        if flow_json:
            flow = json.loads(flow_json)

            request_id = flow.get("request_id")

            session_id = flow.get("session_id")

            await redis.delete(f"saml:logout:{relay_state}")

    if not session_id:
        session_id = request.cookies.get(COOKIE_NAME)

    redirect_url = auth.process_slo(
        request_id=request_id,
        keep_local_session=True,
    )

    errors = auth.get_errors()

    if errors:
        print(
            "SAML logout errors:",
            errors,
        )

        print(
            "SAML logout reason:",
            auth.get_last_error_reason(),
        )

        return RedirectResponse(
            (f"{FRONTEND_URL}/login?error=saml_logout_failed"),
            status_code=303,
        )

    if session_id:
        await redis.delete(f"portal:session:{session_id}")

    if redirect_url:
        # For IdP-initiated SLO, toolkit may return
        # the URL used to send LogoutResponse to Entra.
        response = RedirectResponse(
            url=redirect_url,
            status_code=302,
        )

    else:
        response = RedirectResponse(
            (f"{FRONTEND_URL}/login?logout=success"),
            status_code=303,
        )

    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )

    return response


