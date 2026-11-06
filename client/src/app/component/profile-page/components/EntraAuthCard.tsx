'use client';

import React from 'react';
import {
  Badge,
  Card,
  Descriptions,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  WindowsOutlined,
} from '@ant-design/icons';
import type { PortalUser } from '@/lib/auth';

const { Text } = Typography;

interface EntraAuthCardProps {
  user: PortalUser;
}

export default function EntraAuthCard({ user }: EntraAuthCardProps) {
  return (
    <Card
      title={
        <Space>
          <WindowsOutlined style={{ color: '#0078d4' }} />
          <span>微软单点登录凭证 (Entra ID)</span>
        </Space>
      }
      style={{ height: '100%' }}
    >
      <Descriptions
        column={1}
        size="middle"
        bordered
        styles={{ label: { width: 140, fontWeight: 500, background: '#fafafa' } }}
      >
        <Descriptions.Item label="认证类型">
          <Tag color="cyan">Microsoft Entra SAML 2.0</Tag>
        </Descriptions.Item>

        <Descriptions.Item label="Microsoft OID">
          <Text copyable code style={{ fontSize: 12 }}>
            {user.microsoft_oid || '未提供'}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item label="Microsoft TID">
          <Text copyable code style={{ fontSize: 12 }}>
            {user.microsoft_tid || '未提供'}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item label="SSO 绑定状态">
          <Badge status="processing" text="已绑定当前组织账户" />
        </Descriptions.Item>

        <Descriptions.Item label="安全说明">
          <Text type="secondary" style={{ fontSize: 12 }}>
            您的账号身份受企业级 Microsoft Entra 保护，支持安全单点登出与多因素身份认证。
          </Text>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
