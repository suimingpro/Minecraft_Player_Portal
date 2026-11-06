'use client';

import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Input,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CloudServerOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { API_BASE_URL, MinecraftServer } from '@/lib/auth';

const { Text } = Typography;

interface ServersTabProps {
  servers: MinecraftServer[];
  loading: boolean;
  onRefresh: () => void;
  onAddServer: () => void;
  onEditServer: (server: MinecraftServer) => void;
  onDeleteServer: (serverId: string) => Promise<void> | void;
  onOpenPlayerDrawer: (server: MinecraftServer) => void;
}

export const ServersTab: React.FC<ServersTabProps> = ({
  servers,
  loading,
  onRefresh,
  onAddServer,
  onEditServer,
  onDeleteServer,
  onOpenPlayerDrawer,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');

  const handleCopy = (textToCopy: string, label: string) => {
    navigator.clipboard.writeText(textToCopy);
    message.success(`已复制 ${label} 到剪贴板`);
  };

  const filteredServers = useMemo(() => {
    const kw = searchKeyword.toLowerCase().trim();
    if (!kw) return servers;
    return servers.filter((s) => {
      return (
        s.name.toLowerCase().includes(kw) ||
        (s.address && s.address.toLowerCase().includes(kw)) ||
        (s.description && s.description.toLowerCase().includes(kw)) ||
        s.id.toLowerCase().includes(kw)
      );
    });
  }, [servers, searchKeyword]);

  const columns: ColumnsType<MinecraftServer> = [
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>服务器</span>,
      key: 'server',
      width: 220,
      render: (_, record) => (
        <Space size="middle">
          <Avatar
            shape="square"
            size={42}
            src={record.icon_url}
            icon={<CloudServerOutlined />}
            style={{
              backgroundColor: '#e6f4ff',
              color: '#1677ff',
              borderRadius: 6,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>
              {record.name}
            </div>
            {record.description && (
              <Text
                type="secondary"
                ellipsis={{ tooltip: record.description }}
                style={{ fontSize: 12, maxWidth: 180, display: 'block' }}
              >
                {record.description}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>服务器地址</span>,
      dataIndex: 'address',
      key: 'address',
      width: 230,
      render: (addr: string | null) =>
        addr ? (
          <div style={{ whiteSpace: 'nowrap' }}>
            <Text code copyable={{ text: addr }} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              {addr}
            </Text>
          </div>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>唯一 ID / 验证端点</span>,
      key: 'id_endpoint',
      width: 330,
      render: (_, record) => {
        const yggUrl = `${API_BASE_URL}/api/yggdrasil/${record.id}`;
        return (
          <div style={{ whiteSpace: 'nowrap' }}>
            <div style={{ marginBottom: 4 }}>
              <Text copyable={{ text: record.id }} code style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                {record.id}
              </Text>
            </div>
            <Space size={8}>
              <Tooltip title={yggUrl}>
                <Text
                  type="secondary"
                  ellipsis={{ tooltip: yggUrl }}
                  style={{ fontSize: 11, maxWidth: 210, fontFamily: 'monospace' }}
                >
                  {yggUrl}
                </Text>
              </Tooltip>
              <Button
                type="link"
                size="small"
                icon={<CopyOutlined />}
                style={{ padding: 0, fontSize: 12, whiteSpace: 'nowrap' }}
                onClick={() => handleCopy(yggUrl, '验证端点')}
              >
                复制
              </Button>
            </Space>
          </div>
        );
      },
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>限制机制</span>,
      dataIndex: 'access_mode',
      key: 'access_mode',
      width: 140,
      render: (mode: string) => {
        if (mode === 'whitelist') {
          return <Tag color="gold" style={{ whiteSpace: 'nowrap' }}>白名单审核制</Tag>;
        }
        if (mode === 'blacklist') {
          return <Tag color="volcano" style={{ whiteSpace: 'nowrap' }}>黑名单限制制</Tag>;
        }
        return <Tag color="blue" style={{ whiteSpace: 'nowrap' }}>全部开放</Tag>;
      },
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Server 页展示</span>,
      dataIndex: 'is_public',
      key: 'is_public',
      width: 120,
      render: (isPub: boolean) => (
        <Tag color={isPub ? 'success' : 'default'} style={{ whiteSpace: 'nowrap' }}>
          {isPub ? '公开展示' : '隐藏'}
        </Tag>
      ),
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>规则名单统计</span>,
      key: 'stats',
      width: 130,
      render: (_, record) => {
        const wl = record.whitelist_count ?? 0;
        const bl = record.blacklist_count ?? 0;
        return (
          <div style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            <div>
              白名单: <Text strong style={{ color: '#52c41a' }}>{wl}</Text> 人
            </div>
            <div>
              黑名单: <Text strong style={{ color: '#f5222d' }}>{bl}</Text> 人
            </div>
          </div>
        );
      },
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>操作</span>,
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          <Button
            size="small"
            icon={<TeamOutlined />}
            onClick={() => onOpenPlayerDrawer(record)}
          >
            名单管理
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEditServer(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该服务器？"
            description="删除后该服务器的验证配置和所有玩家名单规则将被永久移除。"
            onConfirm={() => onDeleteServer(record.id)}
            okText="确认删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Input
          placeholder="搜索服务器名称、连接地址或 ID"
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          style={{ maxWidth: 320 }}
          allowClear
        />
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAddServer}
          >
            添加服务器
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredServers}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 台服务器`,
        }}
        scroll={{ x: 1360 }}
      />
    </div>
  );
};

export default ServersTab;
