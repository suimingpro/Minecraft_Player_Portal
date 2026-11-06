'use client';

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Col,
  Row,
  Spin,
  Typography,
} from 'antd';
import {
  CloudServerOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  getPublicServers,
  MinecraftServer,
  PortalUser,
} from '@/lib/auth';
import ServerCard from './components/ServerCard';
import ServerEmptyState from './components/ServerEmptyState';

const { Title, Text } = Typography;

interface ServerPageProps {
  user: PortalUser | null;
}

export default function ServerPage({ user }: ServerPageProps) {
  const [servers, setServers] = useState<MinecraftServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPublicServers();
      setServers(data);
    } catch (err: unknown) {
      setError((err as Error).message || '获取服务器列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1f1f1f' }}>
            <CloudServerOutlined style={{ marginRight: 10, color: '#1677ff' }} />
            游戏服务器
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            浏览社区可用服务器列表、连接地址及你的进服白名单状态
          </Text>
        </div>

        <Button
          icon={<ReloadOutlined />}
          onClick={fetchServers}
          loading={loading}
          size="middle"
        >
          刷新状态
        </Button>
      </div>

      {error && (
        <Alert
          type="error"
          message="加载错误"
          description={error}
          showIcon
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 14, color: '#8c8c8c', fontSize: 14 }}>
            正在加载服务器列表与白名单状态...
          </div>
        </div>
      ) : servers.length === 0 ? (
        <ServerEmptyState />
      ) : (
        <Row gutter={[24, 24]}>
          {servers.map((server) => (
            <Col xs={24} md={12} key={server.id}>
              <ServerCard server={server} user={user} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}

