'use client';

import React from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  SkinOutlined,
} from '@ant-design/icons';
import type { PlayerProfile } from '@/lib/auth';

const { Text } = Typography;

interface MinecraftProfileCardProps {
  player?: PlayerProfile | null;
  onNavigateTab?: (tab: string) => void;
}

export default function MinecraftProfileCard({
  player,
  onNavigateTab,
}: MinecraftProfileCardProps) {
  return (
    <Card
      title={
        <Space>
          <SkinOutlined style={{ color: '#52c41a' }} />
          <span>Minecraft 游戏档案</span>
        </Space>
      }
      extra={
        onNavigateTab && (
          <Button
            type="link"
            size="small"
            onClick={() => onNavigateTab('skin')}
          >
            前往管理皮肤
          </Button>
        )
      }
      style={{ height: '100%' }}
    >
      {player ? (
        <Descriptions
          column={1}
          size="middle"
          bordered
          styles={{ label: { width: 140, fontWeight: 500, background: '#fafafa' } }}
        >
          <Descriptions.Item label="Minecraft 用户名">
            <Text strong copyable style={{ fontSize: 15, color: '#1677ff' }}>
              {player.minecraft_username || '(未设定)'}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label="玩家 UUID">
            <Text copyable code style={{ fontSize: 12 }}>
              {player.player_uuid || '无'}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label="皮肤版型">
            <Tag color={player.skin_model === 'slim' ? 'purple' : 'blue'}>
              {player.skin_model === 'slim' ? '纤细 (Slim / Alex)' : '经典 (Classic / Steve)'}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="皮肤材质">
            {player.skin_url ? (
              <Space>
                <Tag color="success">已自定义</Tag>
                <Typography.Link href={player.skin_url} target="_blank" rel="noopener noreferrer">
                  查看材质
                </Typography.Link>
              </Space>
            ) : (
              <Tag color="default">默认材质</Tag>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="披风材质">
            {player.cape_url ? (
              <Space>
                <Tag color="success">已装备</Tag>
                <Typography.Link href={player.cape_url} target="_blank" rel="noopener noreferrer">
                  查看披风
                </Typography.Link>
              </Space>
            ) : (
              <Tag color="default">无披风</Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
      ) : (
        <div style={{ padding: '16px 0' }}>
          <Alert
            type="info"
            showIcon
            message="尚未绑定 Minecraft 角色"
            description="绑定 Minecraft 账号后，您可在游戏中体验专属皮肤并在第三方服务器上完成验证。"
            action={
              onNavigateTab && (
                <Button
                  size="small"
                  type="primary"
                  onClick={() => onNavigateTab('skin')}
                >
                  去绑定
                </Button>
              )
            }
          />
        </div>
      )}
    </Card>
  );
}
