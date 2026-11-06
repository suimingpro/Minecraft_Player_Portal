'use client';

import React from 'react';
import { Card, Descriptions, Divider, Image, Tag, Typography } from 'antd';
import { SkinOutlined } from '@ant-design/icons';
import type { PlayerProfile } from '@/lib/auth';
import SkinViewer from '../SkinViewer';
import { FALLBACK_SKIN } from '../utils/textureUtils';

const { Title, Text } = Typography;

interface PlayerCardProps {
  player: PlayerProfile;
}

export default function PlayerCard({ player }: PlayerCardProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top: 3D rotating skin viewer */}
      <Card
        variant="outlined"
        style={{ background: '#1a1a2e', overflow: 'hidden' }}
        styles={{
          body: {
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          },
        }}
      >
        <SkinViewer
          skinUrl={player.skin_url}
          capeUrl={player.cape_url}
          width={220}
          height={360}
        />
        <div style={{ textAlign: 'center' }}>
          <Title level={5} style={{ marginBottom: 4, color: '#fff' }}>
            {player.minecraft_username ?? '(未设置用户名)'}
          </Title>
          <Tag color={player.skin_model === 'slim' ? 'blue' : 'default'} icon={<SkinOutlined />}>
            {player.skin_model === 'slim' ? 'Slim / Alex' : 'Classic / Steve'}
          </Tag>
        </div>
      </Card>

      {/* Bottom: avatar head + metadata */}
      <Card variant="outlined">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 8,
              overflow: 'hidden',
              background: '#f0f0f0',
              border: '1px solid #e8e8e8',
              flexShrink: 0,
            }}
          >
            <Image
              src={
                player.player_uuid
                  ? `https://crafthead.net/helm/${player.player_uuid.replace(/-/g, '')}/64`
                  : (player.minecraft_username
                    ? `https://crafthead.net/helm/${player.minecraft_username}/64`
                    : FALLBACK_SKIN)
              }
              alt="Avatar"
              width={64}
              height={64}
              fallback={FALLBACK_SKIN}
              preview={false}
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <div>
            <Title level={5} style={{ marginBottom: 2 }}>
              {player.minecraft_username ?? '(未设置用户名)'}
            </Title>
            <Tag color={player.skin_model === 'slim' ? 'blue' : 'default'} icon={<SkinOutlined />}>
              {player.skin_model === 'slim' ? 'Slim / Alex' : 'Classic / Steve'}
            </Tag>
          </div>
        </div>
        <Divider style={{ margin: '0 0 12px' }} />
        <Descriptions
          column={1}
          size="small"
          items={[
            {
              key: 'uuid',
              label: 'Player UUID',
              children: player.player_uuid ? (
                <Text copyable code style={{ fontSize: 11 }}>
                  {player.player_uuid}
                </Text>
              ) : (
                <Text type="secondary">—</Text>
              ),
            },
            {
              key: 'skin',
              label: 'Skin URL',
              children: player.skin_url ? (
                <Text ellipsis copyable style={{ fontSize: 11, maxWidth: 200 }}>
                  {player.skin_url}
                </Text>
              ) : (
                <Text type="secondary">—</Text>
              ),
            },
            {
              key: 'cape',
              label: 'Cape URL',
              children: player.cape_url ? (
                <Text ellipsis copyable style={{ fontSize: 11, maxWidth: 200 }}>
                  {player.cape_url}
                </Text>
              ) : (
                <Text type="secondary">—</Text>
              ),
            },
            {
              key: 'updated',
              label: '最后更新',
              children: player.updated_at
                ? new Date(player.updated_at).toLocaleString('zh-CN')
                : '—',
            },
          ]}
        />
      </Card>
    </div>
  );
}
