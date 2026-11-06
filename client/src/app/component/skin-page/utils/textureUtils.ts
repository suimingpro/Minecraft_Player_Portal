export const FALLBACK_SKIN =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export interface PlayerDBResult {
  username: string;
  id: string;
  avatar: string;
  skin_texture: string;
}

export async function lookupPlayer(username: string): Promise<PlayerDBResult> {
  const res = await fetch(
    `https://playerdb.co/api/player/minecraft/${encodeURIComponent(username)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) throw new Error('玩家不存在或查询失败');
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? '玩家不存在');
  const p = json.data?.player;
  if (!p) throw new Error('响应数据异常');
  return { username: p.username, id: p.id, avatar: p.avatar, skin_texture: p.skin_texture };
}

export function validateTextureDimensions(
  w: number,
  h: number,
  type: 'skin' | 'cape',
): { valid: boolean; message?: string } {
  if (type === 'skin') {
    const isValid = w >= 64 && (w % 64 === 0) && (w === h || w === h * 2);
    if (!isValid) {
      return {
        valid: false,
        message: `图片尺寸 (${w}x${h}) 不是有效的 Minecraft 皮肤尺寸（标准尺寸为 64x64 或 64x32，且宽高需为 64 的整数倍）`,
      };
    }
  } else if (type === 'cape') {
    const isRatio2to1 = w === h * 2;
    const isOptiFine = (w === 46 && h === 22) || (w === 22 && h === 17);
    if (!isRatio2to1 && !isOptiFine) {
      return {
        valid: false,
        message: `图片尺寸 (${w}x${h}) 不是有效的 Minecraft 披风尺寸（标准披风尺寸为 64x32，宽高比为 2:1）`,
      };
    }
  }
  return { valid: true };
}

export function validateTextureInBrowser(
  url: string,
  type: 'skin' | 'cape',
): Promise<{ valid: boolean; message?: string }> {
  return new Promise((resolve) => {
    if (
      !url.startsWith('data:image/png;base64,') &&
      !['http:', 'https:'].includes((() => {
        try {
          return new URL(url).protocol;
        } catch {
          return '';
        }
      })())
    ) {
      return resolve({ valid: false, message: '链接必须以 http:// 或 https:// 开头' });
    }

    const img = new window.Image();
    let isSettled = false;

    const timer = setTimeout(() => {
      if (isSettled) return;
      isSettled = true;
      img.src = '';
      resolve({ valid: false, message: '链接访问超时，请检查图片链接是否能正常访问' });
    }, 7000);

    img.onload = () => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);

      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) {
        return resolve({ valid: false, message: '无法读取图片尺寸，可能不是有效的图片文件' });
      }

      resolve(validateTextureDimensions(w, h, type));
    };

    img.onerror = () => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);
      resolve({ valid: false, message: '无法访问该链接，或者该链接不是有效的图片文件' });
    };

    img.src = url;
  });
}

export function validateImageFile(
  file: File,
  type: 'skin' | 'cape',
): Promise<{ valid: boolean; message?: string }> {
  return new Promise((resolve) => {
    if (!file.name.toLowerCase().endsWith('.png') && file.type !== 'image/png') {
      return resolve({ valid: false, message: '仅支持 PNG 格式图片' });
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      resolve(validateTextureDimensions(w, h, type));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ valid: false, message: '无法读取图片内容，文件可能已损坏' });
    };

    img.src = objectUrl;
  });
}
