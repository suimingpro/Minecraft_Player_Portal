'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Radio,
  Space,
  Upload,
  message,
} from 'antd';
import type { UploadProps } from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  SyncOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  updateMySkin,
  uploadMySkin,
  type PlayerProfile,
} from '@/lib/auth';
import {
  lookupPlayer,
  validateImageFile,
  validateTextureInBrowser,
} from '../utils/textureUtils';

interface SkinFormValues {
  skin_url: string;
  cape_url: string;
  skin_model: 'default' | 'slim';
}

interface SkinEditFormProps {
  player: PlayerProfile;
  onSaved: (p: PlayerProfile) => void;
}

export default function SkinEditForm({ player, onSaved }: SkinEditFormProps) {
  const [form] = Form.useForm<SkinFormValues>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!player.minecraft_username && !player.player_uuid) {
      message.error('未绑定有效的玩家标识');
      return;
    }
    setSyncing(true);
    try {
      const queryArg = player.minecraft_username || player.player_uuid!;
      const result = await lookupPlayer(queryArg);
      if (result.skin_texture) {
        form.setFieldsValue({ skin_url: result.skin_texture });
        message.success('已填入官方皮肤链接，请点击保存应用！');
      } else {
        message.warning('该玩家似乎没有设置正版皮肤');
      }
    } catch (err: unknown) {
      message.error((err as Error).message || '同步官方皮肤失败');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    form.setFieldsValue({
      skin_url: player.skin_url ?? '',
      cape_url: player.cape_url ?? '',
      skin_model: player.skin_model ?? 'default',
    });
    setError(null);
    setSuccess(false);
  }, [form, player]);

  const handleFinish = useCallback(
    async (values: SkinFormValues) => {
      const rawSkinUrl = values.skin_url ? values.skin_url.trim() : '';
      const rawCapeUrl = values.cape_url ? values.cape_url.trim() : '';
      const skinUrl = rawSkinUrl || null;
      const capeUrl = rawCapeUrl || null;

      setSaving(true);
      setError(null);
      setSuccess(false);

      try {
        // 1. 校验 Skin URL 是否为有效皮肤且可访问
        if (skinUrl) {
          const check = await validateTextureInBrowser(skinUrl, 'skin');
          if (!check.valid) {
            throw new Error(`Skin URL 校验失败：${check.message}`);
          }
        }

        // 2. 校验 Cape URL 是否为有效披风且可访问
        if (capeUrl) {
          const check = await validateTextureInBrowser(capeUrl, 'cape');
          if (!check.valid) {
            throw new Error(`Cape URL 校验失败：${check.message}`);
          }
        }

        const updated = await updateMySkin({
          skin_url: skinUrl,
          cape_url: capeUrl,
          skin_model: values.skin_model,
        });

        setSuccess(true);
        message.success('皮肤设置已成功保存！');
        onSaved(updated);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '保存失败，请稍后再试';
        setError(msg);
        message.error(msg);
      } finally {
        setSaving(false);
      }
    },
    [onSaved],
  );

  const uploadProps: UploadProps = {
    accept: '.png',
    showUploadList: false,
    beforeUpload: async (file) => {
      if (file.size / 1024 / 1024 > 10) {
        message.error('皮肤文件必须小于 10MB！');
        return Upload.LIST_IGNORE;
      }

      const check = await validateImageFile(file, 'skin');
      if (!check.valid) {
        message.error(`上传失败：${check.message}`);
        return Upload.LIST_IGNORE;
      }

      setUploading(true);
      try {
        const url = await uploadMySkin(file);
        form.setFieldsValue({ skin_url: url });
        message.success('皮肤上传成功！请点击下方“保存设置”以应用。');
      } catch (err: unknown) {
        message.error((err as Error).message || '上传失败');
      } finally {
        setUploading(false);
      }
      return false;
    },
  };

  return (
    <Card
      title={
        <Space>
          <EditOutlined />
          皮肤与模型设置
        </Space>
      }
      variant="outlined"
      style={{ marginBottom: 16 }}
    >
      {error && (
        <Alert
          type="error"
          message={error}
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}
      {success && (
        <Alert
          type="success"
          message="设置已更新"
          closable
          onClose={() => setSuccess(false)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          skin_url: player.skin_url ?? '',
          cape_url: player.cape_url ?? '',
          skin_model: player.skin_model ?? 'default',
        }}
      >
        <Form.Item
          label="Skin URL"
          tooltip="皮肤图片的 URL。你可以手动输入，或使用右侧按钮上传"
        >
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              name="skin_url"
              noStyle
              rules={[{ type: 'url', message: '请输入有效的 URL' }]}
            >
              <Input placeholder="https://example.com/skin.png" allowClear />
            </Form.Item>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />} loading={uploading}>
                上传皮肤
              </Button>
            </Upload>
            <Button
              icon={<SyncOutlined />}
              loading={syncing}
              onClick={handleSync}
            >
              同步官网皮肤
            </Button>
          </Space.Compact>
        </Form.Item>

        <Form.Item
          label="Cape URL"
          name="cape_url"
          tooltip="披风图片的 URL"
          rules={[{ type: 'url', message: '请输入有效的 URL' }]}
        >
          <Input placeholder="https://example.com/cape.png" allowClear />
        </Form.Item>

        <Form.Item label="皮肤模型" name="skin_model">
          <Radio.Group>
            <Radio.Button value="default">Classic / Steve</Radio.Button>
            <Radio.Button value="slim">Slim / Alex</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={saving}
          >
            保存设置
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
