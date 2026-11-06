'use client';

import React from 'react';
import { Alert, Button, Input, Space } from 'antd';
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { DEFAULT_APP_NAME } from '@/lib/auth';

interface SettingsTabProps {
  appNameInput: string;
  setAppNameInput: (val: string) => void;
  loading: boolean;
  saving: boolean;
  onSave: () => void;
  onResetDefault: () => void;
  onRefresh: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  appNameInput,
  setAppNameInput,
  loading,
  saving,
  onSave,
  onResetDefault,
  onRefresh,
}) => {
  return (
    <div style={{ maxWidth: 650, padding: '12px 0 24px' }}>
      <Alert
        type="info"
        showIcon
        message="全局系统设置"
        description="修改系统设置后将对所有客户端和登录页面生效。配置会保存在数据库并在服务重启后保持持久化。"
        style={{ marginBottom: 24 }}
      />

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
          应用名称 (Application Name)
        </div>
        <div style={{ color: '#8c8c8c', marginBottom: 12, fontSize: 13 }}>
          留空或点击“恢复默认”将使用系统默认名称：Minecraft Player Portal
        </div>
        <Input
          value={appNameInput}
          onChange={(e) => setAppNameInput(e.target.value)}
          placeholder={DEFAULT_APP_NAME}
          size="large"
          allowClear
          disabled={loading || saving}
          style={{ maxWidth: 450, display: 'block', marginBottom: 24 }}
        />

        <Space size="middle">
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={onSave}
            loading={saving}
            size="middle"
          >
            保存设置
          </Button>
          <Button
            onClick={onResetDefault}
            disabled={saving || appNameInput === DEFAULT_APP_NAME}
            size="middle"
          >
            恢复默认名称
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={loading}
            size="middle"
          >
            刷新
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default SettingsTab;
