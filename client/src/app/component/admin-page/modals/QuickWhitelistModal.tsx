'use client';

import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Card,
  Checkbox,
  Empty,
  message,
  Modal,
  Space,
  Tag,
  Typography,
} from 'antd';
import { CloudServerOutlined, UserAddOutlined } from '@ant-design/icons';
import { AdminUserData, MinecraftServer, quickAddUserToWhitelist } from '@/lib/auth';

const { Text, Paragraph } = Typography;

interface QuickWhitelistModalProps {
  open: boolean;
  user: AdminUserData | null;
  servers: MinecraftServer[];
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickWhitelistModal: React.FC<QuickWhitelistModalProps> = ({
  open,
  user,
  servers,
  onClose,
  onSuccess,
}) => {
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && servers.length > 0) {
      const defaultIds = servers
        .filter((s) => s.access_mode === 'whitelist')
        .map((s) => s.id);
      setSelectedServerIds(defaultIds.length > 0 ? defaultIds : [servers[0].id]);
    }
  }, [open, servers]);

  const handleConfirm = async () => {
    if (!user || selectedServerIds.length === 0) {
      message.warning('请选择至少一个服务器');
      return;
    }
    try {
      setSubmitting(true);
      await quickAddUserToWhitelist(user.uuid, selectedServerIds);
      message.success(`已将玩家【${user.player?.minecraft_username}】成功加入选中服务器白名单`);
      onClose();
      onSuccess();
    } catch (err: unknown) {
      message.error((err as Error).message || '添加白名单失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <UserAddOutlined style={{ color: '#52c41a' }} />
          <span>加入服务器白名单</span>
        </Space>
      }
      open={open}
      onOk={handleConfirm}
      onCancel={onClose}
      confirmLoading={submitting}
      okText="确认加入白名单"
      cancelText="取消"
      destroyOnHidden
    >
      {user && (
        <div style={{ marginTop: 12 }}>
          <Paragraph>
            正在为玩家{' '}
            <Text strong style={{ color: '#1677ff' }}>
              {user.player?.minecraft_username}
            </Text>{' '}
            （UUID: <Text code style={{ fontSize: 11 }}>{user.player?.player_uuid}</Text>
            ）分配白名单：
          </Paragraph>

          <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 600 }}>
            选择要加入的服务器：
          </div>

          {servers.length === 0 ? (
            <Empty description="暂无配置的服务器，请先在服务器管理中添加服务器" />
          ) : (
            <Checkbox.Group
              style={{ width: '100%' }}
              value={selectedServerIds}
              onChange={(vals) => setSelectedServerIds(vals as string[])}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {servers.map((s) => (
                  <Card key={s.id} size="small" style={{ marginBottom: 6, borderRadius: 6 }}>
                    <Checkbox value={s.id} style={{ width: '100%' }}>
                      <Space>
                        <Avatar
                          size={24}
                          shape="square"
                          src={s.icon_url}
                          icon={<CloudServerOutlined />}
                        />
                        <Text strong>{s.name}</Text>
                        {s.access_mode === 'whitelist' ? (
                          <Tag color="gold">白名单制</Tag>
                        ) : s.access_mode === 'blacklist' ? (
                          <Tag color="volcano">黑名单制</Tag>
                        ) : (
                          <Tag color="blue">全部开放</Tag>
                        )}
                        {s.address && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            ({s.address})
                          </Text>
                        )}
                      </Space>
                    </Checkbox>
                  </Card>
                ))}
              </Space>
            </Checkbox.Group>
          )}
        </div>
      )}
    </Modal>
  );
};

export default QuickWhitelistModal;
