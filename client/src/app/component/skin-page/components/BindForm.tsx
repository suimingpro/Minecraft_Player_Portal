'use client';

import React, { useCallback, useState } from 'react';
import { Alert, Button, Card, Input, Radio, Space, Typography, message } from 'antd';
import {
  CheckCircleOutlined,
  LinkOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import {
  bindMyPlayer,
  updateMyPlayerAccount,
  type PlayerProfile,
} from '@/lib/auth';

const { Text } = Typography;

interface BindFormProps {
  onBound: (p: PlayerProfile) => void;
  isUpdate?: boolean;
}

export default function BindForm({ onBound, isUpdate = false }: BindFormProps) {
  const [authToken, setAuthToken] = useState('');
  const [skinModel, setSkinModel] = useState<'default' | 'slim'>('default');
  const [binding, setBinding] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);

  const handleBind = useCallback(async () => {
    const token = authToken.trim();
    if (!token || token.length !== 6) {
      setBindError('请输入 6 位验证码');
      return;
    }
    setBinding(true);
    setBindError(null);
    try {
      let player: PlayerProfile;
      if (isUpdate) {
        player = await updateMyPlayerAccount({ auth_token: token });
        message.success('账号修改成功！');
      } else {
        player = await bindMyPlayer({ auth_token: token, skin_model: skinModel });
        message.success('绑定成功！');
      }
      onBound(player);
      setAuthToken('');
    } catch (e: unknown) {
      setBindError(e instanceof Error ? e.message : '操作失败，请稍后再试');
    } finally {
      setBinding(false);
    }
  }, [authToken, skinModel, isUpdate, onBound]);

  return (
    <Card
      title={
        <Space>
          {isUpdate ? <SwapOutlined /> : <LinkOutlined />}
          {isUpdate ? '修改绑定的 Minecraft 账号' : '绑定 Minecraft 账号'}
        </Space>
      }
      variant="outlined"
    >
      {!isUpdate && (
        <Alert
          type="info"
          showIcon
          message="绑定您的 Minecraft 账号"
          description="为确保账号所有权，请启动 Minecraft 并加入服务器 auth.aristois.net，您将被踢出并获得一个 6 位验证码。将验证码填入下方即可完成绑定。"
          style={{ marginBottom: 20 }}
        />
      )}
      {isUpdate && (
        <Alert
          type="info"
          showIcon
          message="更换绑定的 Minecraft 账号"
          description="请启动 Minecraft 并使用新的账号加入服务器 auth.aristois.net，获取 6 位验证码并填入下方。"
          style={{ marginBottom: 20 }}
        />
      )}
      {bindError && (
        <Alert
          type="error"
          message={bindError}
          closable
          onClose={() => setBindError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 6 }}>
          <Text strong>Aristois 验证码</Text>
        </div>
        <Input
          size="large"
          prefix={<CheckCircleOutlined />}
          placeholder="输入 6 位验证码"
          value={authToken}
          onChange={(e) => setAuthToken(e.target.value)}
          maxLength={6}
          allowClear
        />
      </div>

      {!isUpdate && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 6 }}>
            <Text strong>皮肤模型</Text>
          </div>
          <Radio.Group value={skinModel} onChange={(e) => setSkinModel(e.target.value)}>
            <Radio.Button value="default">Classic / Steve</Radio.Button>
            <Radio.Button value="slim">Slim / Alex</Radio.Button>
          </Radio.Group>
        </div>
      )}

      <Button
        type="primary"
        icon={isUpdate ? <SwapOutlined /> : <LinkOutlined />}
        size="large"
        disabled={authToken.trim().length !== 6}
        loading={binding}
        onClick={handleBind}
      >
        {isUpdate ? '确认修改账号' : '验证并绑定账号'}
      </Button>
    </Card>
  );
}
