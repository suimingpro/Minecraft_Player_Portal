'use client';

import React from 'react';
import {
  Avatar,
  Button,
  Card,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudServerOutlined,
  CopyOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { MinecraftServer, PortalUser } from '@/lib/auth';

const { Title, Text, Paragraph } = Typography;

interface ServerCardProps {
  server: MinecraftServer;
  user: PortalUser | null;
}

export default function ServerCard({ server, user }: ServerCardProps) {
  const handleCopy = (textToCopy: string, tip: string) => {
    navigator.clipboard.writeText(textToCopy);
    message.success(`已复制 ${tip} 到剪贴板`);
  };

  const renderAccessBadge = () => {
    const status = server.access_status;
    const mode = server.access_mode;

    if (!user || !user.player) {
      return (
        <Tooltip title="你尚未在 Portal 绑定 Minecraft 角色，无法验证进服权限">
          <Tag
            color="warning"
            icon={<ExclamationCircleOutlined />}
            style={{ fontSize: 13, padding: '3px 10px', borderRadius: 4 }}
          >
            未绑定角色
          </Tag>
        </Tooltip>
      );
    }

    if (mode === 'all') {
      return (
        <Tag
          color="success"
          icon={<CheckCircleOutlined />}
          style={{ fontSize: 13, padding: '3px 10px', borderRadius: 4 }}
        >
          全员开放 / 允许加入
        </Tag>
      );
    }

    if (status === 'allowed') {
      return (
        <Tag
          color="success"
          icon={<CheckCircleOutlined />}
          style={{ fontSize: 13, padding: '3px 10px', borderRadius: 4 }}
        >
          已在白名单 / 允许加入
        </Tag>
      );
    }

    if (status === 'not_whitelisted') {
      return (
        <Tooltip title="当前服务器开启了白名单验证，你的角色尚未被管理员加入该服务器白名单">
          <Tag
            color="error"
            icon={<CloseCircleOutlined />}
            style={{ fontSize: 13, padding: '3px 10px', borderRadius: 4 }}
          >
            未在白名单 / 暂无权限
          </Tag>
        </Tooltip>
      );
    }

    if (status === 'blacklisted') {
      return (
        <Tooltip title="你的角色当前在服务器黑名单中，禁止加入">
          <Tag
            color="error"
            icon={<StopOutlined />}
            style={{ fontSize: 13, padding: '3px 10px', borderRadius: 4 }}
          >
            已在黑名单 / 禁止进入
          </Tag>
        </Tooltip>
      );
    }

    return (
      <Tag
        color="default"
        style={{ fontSize: 13, padding: '3px 10px', borderRadius: 4 }}
      >
        {server.access_message || '未知状态'}
      </Tag>
    );
  };

  const renderModeTag = (mode: string) => {
    switch (mode) {
      case 'whitelist':
        return <Tag color="gold">白名单审核制</Tag>;
      case 'blacklist':
        return <Tag color="volcano">黑名单限制制</Tag>;
      default:
        return <Tag color="blue">全部开放</Tag>;
    }
  };

  return (
    <Card
      hoverable
      style={{
        height: '100%',
        borderRadius: 12,
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: 24,
        },
      }}
    >
      <div>
        {/* Top Row: Icon, Name, Mode */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <Avatar
            shape="square"
            size={64}
            src={server.icon_url}
            icon={<CloudServerOutlined />}
            style={{
              backgroundColor: '#e6f4ff',
              color: '#1677ff',
              borderRadius: 10,
              flexShrink: 0,
              border: '1px solid #d9d9d9',
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
                {server.name}
              </Title>
              {renderModeTag(server.access_mode)}
            </div>

            {/* Permission Status Tag */}
            <div style={{ marginTop: 8 }}>{renderAccessBadge()}</div>
          </div>
        </div>

        {/* Server Description */}
        <Paragraph
          ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
          style={{
            marginTop: 16,
            color: '#595959',
            fontSize: 13,
            lineHeight: 1.6,
            minHeight: 42,
          }}
        >
          {server.description || '暂无详细简介'}
        </Paragraph>

        {/* Connection Info Box */}
        <div
          style={{
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            padding: '12px 16px',
            marginTop: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space size={8}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              服务器地址：
            </Text>
            <Text strong code style={{ fontSize: 13 }}>
              {server.address || '暂未公布'}
            </Text>
          </Space>
          {server.address && (
            <Button
              type="primary"
              ghost
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(server.address!, '服务器地址')}
            >
              复制地址
            </Button>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: '#8c8c8c',
        }}
      >
        <span>
          <SafetyCertificateOutlined style={{ marginRight: 4 }} />
          独立 Yggdrasil 鉴权
        </span>
        <span>
          {server.created_at
            ? `创建于 ${new Date(server.created_at).toLocaleDateString('zh-CN')}`
            : ''}
        </span>
      </div>
    </Card>
  );
}
