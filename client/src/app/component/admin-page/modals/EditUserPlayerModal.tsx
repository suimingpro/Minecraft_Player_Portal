'use client';

import React, { useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Radio,
  Space,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import {
  AdminUserData,
  adminUnbindPlayer,
  adminUpdateUserPlayer,
  AdminUpdatePlayerPayload,
} from '@/lib/auth';

interface EditUserPlayerModalProps {
  open: boolean;
  user: AdminUserData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditUserPlayerModal: React.FC<EditUserPlayerModalProps> = ({
  open,
  user,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleFinish = async (values: AdminUpdatePlayerPayload) => {
    if (!user) return;
    try {
      setSaving(true);
      await adminUpdateUserPlayer(user.uuid, {
        display_name: values.display_name,
        minecraft_username: values.minecraft_username,
        player_uuid: values.player_uuid,
        skin_model: values.skin_model,
        skin_url: values.skin_url,
        cape_url: values.cape_url,
      });
      message.success('已成功保存用户与玩家角色信息');
      onClose();
      onSuccess();
    } catch (err: unknown) {
      message.error((err as Error).message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleUnbind = async () => {
    if (!user) return;
    try {
      await adminUnbindPlayer(user.uuid);
      message.success('已解绑该用户的 Minecraft 角色');
      onClose();
      onSuccess();
    } catch (err: unknown) {
      message.error((err as Error).message || '解绑失败');
    }
  };

  return (
    <Modal
      title={
        <Space>
          <EditOutlined style={{ color: '#1677ff' }} />
          <span>
            修改用户信息与玩家绑定 - {user?.display_name || user?.email || ''}
          </span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnHidden
    >
      {user && (
        <Form
          key={user.uuid}
          form={form}
          layout="vertical"
          preserve={false}
          initialValues={{
            display_name: user.display_name || '',
            minecraft_username: user.player?.minecraft_username || '',
            player_uuid: user.player?.player_uuid || '',
            skin_model: user.player?.skin_model || 'default',
            skin_url: user.player?.skin_url || '',
            cape_url: user.player?.cape_url || '',
          }}
          onFinish={handleFinish}
          style={{ marginTop: 16 }}
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={
              <span>
                管理员可手动为该账号修改或绑定 Minecraft 角色。
                若留空 UUID，系统将根据用户名自动计算生成 Minecraft 离线 UUID。
              </span>
            }
          />

          <Form.Item label="Portal 显示姓名" name="display_name">
            <Input placeholder="用户真实姓名 / 昵称" allowClear />
          </Form.Item>

          <Form.Item
            label="Minecraft 游戏内用户名"
            name="minecraft_username"
            rules={[
              { required: true, message: '请输入 Minecraft 用户名' },
              { max: 16, message: '用户名最多 16 个字符' },
            ]}
          >
            <Input placeholder="如 Steve, Alex, suiming 等" allowClear />
          </Form.Item>

          <Form.Item
            label="Minecraft 角色 UUID"
            name="player_uuid"
            tooltip="可手动输入 32 位无连字符或 36 位标准 UUID；留空将根据用户名自动计算标准离线 UUID。"
            rules={[
              {
                pattern: /^$|^[0-9a-fA-F-]{32,36}$/,
                message: 'UUID 格式无效，须为 32 或 36 位 UUID',
              },
            ]}
          >
            <Input placeholder="留空自动计算离线 UUID，或输入指定 UUID" allowClear />
          </Form.Item>

          <Form.Item
            label="皮肤模型 (Skin Model)"
            name="skin_model"
            rules={[{ required: true }]}
          >
            <Radio.Group>
              <Radio value="default">Steve / 经典 (default / 4px)</Radio>
              <Radio value="slim">Alex / 纤细 (slim / 3px)</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="自定义皮肤纹理 URL"
            name="skin_url"
            tooltip="皮肤 PNG 材质地址（可选）"
          >
            <Input placeholder="https://... 或留空" allowClear />
          </Form.Item>

          <Form.Item
            label="自定义披风纹理 URL"
            name="cape_url"
            tooltip="披风 PNG 材质地址（可选）"
          >
            <Input placeholder="https://... 或留空" allowClear />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            {user.player ? (
              <Popconfirm
                title="确认解绑该用户的 Minecraft 角色？"
                description="解绑后该用户将无绑定角色，其相关游戏记录将不再关联。"
                onConfirm={handleUnbind}
                okText="解绑"
                okButtonProps={{ danger: true }}
                cancelText="取消"
              >
                <Button danger>解绑当前角色</Button>
              </Popconfirm>
            ) : (
              <div />
            )}

            <Space>
              <Button onClick={onClose}>取消</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                保存角色信息
              </Button>
            </Space>
          </div>
        </Form>
      )}
    </Modal>
  );
};

export default EditUserPlayerModal;
