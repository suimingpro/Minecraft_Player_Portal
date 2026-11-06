'use client';

import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Input,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CrownOutlined,
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { AdminUserData, GroupMappingItem } from '@/lib/auth';

const { Text } = Typography;

interface UsersTabProps {
  users: AdminUserData[];
  mappings: GroupMappingItem[];
  loading: boolean;
  onRefresh: () => void;
  onViewUser: (user: AdminUserData) => void;
  onEditUserPlayer: (user: AdminUserData) => void;
  onQuickWhitelist: (user: AdminUserData) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  mappings,
  loading,
  onRefresh,
  onViewUser,
  onEditUserPlayer,
  onQuickWhitelist,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');

  const filteredUsers = useMemo(() => {
    const kw = searchKeyword.toLowerCase().trim();
    if (!kw) return users;
    return users.filter((u) => {
      return (
        (u.display_name && u.display_name.toLowerCase().includes(kw)) ||
        (u.email && u.email.toLowerCase().includes(kw)) ||
        (u.player?.minecraft_username && u.player.minecraft_username.toLowerCase().includes(kw)) ||
        (u.player?.player_uuid && u.player.player_uuid.toLowerCase().includes(kw)) ||
        (u.groups && u.groups.some((g) => g.toLowerCase().includes(kw)))
      );
    });
  }, [users, searchKeyword]);

  const columns: ColumnsType<AdminUserData> = [
    {
      title: '用户姓名 / 邮箱',
      key: 'user',
      render: (_, record) => {
        const name = record.display_name || record.email || '未命名用户';
        const avatarUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
          name
        )}&backgroundColor=0078d4&radius=50&fontSize=40`;

        return (
          <Space size="middle">
            <Avatar src={avatarUrl} size={36}>
              {name.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600 }}>
                {name}
                {record.is_admin && (
                  <Tag color="red" style={{ marginLeft: 6, fontSize: 11 }}>
                    <CrownOutlined style={{ marginRight: 2 }} />
                    管理员
                  </Tag>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.email || '未绑定邮箱'}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: '所属组 (已映射)',
      dataIndex: 'groups',
      key: 'groups',
      render: (_, record) => {
        const details = record.group_details;
        if (details && details.length > 0) {
          return (
            <Space wrap size={[0, 4]}>
              {details.map((g) => (
                <Tag
                  key={g.id || g.name}
                  color={g.color || 'blue'}
                  style={{ fontSize: 12 }}
                >
                  {g.name}
                </Tag>
              ))}
            </Space>
          );
        }
        const groups = record.groups;
        if (!groups || groups.length === 0) {
          return <Text type="secondary">（无 / 未映射）</Text>;
        }
        return (
          <Space wrap size={[0, 4]}>
            {groups.map((grp) => {
              const matchedMapping = mappings.find(
                (m) => m.group_name === grp || m.group_id === grp
              );
              return (
                <Tag
                  key={grp}
                  color={matchedMapping?.group_color || 'blue'}
                  style={{ fontSize: 12 }}
                >
                  {grp}
                </Tag>
              );
            })}
          </Space>
        );
      },
    },
    {
      title: '绑定的 Minecraft 角色',
      key: 'player',
      render: (_, record) => {
        const p = record.player;
        if (!p) {
          return <Tag color="default">未绑定</Tag>;
        }
        return (
          <div>
            <Space>
              <Text strong style={{ color: '#1677ff' }}>
                {p.minecraft_username}
              </Text>
              <Tag color={p.skin_model === 'slim' ? 'purple' : 'blue'}>
                {p.skin_model === 'slim' ? 'Alex / 纤细' : 'Steve / 经典'}
              </Tag>
            </Space>
            {p.player_uuid && (
              <div>
                <Text type="secondary" code style={{ fontSize: 11 }}>
                  {p.player_uuid}
                </Text>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '登录与注册时间',
      key: 'time',
      render: (_, record) => {
        const formatT = (t?: string | null) => {
          if (!t) return '-';
          try {
            return new Date(t).toLocaleString('zh-CN', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });
          } catch {
            return t;
          }
        };
        return (
          <div style={{ fontSize: 12 }}>
            <div>最近登录：{formatT(record.last_login_at)}</div>
            <div style={{ color: '#8c8c8c' }}>注册：{formatT(record.created_at)}</div>
          </div>
        );
      },
    },
    {
      title: '管理操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onViewUser(record)}
          >
            查看
          </Button>

          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEditUserPlayer(record)}
          >
            修改玩家信息
          </Button>

          {record.player ? (
            <Button
              type="primary"
              size="small"
              icon={<UserAddOutlined />}
              onClick={() => onQuickWhitelist(record)}
            >
              加入白名单
            </Button>
          ) : (
            <Tooltip title="该用户尚未绑定 Minecraft 角色，无法加入服务器白名单">
              <Button size="small" disabled icon={<UserAddOutlined />}>
                加入白名单
              </Button>
            </Tooltip>
          )}
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
          placeholder="搜索姓名、邮箱、Minecraft 角色名、UUID 或组名称"
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          style={{ maxWidth: 380 }}
          allowClear
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={loading}
        >
          刷新数据
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowKey="uuid"
        loading={loading}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `共 ${total} 位用户`,
        }}
        scroll={{ x: 800 }}
      />
    </div>
  );
};

export default UsersTab;
