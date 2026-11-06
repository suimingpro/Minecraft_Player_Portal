'use client';

import React from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import {
  CloudServerOutlined,
  SkinOutlined,
  TagsOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { AdminStats } from '@/lib/auth';

interface AdminStatsCardsProps {
  stats: AdminStats | null;
  serversCount: number;
  mappingsCount: number;
}

export const AdminStatsCards: React.FC<AdminStatsCardsProps> = ({
  stats,
  serversCount,
  mappingsCount,
}) => {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
      <Col xs={24} sm={12} md={6}>
        <Card variant="borderless" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <Statistic
            title="已注册用户"
            value={stats?.total_users ?? 0}
            prefix={<UserOutlined style={{ color: '#1677ff' }} />}
            suffix="人"
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card variant="borderless" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <Statistic
            title="已绑定角色"
            value={stats?.total_players ?? 0}
            prefix={<SkinOutlined style={{ color: '#52c41a' }} />}
            suffix="个"
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card variant="borderless" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <Statistic
            title="配置服务器数"
            value={serversCount}
            prefix={<CloudServerOutlined style={{ color: '#fa8c16' }} />}
            suffix="个"
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card variant="borderless" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <Statistic
            title="组映射规则"
            value={mappingsCount}
            prefix={<TagsOutlined style={{ color: '#722ed1' }} />}
            suffix="条"
          />
        </Card>
      </Col>
    </Row>
  );
};

export default AdminStatsCards;
