'use client';

import React from 'react';
import {
  Avatar,
  Button,
  Drawer,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  StopOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { MinecraftServer, ServerPlayerRule } from '@/lib/auth';

const { Text } = Typography;

interface ServerRulesDrawerProps {
  open: boolean;
  server: MinecraftServer | null;
  rules: ServerPlayerRule[];
  loading: boolean;
  onClose: () => void;
  onOpenAddPlayer: () => void;
  onRemoveRule: (ruleId: number) => Promise<void> | void;
}

export const ServerRulesDrawer: React.FC<ServerRulesDrawerProps> = ({
  open,
  server,
  rules,
  loading,
  onClose,
  onOpenAddPlayer,
  onRemoveRule,
}) => {
  const ruleColumns: ColumnsType<ServerPlayerRule> = [
    {
      title: '玩家用户名',
      dataIndex: 'player_name',
      key: 'player_name',
      render: (name: string | null) => (
        <Space>
          <Avatar
            size={24}
            src={
              name
                ? `https://minotar.net/helm/${encodeURIComponent(name)}/24`
                : undefined
            }
            icon={<UserOutlined />}
          />
          <Text strong>{name || '未知'}</Text>
        </Space>
      ),
    },
    {
      title: '玩家 UUID',
      dataIndex: 'player_uuid',
      key: 'player_uuid',
      render: (uuid: string) => (
        <Text code copyable style={{ fontSize: 12 }}>
          {uuid}
        </Text>
      ),
    },
    {
      title: '规则类型',
      dataIndex: 'rule_type',
      key: 'rule_type',
      render: (type: string) =>
        type === 'whitelist' ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            白名单
          </Tag>
        ) : (
          <Tag color="red" icon={<StopOutlined />}>
            黑名单
          </Tag>
        ),
    },
    {
      title: '添加时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t?: string | null) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t ? new Date(t).toLocaleString('zh-CN') : '-'}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="确认从名单中移除该玩家？"
          onConfirm={() => onRemoveRule(record.id)}
          okText="移除"
          okButtonProps={{ danger: true }}
          cancelText="取消"
        >
          <Button size="small" danger icon={<DeleteOutlined />}>
            移除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Drawer
      title={
        <Space>
          <TeamOutlined style={{ color: '#1677ff' }} />
          <span>管理服务器【{server?.name}】玩家名单</span>
        </Space>
      }
      width={720}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {server && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <div>
              <Text type="secondary">当前服务器限制模式：</Text>
              {server.access_mode === 'whitelist' ? (
                <Tag color="gold" style={{ marginLeft: 6 }}>
                  白名单模式
                </Tag>
              ) : server.access_mode === 'blacklist' ? (
                <Tag color="volcano" style={{ marginLeft: 6 }}>
                  黑名单模式
                </Tag>
              ) : (
                <Tag color="blue" style={{ marginLeft: 6 }}>
                  全部开放模式 (名单可作为预备规则)
                </Tag>
              )}
            </div>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onOpenAddPlayer}
            >
              添加玩家到名单
            </Button>
          </div>

          <Table
            columns={ruleColumns}
            dataSource={rules}
            rowKey="id"
            loading={loading}
            pagination={{ defaultPageSize: 10, showSizeChanger: true }}
          />
        </div>
      )}
    </Drawer>
  );
};

export default ServerRulesDrawer;
