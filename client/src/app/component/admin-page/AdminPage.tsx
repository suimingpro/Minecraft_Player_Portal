'use client';

import React, { useEffect, useState } from 'react';
import { Breadcrumb, Button, Card, message, Result, Tabs, Typography } from 'antd';
import {
  CloudServerOutlined,
  SettingOutlined,
  TagsOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  AdminStats,
  AdminUserData,
  DEFAULT_APP_NAME,
  deleteAdminGroupMapping,
  deleteAdminServer,
  getAdminGroupMappings,
  getAdminServerPlayers,
  getAdminServers,
  getAdminSettings,
  getAdminStats,
  getAdminUsers,
  GroupMappingItem,
  MinecraftServer,
  PortalUser,
  removeAdminServerPlayer,
  saveAdminSettings,
  ServerPlayerRule,
} from '@/lib/auth';
import { useAppConfig } from '@/lib/config';

// Sub-components
import AdminStatsCards from './components/AdminStatsCards';
import UsersTab from './tabs/UsersTab';
import ServersTab from './tabs/ServersTab';
import GroupMappingsTab from './tabs/GroupMappingsTab';
import SettingsTab from './tabs/SettingsTab';

// Modals & Drawers
import UserInfoModal from './modals/UserInfoModal';
import EditUserPlayerModal from './modals/EditUserPlayerModal';
import QuickWhitelistModal from './modals/QuickWhitelistModal';
import ServerFormModal from './modals/ServerFormModal';
import GroupMappingModal from './modals/GroupMappingModal';
import ServerRulesDrawer from './modals/ServerRulesDrawer';
import AddServerPlayerModal from './modals/AddServerPlayerModal';

const { Text, Title } = Typography;

interface AdminPageProps {
  user?: PortalUser | null;
  onNavigateTab?: (tab: string) => void;
}

