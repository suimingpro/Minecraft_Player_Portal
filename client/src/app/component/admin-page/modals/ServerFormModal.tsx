'use client';

import React, { useState } from 'react';
import {
  Avatar,
  Button,
  Form,
  Input,
  message,
  Modal,
  Radio,
  Space,
  Upload,
} from 'antd';
import { CloudServerOutlined, UploadOutlined } from '@ant-design/icons';
import {
  createAdminServer,
  MinecraftServer,
  updateAdminServer,
  uploadServerIcon,
} from '@/lib/auth';

interface ServerFormModalProps {
  open: boolean;
  editingServer: MinecraftServer | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ServerFormModal: React.FC<ServerFormModalProps> = ({
  open,
  editingServer,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const watchedIcon = Form.useWatch('icon_url', form);

  const handleUploadIcon = async (file: File) => {
    if (file.size / 1024 / 1024 > 10) {
      message.error('头像文件大小不能超过 10MB！');
      return Upload.LIST_IGNORE;
    }

    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|ico|svg)$/i.test(file.name);
    if (!isImage) {
      message.error('仅支持上传图片格式文件 (PNG, JPG, WEBP, GIF, SVG 等)！');
      return Upload.LIST_IGNORE;
    }

    setUploadingIcon(true);
    try {
      const url = await uploadServerIcon(file);
      form.setFieldsValue({ icon_url: url });
      message.success('头像上传成功！');
    } catch (err: unknown) {
      message.error((err as Error).message || '上传头像失败');
    } finally {
      setUploadingIcon(false);
    }
    return false;
  };

  const handleFinish = async (values: any) => {
    try {
      setSaving(true);
      if (editingServer) {
        await updateAdminServer(editingServer.id, values);
        message.success('已更新服务器配置');
      } else {
        await createAdminServer(values);
        message.success('已创建新服务器并分配唯一验证 ID');
      }
      onClose();
      onSuccess();
    } catch (err: unknown) {
      message.error((err as Error).message || '保存服务器失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editingServer ? '编辑服务器' : '添加游戏服务器'}
      open={open}
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
    >
      <Form
        key={editingServer?.id || 'new-server'}
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        preserve={false}
        initialValues={{
          name: editingServer?.name || '',
          description: editingServer?.description || '',
          address: editingServer?.address || '',
          icon_url: editingServer?.icon_url || '',
          access_mode: editingServer?.access_mode || 'all',
          is_public: editingServer?.is_public ?? true,
        }}
        onFinish={handleFinish}
      >
        <Form.Item
          label="服务器名称"
          name="name"
          rules={[{ required: true, message: '请输入服务器名称' }]}
        >
          <Input placeholder="如 SST纯净生存一服、创造服等" />
        </Form.Item>

        <Form.Item label="服务器简介" name="description">
          <Input.TextArea rows={3} placeholder="介绍服务器玩法、版本、特色等..." />
        </Form.Item>

        <Form.Item
          label="服务器连接地址 (IP / 域名及端口)"
          name="address"
          tooltip="玩家在 Minecraft 客户端中填写的服务器地址"
        >
          <Input placeholder="如 play.sstown.world:25565" />
        </Form.Item>

        <Form.Item
          label="服务器头像 / 图标"
          tooltip="支持上传本地图片或输入网络图片 URL"
        >
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              padding: '12px 16px',
              background: '#fafafa',
              borderRadius: 8,
              border: '1px solid #f0f0f0',
              marginBottom: 8,
            }}
          >
            <Avatar
              shape="square"
              size={64}
              src={watchedIcon || undefined}
              icon={<CloudServerOutlined style={{ fontSize: 28 }} />}
              style={{
                backgroundColor: '#e6f4ff',
                color: '#1677ff',
                borderRadius: 8,
                border: '1px solid #d9d9d9',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
            <div style={{ flex: 1 }}>
              <Space wrap>
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={handleUploadIcon}
                  disabled={uploadingIcon}
                >
                  <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    loading={uploadingIcon}
                  >
                    上传本地头像
                  </Button>
                </Upload>
                {watchedIcon && (
                  <Button
                    danger
                    onClick={() => form.setFieldsValue({ icon_url: '' })}
                  >
                    清除头像
                  </Button>
                )}
              </Space>
              <div style={{ marginTop: 6, fontSize: 12, color: '#8c8c8c' }}>
                支持 PNG、JPG、WEBP、GIF、SVG 等，建议正方形尺寸，不超过 10MB
              </div>
            </div>
          </div>

          <Form.Item
            name="icon_url"
            noStyle
            rules={[
              {
                validator: async (_, value) => {
                  if (!value) return Promise.resolve();
                  if (!/^https?:\/\//i.test(value) && !value.startsWith('/')) {
                    return Promise.reject(new Error('请输入以 http:// 或 https:// 开头的有效链接'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              placeholder="或直接在此粘贴图片 URL (https://...)"
              allowClear
            />
          </Form.Item>
        </Form.Item>

        <Form.Item
          label="限制机制 (进服权限控制)"
          name="access_mode"
          rules={[{ required: true, message: '请选择限制机制' }]}
        >
          <Radio.Group>
            <Radio value="all">全部 (所有已绑定角色均可进服)</Radio>
            <Radio value="whitelist">白名单 (仅允许白名单列表中的玩家进服)</Radio>
            <Radio value="blacklist">黑名单 (仅禁止黑名单列表中的玩家进服)</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="是否展示在 Server 页面"
          name="is_public"
          rules={[{ required: true, message: '请选择是否展示' }]}
        >
          <Radio.Group>
            <Radio value={true}>展示在 Server 页面</Radio>
            <Radio value={false}>隐藏 (不公开展示)</Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ServerFormModal;
