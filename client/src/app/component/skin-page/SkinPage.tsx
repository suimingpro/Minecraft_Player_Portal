'use client';

import '@ant-design/v5-patch-for-react-19';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Row,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import {
  ReloadOutlined,
  SkinOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  getMyPlayer,
  type PlayerProfile,
} from '@/lib/auth';
import PlayerCard from './components/PlayerCard';
import BindForm from './components/BindForm';
import SkinEditForm from './components/SkinEditForm';

const { Title, Text } = Typography;

export default function SkinPage() {
  const [player, setPlayer] = useState<PlayerProfile | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPlayer = useCallback(async () => {
    setPlayer(undefined);
    setLoadError(null);
    try {
      const p = await getMyPlayer();
      setPlayer(p);
    } catch {
      setLoadError('加载玩家数据失败，请刷新重试');
      setPlayer(null);
    }
  }, []);

  useEffect(() => {
    loadPlayer();
  }, [loadPlayer]);

  const isLoading = player === undefined;

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 20 }}
        items={[{ title: 'Home' }, { title: 'Skin' }]}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Space>
          <UserOutlined style={{ fontSize: 20 }} />
          <Title level={4} style={{ margin: 0 }}>
            我的玩家档案
          </Title>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={loadPlayer} loading={isLoading}>
          刷新
        </Button>
      </div>

      {loadError && (
        <Alert type="error" message={loadError} style={{ marginBottom: 16 }} />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={24} md={10} lg={8}>
          {isLoading ? (
            <Card>
              <Skeleton active avatar paragraph={{ rows: 6 }} />
            </Card>
          ) : player ? (
            <PlayerCard player={player} />
          ) : (
            <Card variant="outlined" style={{ textAlign: 'center', padding: '40px 0' }}>
              <SkinOutlined style={{ fontSize: 48, color: '#bfbfbf', marginBottom: 12 }} />
              <br />
              <Text type="secondary">尚未绑定玩家</Text>
            </Card>
          )}
        </Col>

        <Col xs={24} sm={24} md={14} lg={16}>
          {isLoading ? (
            <Card>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          ) : player ? (
            <>
              <SkinEditForm player={player} onSaved={setPlayer} />
              <BindForm onBound={setPlayer} isUpdate={true} />
            </>
          ) : (
            <BindForm onBound={setPlayer} />
          )}
        </Col>
      </Row>
    </div>
  );
}