export default function AdminPage({ user, onNavigateTab }: AdminPageProps) {
  // Global Admin Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [mappings, setMappings] = useState<GroupMappingItem[]>([]);
  const [servers, setServers] = useState<MinecraftServer[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [serversLoading, setServersLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // System Settings State
  const { setAppName: setGlobalAppName } = useAppConfig();
  const [appNameInput, setAppNameInput] = useState('');

  // Modals & Drawers States
  const [userInfoModalOpen, setUserInfoModalOpen] = useState(false);
  const [selectedUserForInfo, setSelectedUserForInfo] = useState<AdminUserData | null>(null);

  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AdminUserData | null>(null);

  const [whitelistModalOpen, setWhitelistModalOpen] = useState(false);
  const [selectedUserForWhitelist, setSelectedUserForWhitelist] = useState<AdminUserData | null>(null);

  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<MinecraftServer | null>(null);

  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<GroupMappingItem | null>(null);

  const [playerDrawerOpen, setPlayerDrawerOpen] = useState(false);
  const [selectedServerForRules, setSelectedServerForRules] = useState<MinecraftServer | null>(null);
  const [serverRules, setServerRules] = useState<ServerPlayerRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  const [addPlayerModalOpen, setAddPlayerModalOpen] = useState(false);

  // Data Fetching Functions
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, mappingsData, serversData, settingsData] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
        getAdminGroupMappings(),
        getAdminServers().catch(() => []),
        getAdminSettings().catch(() => ({ app_name: DEFAULT_APP_NAME })),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setMappings(mappingsData);
      setServers(serversData);
      setAppNameInput(settingsData.app_name || DEFAULT_APP_NAME);
      setGlobalAppName(settingsData.app_name || DEFAULT_APP_NAME);
    } catch (err: unknown) {
      message.error((err as Error).message || '加载管理员数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchMappingsOnly = async () => {
    setMappingsLoading(true);
    try {
      const data = await getAdminGroupMappings();
      setMappings(data);
    } catch (err: unknown) {
      message.error((err as Error).message || '刷新组映射失败');
    } finally {
      setMappingsLoading(false);
    }
  };

  const fetchServersOnly = async () => {
    setServersLoading(true);
    try {
      const data = await getAdminServers();
      setServers(data);
    } catch (err: unknown) {
      message.error((err as Error).message || '刷新服务器列表失败');
    } finally {
      setServersLoading(false);
    }
  };

  const fetchSettingsOnly = async () => {
    setSettingsLoading(true);
    try {
      const data = await getAdminSettings();
      setAppNameInput(data.app_name || DEFAULT_APP_NAME);
      setGlobalAppName(data.app_name || DEFAULT_APP_NAME);
      message.success('已刷新系统设置');
    } catch (err: unknown) {
      message.error((err as Error).message || '刷新系统设置失败');
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchRulesForServer = async (serverId: string) => {
    setRulesLoading(true);
    try {
      const rules = await getAdminServerPlayers(serverId);
      setServerRules(rules);
    } catch (err: unknown) {
      message.error((err as Error).message || '加载服务器规则失败');
    } finally {
      setRulesLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_admin) {
      fetchAdminData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Server Management Handlers
  const handleDeleteServer = async (serverId: string) => {
    try {
      await deleteAdminServer(serverId);
      message.success('已删除该服务器');
      await fetchServersOnly();
    } catch (err: unknown) {
      message.error((err as Error).message || '删除服务器失败');
    }
  };

  // Group Mapping Handlers
  const handleDeleteMapping = async (groupId: string) => {
    try {
      await deleteAdminGroupMapping(groupId);
      message.success('已删除组映射规则');
      await fetchMappingsOnly();
      const usersData = await getAdminUsers();
      setUsers(usersData);
    } catch (err: unknown) {
      message.error((err as Error).message || '删除组映射失败');
    }
  };

  // Settings Handlers
  const handleSaveSettings = async () => {
    const trimmed = appNameInput.trim() || DEFAULT_APP_NAME;
    setSavingSettings(true);
    try {
      const saved = await saveAdminSettings({ app_name: trimmed });
      setAppNameInput(saved.app_name || DEFAULT_APP_NAME);
      setGlobalAppName(saved.app_name || DEFAULT_APP_NAME);
      message.success('系统设置已保存并立即生效');
    } catch (err: unknown) {
      message.error((err as Error).message || '保存系统设置失败');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetDefaultAppName = async () => {
    setSavingSettings(true);
    try {
      const saved = await saveAdminSettings({ app_name: DEFAULT_APP_NAME });
      setAppNameInput(saved.app_name || DEFAULT_APP_NAME);
      setGlobalAppName(saved.app_name || DEFAULT_APP_NAME);
      message.success('已恢复为默认应用名称');
    } catch (err: unknown) {
      message.error((err as Error).message || '恢复默认设置失败');
    } finally {
      setSavingSettings(false);
    }
  };

  // Player Rule Handlers
  const handleRemoveRule = async (ruleId: number) => {
    if (!selectedServerForRules) return;
    try {
      await removeAdminServerPlayer(selectedServerForRules.id, ruleId);
      message.success('已移除该玩家规则');
      await fetchRulesForServer(selectedServerForRules.id);
      await fetchServersOnly();
    } catch (err: unknown) {
      message.error((err as Error).message || '移除失败');
    }
  };

  if (!user?.is_admin) {
    return (
      <div style={{ maxWidth: 800, margin: '60px auto', padding: '0 20px' }}>
        <Result
          status="403"
          title="403 - 访问受限"
          subTitle="抱歉，你的微软账户不属于管理员组，无权访问管理面板。"
          extra={
            <Button
              type="primary"
              onClick={() => (onNavigateTab ? onNavigateTab('home') : null)}
            >
              返回首页
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 60px' }}>
      {/* Breadcrumb */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => onNavigateTab?.('home')}>首页</a> },
          { title: '管理后台' },
        ]}
      />

      {/* Top Banner */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1f1f1f' }}>
          <SettingOutlined style={{ marginRight: 10, color: '#1677ff' }} />
          管理后台
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          管理已注册用户、微软 Entra 组映射、游戏服务器与白名单策略、系统设置
        </Text>
      </div>

      {/* Overview Statistics Cards */}
      <AdminStatsCards
        stats={stats}
        serversCount={servers.length}
        mappingsCount={mappings.length}
      />

      {/* Main Tabs Container */}
      <Card
        variant="borderless"
        style={{
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          borderRadius: 8,
        }}
      >
        <Tabs
          defaultActiveKey="users"
          items={[
            {
              key: 'users',
              label: (
                <span>
                  <TeamOutlined style={{ marginRight: 6 }} />
                  用户与角色管理 ({users.length})
                </span>
              ),
              children: (
                <UsersTab
                  users={users}
                  mappings={mappings}
                  loading={loading}
                  onRefresh={fetchAdminData}
                  onViewUser={(u) => {
                    setSelectedUserForInfo(u);
                    setUserInfoModalOpen(true);
                  }}
                  onEditUserPlayer={(u) => {
                    setSelectedUserForEdit(u);
                    setEditUserModalOpen(true);
                  }}
                  onQuickWhitelist={(u) => {
                    setSelectedUserForWhitelist(u);
                    setWhitelistModalOpen(true);
                  }}
                />
              ),
            },
            {
              key: 'servers',
              label: (
                <span>
                  <CloudServerOutlined style={{ marginRight: 6 }} />
                  服务器管理 ({servers.length})
                </span>
              ),
              children: (
                <ServersTab
                  servers={servers}
                  loading={serversLoading || loading}
                  onRefresh={fetchServersOnly}
                  onAddServer={() => {
                    setEditingServer(null);
                    setServerModalOpen(true);
                  }}
                  onEditServer={(srv) => {
                    setEditingServer(srv);
                    setServerModalOpen(true);
                  }}
                  onDeleteServer={handleDeleteServer}
                  onOpenPlayerDrawer={(srv) => {
                    setSelectedServerForRules(srv);
                    setPlayerDrawerOpen(true);
                    fetchRulesForServer(srv.id);
                  }}
                />
              ),
            },
            {
              key: 'group-mappings',
              label: (
                <span>
                  <TagsOutlined style={{ marginRight: 6 }} />
                  用户组映射管理 ({mappings.length})
                </span>
              ),
              children: (
                <GroupMappingsTab
                  mappings={mappings}
                  loading={mappingsLoading}
                  onRefresh={fetchMappingsOnly}
                  onAddMapping={() => {
                    setEditingMapping(null);
                    setMappingModalOpen(true);
                  }}
                  onEditMapping={(item) => {
                    setEditingMapping(item);
                    setMappingModalOpen(true);
                  }}
                  onDeleteMapping={handleDeleteMapping}
                />
              ),
            },
            {
              key: 'settings',
              label: (
                <span>
                  <SettingOutlined style={{ marginRight: 6 }} />
                  系统设置
                </span>
              ),
              children: (
                <SettingsTab
                  appNameInput={appNameInput}
                  setAppNameInput={setAppNameInput}
                  loading={settingsLoading}
                  saving={savingSettings}
                  onSave={handleSaveSettings}
                  onResetDefault={handleResetDefaultAppName}
                  onRefresh={fetchSettingsOnly}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Modals & Drawers */}
      <UserInfoModal
        open={userInfoModalOpen}
        user={selectedUserForInfo}
        onClose={() => setUserInfoModalOpen(false)}
        onOpenEditPlayer={(u) => {
          setSelectedUserForEdit(u);
          setEditUserModalOpen(true);
        }}
      />

      <EditUserPlayerModal
        open={editUserModalOpen}
        user={selectedUserForEdit}
        onClose={() => setEditUserModalOpen(false)}
        onSuccess={async () => {
          const usersData = await getAdminUsers();
          setUsers(usersData);
        }}
      />

      <QuickWhitelistModal
        open={whitelistModalOpen}
        user={selectedUserForWhitelist}
        servers={servers}
        onClose={() => setWhitelistModalOpen(false)}
        onSuccess={async () => {
          await fetchServersOnly();
        }}
      />

      <ServerFormModal
        open={serverModalOpen}
        editingServer={editingServer}
        onClose={() => setServerModalOpen(false)}
        onSuccess={fetchServersOnly}
      />

      <GroupMappingModal
        open={mappingModalOpen}
        editingMapping={editingMapping}
        onClose={() => setMappingModalOpen(false)}
        onSuccess={async () => {
          await fetchMappingsOnly();
          const usersData = await getAdminUsers();
          setUsers(usersData);
        }}
      />

      <ServerRulesDrawer
        open={playerDrawerOpen}
        server={selectedServerForRules}
        rules={serverRules}
        loading={rulesLoading}
        onClose={() => setPlayerDrawerOpen(false)}
        onOpenAddPlayer={() => setAddPlayerModalOpen(true)}
        onRemoveRule={handleRemoveRule}
      />

      <AddServerPlayerModal
        open={addPlayerModalOpen}
        server={selectedServerForRules}
        users={users}
        mappings={mappings}
        serverRules={serverRules}
        onClose={() => setAddPlayerModalOpen(false)}
        onRulesChanged={async () => {
          if (selectedServerForRules) {
            await fetchRulesForServer(selectedServerForRules.id);
            await fetchServersOnly();
          }
        }}
      />
    </div>
  );
}

