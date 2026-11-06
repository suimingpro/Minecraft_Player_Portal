'use client';

import React, { useState } from 'react';
import {
  Alert,
  Breadcrumb,
  Col,
  Row,
  message,
} from 'antd';
import {
  PortalUser,
  resetLauncherPassword,
} from '@/lib/auth';
import { isGuid } from './utils/profileUtils';
import ProfileHeaderCard from './components/ProfileHeaderCard';
import BasicInfoCard from './components/BasicInfoCard';
import EntraAuthCard from './components/EntraAuthCard';
import MinecraftProfileCard from './components/MinecraftProfileCard';
import LauncherCredentialCard from './components/LauncherCredentialCard';

interface ProfilePageProps {
  user: PortalUser | null;
  onNavigateTab?: (tab: string) => void;
  onUserUpdate?: (updatedUser: PortalUser) => void;
}

export default function ProfilePage({
  user,
  onNavigateTab,
  onUserUpdate,
}: ProfilePageProps) {
  const [launcherPwd, setLauncherPwd] = useState<string | null>(
    user?.launcher_password ?? null,
  );
  const [resetting, setResetting] = useState(false);

  const handleResetPassword = async () => {
    setResetting(true);
    try {
      const newPwd = await resetLauncherPassword();
      setLauncherPwd(newPwd);
      if (user && onUserUpdate) {
        onUserUpdate({
          ...user,
          launcher_password: newPwd,
        });
      }
      message.success('启动器独立密码已刷新！请重新在启动器中登录。');
    } catch (e: unknown) {
      message.error((e as Error).message ?? '刷新失败，请稍后重试');
    } finally {
      setResetting(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="未获取到用户信息"
          description="请确认您已通过微软单点登录成功认证。"
          type="warning"
          showIcon
        />
      </div>
    );
  }

  // Display attributes
  const displayName = user.name || user.display_name || user.email || '用户';
  const email = user.email || '未绑定邮箱';

  // Only display groups that have a configured mapping or a friendly name (filter out unmapped GUIDs)
  const groups = (user.groups || []).filter((g) => g && !isGuid(g));
  const player = user.player;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Breadcrumb
        style={{ marginBottom: 20 }}
        items={[
          { title: <a onClick={() => onNavigateTab?.('home')}>Home</a> },
          { title: 'Profile' },
        ]}
      />

      {/* Top Profile Header Card */}
      <ProfileHeaderCard
        user={user}
        displayName={displayName}
        email={email}
        groups={groups}
      />

      {/* Main Info Columns */}
      <Row gutter={[20, 20]}>
        {/* Card 1: 账号基本信息 */}
        <Col xs={24} lg={12}>
          <BasicInfoCard
            user={user}
            displayName={displayName}
            email={email}
            groups={groups}
          />
        </Col>

        {/* Card 2: 微软认证信息 */}
        <Col xs={24} lg={12}>
          <EntraAuthCard user={user} />
        </Col>

        {/* Card 3: Minecraft 角色与材质档案 */}
        <Col xs={24} lg={12}>
          <MinecraftProfileCard
            player={player}
            onNavigateTab={onNavigateTab}
          />
        </Col>

        {/* Card 4: 启动器专用凭证 */}
        <Col xs={24} lg={12}>
          <LauncherCredentialCard
            email={email}
            launcherPwd={launcherPwd}
            resetting={resetting}
            onResetPassword={handleResetPassword}
          />
        </Col>
      </Row>
    </div>
  );
}

