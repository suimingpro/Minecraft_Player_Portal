'use client';

import React from 'react';
import { Button, Descriptions, Modal, Space, Tag, Typography } from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import { AdminUserData } from '@/lib/auth';

const { Text } = Typography;

interface UserInfoModalProps {
  open: boolean;
  user: AdminUserData | null;
  onClose: () => void;
  onOpenEditPlayer: (user: AdminUserData) => void;
}

export const UserInfoModal: React.FC<UserInfoModalProps> = ({
  open,
  user,
  onClose,
  onOpenEditPlayer,
}) => {
  return (
    <Modal
      title={
        <Space>
          <UserOutlined style={{ color: '#1677ff' }} />
          <span>用户详细信息</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button
          key="edit"
          icon={<EditOutlined />}
          onClick={() => {
            if (user) {
              onClose();
              onOpenEditPlayer(user);
            }
          }}
        >
          修改玩家信息
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={680}
      destroyOnHidden
    >
      {user && (
        <div style={{ marginTop: 16 }}>
          <Descriptions bordered size="small" column={1} styles={{ label: { width: 160 } }}>
            <Descriptions.Item label="姓名 / 显示名称">
              <Text strong>{user.display_name || '未设置'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="电子邮箱">
              <Text copyable>{user.email || '未绑定邮箱'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Portal 用户 UUID">
              <Text copyable code>{user.uuid}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="微软账户 Object ID">
              <Text copyable code>{user.microsoft_oid || '无'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="微软租户 ID (TID)">
              <Text copyable code>{user.microsoft_tid || '无'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="注册时间">
              {user.created_at ? new Date(user.created_at).toLocaleString('zh-CN') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="最近登录时间">
              {user.last_login_at ? new Date(user.last_login_at).toLocaleString('zh-CN') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="所属组">
              {user.group_details && user.group_details.length > 0 ? (
                <Space wrap size={[0, 4]}>
                  {user.group_details.map((g) => (
                    <Tag key={g.id || g.name} color={g.color || 'blue'}>
                      {g.name}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">（无 / 未映射组）</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="绑定的 Minecraft 角色">
              {user.player ? (
                <div>
                  <div>
                    角色名：<Text strong style={{ color: '#1677ff' }}>{user.player.minecraft_username}</Text>
                  </div>
                  <div>
                    UUID：<Text copyable code style={{ fontSize: 11 }}>{user.player.player_uuid}</Text>
                  </div>
                  <div>
                    模型：
                    <Tag color={user.player.skin_model === 'slim' ? 'purple' : 'blue'}>
                      {user.player.skin_model === 'slim' ? 'Alex / 纤细' : 'Steve / 经典'}
                    </Tag>
                  </div>
                  {user.player.skin_url && (
                    <div style={{ marginTop: 4 }}>
                      <a href={user.player.skin_url} target="_blank" rel="noopener noreferrer">
                        查看皮肤纹理
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <Tag color="default">暂未绑定角色</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        </div>
      )}
    </Modal>
  );
};

export default UserInfoModal;
