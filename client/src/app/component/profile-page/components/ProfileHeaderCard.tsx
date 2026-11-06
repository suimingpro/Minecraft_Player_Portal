'use client';

import React from 'react';
import {
  Avatar,
  Badge,
  Card,
  Col,
  Row,
  Tag,
  Typography,
} from 'antd';
import {
  MailOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { PortalUser } from '@/lib/auth';
import { getGroupTagColor } from '../utils/profileUtils';

const { Title, Text } = Typography;

interface ProfileHeaderCardProps {
  user: PortalUser;
  displayName: string;
  email: string;
  groups: string[];
}

export default function ProfileHeaderCard({
  user,
  displayName,
  email,
  groups,
}: ProfileHeaderCardProps) {
  const avatarUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
    displayName,
  )}&backgroundColor=0078d4&radius=50&fontSize=40`;

  return (
    <Card
      style={{
        marginBottom: 20,
        background: 'linear-gradient(135deg, #ffffff 0%, #f9fbff 100%)',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      <Row align="middle" gutter={[24, 16]}>
        <Col xs={24} sm={6} md={4} style={{ textAlign: 'center' }}>
          <Avatar
            size={88}
            src={avatarUrl}
            style={{
              boxShadow: '0 4px 12px rgba(0, 120, 212, 0.25)',
              border: '3px solid #fff',
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
        </Col>

        <Col xs={24} sm={18} md={20}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Title level={3} style={{ margin: 0 }}>
                {displayName}
              </Title>
              <Badge
                status="success"
                text={<Text type="secondary" style={{ fontSize: 13 }}>微软认证在线</Text>}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text type="secondary" copyable={{ text: email }}>
                <MailOutlined style={{ marginRight: 4 }} />
                {email}
              </Text>
            </div>

            {/* 所属组 (Microsoft Groups) */}
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <TeamOutlined style={{ color: '#8c8c8c', marginRight: 2 }} />
              <Text type="secondary" style={{ fontSize: 13, marginRight: 4 }}>
                所属组 (Microsoft)：
              </Text>
              {groups.length > 0 ? (
                groups.map((grp) => (
                  <Tag
                    key={grp}
                    color={getGroupTagColor(grp, user)}
                    style={{
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {grp}
                  </Tag>
                ))
              ) : (
                <Tag color="default" style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4 }}>
                  无 (未配置组映射)
                </Tag>
              )}
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
}
