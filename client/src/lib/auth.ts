export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');

export const DEFAULT_APP_NAME = 'Minecraft Player Portal';
export const APP_NAME = DEFAULT_APP_NAME;


// ============================================================
// Types
// ============================================================

export interface PlayerProfile {
  player_uuid: string | null;
  minecraft_username: string | null;
  skin_url: string | null;
  cape_url: string | null;
  skin_model: 'default' | 'slim';
  updated_at: string | null;
  created_at: string | null;
}

export interface GroupDetail {
  id: string;
  name: string;
  color: string;
}

export interface PortalUser {
  id: string;
  uuid: string;
  userid: string | null;
  name: string | null;
  display_name: string | null;
  email: string | null;
  groups?: string[];
  group_details?: GroupDetail[];
  is_admin?: boolean;
  microsoft_oid: string | null;
  microsoft_tid: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_login_at: string | null;
  launcher_password?: string | null;
  /** Minecraft player profile; null if not yet bound */
  player: PlayerProfile | null;
}

interface MeResponse {
  authenticated: boolean;
  user: PortalUser;
  app_name?: string;
}


// ============================================================
// Auth API
// ============================================================

/**
 * Start Microsoft Entra SAML login.
 */
export function loginWithMicrosoft(): void {
  window.location.href = `${API_BASE_URL}/auth/saml/login`;
}

/**
 * Get currently authenticated Portal user.
 */
export async function getCurrentUser(): Promise<PortalUser | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (res.status === 401) return null;

    if (!res.ok) {
      console.warn(`[auth] /auth/me returned status ${res.status}`);
      return null;
    }

    const data: MeResponse = await res.json();
    return data.user;
  } catch (err: unknown) {
    // When unauthenticated, or when the self-signed HTTPS certificate on port 8000
    // is not yet accepted by the browser, fetch throws TypeError: NetworkError.
    // In these cases, gracefully treat the session as unauthenticated (null).
    console.warn(
      '[auth] Unable to reach /auth/me (user unauthenticated or requires cert trust):',
      (err as Error)?.message || err,
    );
    return null;
  }
}

/**
 * Logout from Minecraft Player Portal.
 */
export function logout(): void {
  window.location.assign(`${API_BASE_URL}/auth/saml/logout`);
}


// ============================================================
// Player API
// ============================================================

interface PlayerResponse {
  player: PlayerProfile | null;
}

/**
 * Fetch the current user's linked Minecraft player profile.
 * Returns null if the user has not yet bound a Minecraft account.
 */
