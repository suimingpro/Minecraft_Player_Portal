import struct
import httpx


def validate_png_bytes(data: bytes, texture_type: str = "skin") -> tuple[bool, str]:
    """
    Validate that the given bytes represent a valid PNG image
    and match Minecraft skin or cape dimension specifications.
    """
    if len(data) < 24:
        return False, "文件数据过短，不是有效的图片"
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        return False, "该文件不是有效的 PNG 图片格式"
    if data[12:16] != b"IHDR":
        return False, "PNG 文件头损坏"

    width, height = struct.unpack(">II", data[16:24])

    if texture_type == "skin":
        is_valid = width >= 64 and (width % 64 == 0) and (width == height or width == height * 2)
        if not is_valid:
            return False, f"图片尺寸 ({width}x{height}) 不符合 Minecraft 皮肤规格（标准尺寸为 64x64 或 64x32，且必须为 64 的整数倍）"
    elif texture_type == "cape":
        is_ratio_2_1 = width == height * 2
        is_optifine = (width == 46 and height == 22) or (width == 22 and height == 17)
        if not (is_ratio_2_1 or is_optifine):
            return False, f"图片尺寸 ({width}x{height}) 不符合 Minecraft 披风规格（标准尺寸为 64x32，宽高比 2:1）"

    return True, ""


async def validate_texture_url(url: str, texture_type: str = "skin") -> tuple[bool, str]:
    """
    Validate that the given URL is accessible, responds with HTTP 200,
    and is a valid Minecraft skin or cape PNG image.
    """
    if not url:
        return False, "URL 不能为空"

    if url.startswith("data:image/png;base64,"):
        import base64
        try:
            b64_str = url.split("base64,")[1]
            data = base64.b64decode(b64_str)
            return validate_png_bytes(data, texture_type)
        except Exception:
            return False, "Base64 数据解码失败"

    if not (url.startswith("http://") or url.startswith("https://")):
        return False, "链接必须以 http:// 或 https:// 开头"

    try:
        async with httpx.AsyncClient(verify=False, timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Minecraft-Player-Portal/1.0"})
            if resp.status_code != 200:
                return False, f"链接访问失败 (HTTP {resp.status_code})"
            data = resp.content
    except Exception as e:
        return False, f"无法连接到该链接: {str(e)}"

    return validate_png_bytes(data, texture_type)
