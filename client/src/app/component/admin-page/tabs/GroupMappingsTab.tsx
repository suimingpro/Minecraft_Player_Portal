'use client';

import React from 'react';
import {
  Alert,
  Button,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { GroupMappingItem } from '@/lib/auth';

const { Text } = Typography;

interface GroupMappingsTabProps {
  mappings: GroupMappingItem[];
  loading: boolean;
  onRefresh: () => void;
  onAddMapping: () => void;
  onEditMapping: (item: GroupMappingItem) => void;
  onDeleteMapping: (groupId: string) => Promise<void> | void;
}

export const GroupMappingsTab: React.FC<GroupMappingsTabProps> = ({
  mappings,
  loading,
  onRefresh,
  onAddMapping,
  onEditMapping,
  onDeleteMapping,
}) => {
  const columns: ColumnsType<GroupMappingItem> = [
    {
      title: '微软 Entra 组 Object ID (GUID)',
      dataIndex: 'group_id',
      key: 'group_id',
      render: (gid: string) => (
        <Text copyable code style={{ fontSize: 13 }}>
          {gid}
        </Text>
      ),
    },
    {
      title: 'Portal 显示名称与标签颜色',
      dataIndex: 'group_name',
      key: 'group_name',
      render: (name: string, record) => (
        <Space align="center">
          <Tag
            color={record.group_color || 'blue'}
            style={{ fontSize: 13, padding: '2px 10px', margin: 0 }}
          >
            {name}
          </Tag>
          <Text type="secondary" code style={{ fontSize: 12 }}>
            {record.group_color || 'blue'}
          </Text>
        </Space>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
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
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEditMapping(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该组映射？"
            description="删除后，属于该微软组的用户在 Portal 中将恢复显示未映射状态。"
            onConfirm={() => onDeleteMapping(record.group_id)}
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
      <Alert
        type="info"
        showIcon
        message="用户组映射说明"
        description="将微软 Entra ID 中的组 Object ID (GUID) 映射为 Portal 内友好的组名称并配置专属标签颜色。用户通过 SAML SSO 登录时，系统会自动匹配并实时显示已配置的彩色标签。"
        style={{ marginBottom: 16 }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text type="secondary">
          数据库中 users.groups 仅保存 Object ID，展示时由映射表统一解析。
        </Text>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAddMapping}
          >
            添加组映射
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
        dataSource={mappings}
        rowKey="id"
        loading={loading}
        pagination={false}
        scroll={{ x: 700 }}
      />
    </div>
  );
};

export default GroupMappingsTab;