export async function getMyPlayer(): Promise<PlayerProfile | null> {
  const res = await fetch(`${API_BASE_URL}/auth/api/players/me`, {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const data: PlayerResponse = await res.json();
  return data.player;
}


export interface PlayerBindPayload {
  auth_token: string;
  skin_model?: 'default' | 'slim' | null;
}

/**
 * Bind a Minecraft account to the current user (creates players row).
 * Throws if the user already has a profile or UUID/username is taken.
 */
export async function bindMyPlayer(
  payload: PlayerBindPayload,
): Promise<PlayerProfile> {
  const res = await fetch(`${API_BASE_URL}/auth/api/players/me`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    let msg = `HTTP ${res.status}`;
    if (err.detail) {
      msg = Array.isArray(err.detail) ? err.detail[0].msg : err.detail;
    }
    throw new Error(msg);
  }

  const data: PlayerResponse = await res.json();
  return data.player!;
}


export interface SkinUpdatePayload {
  skin_url?: string | null;
  cape_url?: string | null;
  skin_model?: 'default' | 'slim' | null;
}

/**
 * Update skin / cape / model for the current user's player profile.
 */
export async function updateMySkin(
  payload: SkinUpdatePayload,
): Promise<PlayerProfile> {
  const res = await fetch(`${API_BASE_URL}/auth/api/players/me/skin`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    let msg = `HTTP ${res.status}`;
    if (err.detail) {
      msg = Array.isArray(err.detail) ? err.detail[0].msg : err.detail;
    }
    throw new Error(msg);
  }

  const data: PlayerResponse = await res.json();
  return data.player!;
}

// ============================================================
// Upload Custom Skin
// ============================================================

export async function uploadMySkin(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/auth/api/players/me/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    let msg = `HTTP ${res.status}`;
    if (err.detail) {
      msg = Array.isArray(err.detail) ? err.detail[0].msg : err.detail;
    }
    throw new Error(msg);
  }

  const data = await res.json() as { url: string };
  return data.url;
}

// ============================================================
// Re-bind / Update Player Account Info
// ============================================================

export interface PlayerUpdatePayload {
  auth_token: string;
}

export async function updateMyPlayerAccount(
  payload: PlayerUpdatePayload,
): Promise<PlayerProfile> {
  const res = await fetch(`${API_BASE_URL}/auth/api/players/me`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    let msg = `HTTP ${res.status}`;
    if (err.detail) {
      msg = Array.isArray(err.detail) ? err.detail[0].msg : err.detail;
    }
    throw new Error(msg);
  }

  const data: PlayerResponse = await res.json();
  return data.player!;
}

/**
 * Reset the current user's launcher password and return the new one.
 */
export async function resetLauncherPassword(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/me/reset-launcher-password`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.detail ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  return data.launcher_password as string;
}

// ============================================================
// Admin API
// ============================================================

export interface AdminStats {
  total_users: number;
  total_players: number;
  active_sessions: number;
  admin_groups: string[];
}

export interface AdminUserData {
  uuid: string;
  email: string | null;
  display_name: string | null;
  microsoft_oid: string | null;
  microsoft_tid: string | null;
  groups: string[];
  group_details?: GroupDetail[];
  is_admin: boolean;
  created_at: string | null;
  last_login_at: string | null;
  player: PlayerProfile | null;
}

export async function getAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${API_BASE_URL}/auth/api/admin/stats`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getAdminUsers(): Promise<AdminUserData[]> {
  const res = await fetch(`${API_BASE_URL}/auth/api/admin/users`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.users;
}

export async function adminUnbindPlayer(userUuid: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/api/admin/users/${userUuid}/unbind-player`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
}

export interface AdminUpdatePlayerPayload {
  display_name?: string | null;
  minecraft_username: string;
  player_uuid?: string | null;
  skin_model?: 'default' | 'slim';
  skin_url?: string | null;
  cape_url?: string | null;
}

export async function adminUpdateUserPlayer(
  userUuid: string,
  payload: AdminUpdatePlayerPayload
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/api/admin/users/${userUuid}/player`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
}

export async function adminResetUserPassword(userUuid: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/api/admin/users/${userUuid}/reset-password`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.launcher_password;
}

export interface GroupMappingItem {
  id: number;
  group_id: string;
  group_name: string;
  group_color?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export async function getAdminGroupMappings(): Promise<GroupMappingItem[]> {
  const res = await fetch(`${API_BASE_URL}/auth/api/admin/group-mappings`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.mappings;
}

export async function saveAdminGroupMapping(
  groupId: string,
  groupName: string,
  groupColor?: string
): Promise<GroupMappingItem> {
  const res = await fetch(`${API_BASE_URL}/auth/api/admin/group-mappings`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      group_id: groupId,
      group_name: groupName,
      group_color: groupColor || 'blue',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.mapping;
}

export async function deleteAdminGroupMapping(groupId: string): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/auth/api/admin/group-mappings/${encodeURIComponent(groupId)}`,
    {
      method: 'DELETE',
      credentials: 'include',
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
}


// ============================================================
// System Settings API
// ============================================================

export interface PublicConfig {
  app_name: string;
}

export async function getPublicConfig(): Promise<PublicConfig> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/api/public/config`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) return { app_name: DEFAULT_APP_NAME };
    const data = await res.json();
    return { app_name: data.app_name || DEFAULT_APP_NAME };
  } catch {
    return { app_name: DEFAULT_APP_NAME };
  }
}

export interface AdminSettings {
  app_name: string;
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const res = await fetch(`${API_BASE_URL}/auth/api/admin/settings`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function saveAdminSettings(settings: {
  app_name: string;
}): Promise<AdminSettings> {
  const res = await fetch(`${API_BASE_URL}/auth/api/admin/settings`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}


// ============================================================
// Server Management API
// ============================================================

export interface MinecraftServer {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  icon_url: string | null;
  access_mode: 'all' | 'whitelist' | 'blacklist';
  is_public: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  has_access?: boolean;
  access_status?: 'allowed' | 'not_whitelisted' | 'blacklisted' | 'no_player';
  access_message?: string;
  whitelist_count?: number;
  blacklist_count?: number;
}

export interface ServerPlayerRule {
  id: number;
  server_id: string;
  player_uuid: string;
  player_name: string | null;
  rule_type: 'whitelist' | 'blacklist';
  created_at?: string | null;
}

export async function getPublicServers(): Promise<MinecraftServer[]> {
  const res = await fetch(`${API_BASE_URL}/auth/api/servers`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.servers;
}

export async function getAdminServers(): Promise<MinecraftServer[]> {
  const res = await fetch(`${API_BASE_URL}/auth/api/admin/servers`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.servers;
}

export async function createAdminServer(data: {
  name: string;
  description?: string;
  address?: string;
  icon_url?: string;
  access_mode: 'all' | 'whitelist' | 'blacklist';
  is_public: boolean;
}): Promise<MinecraftServer> {
  const res = await fetch(`${API_BASE_URL}/auth/api/admin/servers`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const resp = await res.json();
  return resp.server;
}

export async function updateAdminServer(
  serverId: string,
  data: Partial<MinecraftServer>
): Promise<MinecraftServer> {
  const res = await fetch(`${API_BASE_URL}/auth/api/admin/servers/${serverId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const resp = await res.json();
  return resp.server;
}

export async function uploadServerIcon(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/auth/api/admin/servers/upload-icon`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `上传服务器头像失败 (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.url;
}

export async function deleteAdminServer(serverId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/api/admin/servers/${serverId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
}

export async function getAdminServerPlayers(
  serverId: string
): Promise<ServerPlayerRule[]> {
  const res = await fetch(
    `${API_BASE_URL}/auth/api/admin/servers/${serverId}/players`,
    {
      method: 'GET',
      credentials: 'include',
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.rules;
}

export async function addAdminServerPlayer(
  serverId: string,
  playerUuid: string,
  playerName?: string,
  ruleType: 'whitelist' | 'blacklist' = 'whitelist'
): Promise<ServerPlayerRule> {
  const res = await fetch(
    `${API_BASE_URL}/auth/api/admin/servers/${serverId}/players`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_uuid: playerUuid,
        player_name: playerName,
        rule_type: ruleType,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.rule;
}

export async function removeAdminServerPlayer(
  serverId: string,
  ruleId: number
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/auth/api/admin/servers/${serverId}/players/${ruleId}`,
    {
      method: 'DELETE',
      credentials: 'include',
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
}

export async function quickAddUserToWhitelist(
  userUuid: string,
  serverIds: string[]
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/auth/api/admin/users/${userUuid}/whitelist`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server_ids: serverIds }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
}

export async function batchAddAdminServerPlayers(
  serverId: string,
  players: Array<{
    player_uuid: string;
    player_name?: string | null;
    rule_type?: 'whitelist' | 'blacklist';
  }>
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/auth/api/admin/servers/${serverId}/players/batch`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
}

export async function removeAdminServerPlayerByUuid(
  serverId: string,
  playerUuid: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/auth/api/admin/servers/${serverId}/players/by-uuid/${encodeURIComponent(playerUuid)}`,
    {
      method: 'DELETE',
      credentials: 'include',
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
}
