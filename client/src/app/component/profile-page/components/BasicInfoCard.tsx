'use client';

import React from 'react';
import {
  Card,
  Descriptions,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  ClockCircleOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import type { PortalUser } from '@/lib/auth';
import { formatTime, getGroupTagColor } from '../utils/profileUtils';

const { Text } = Typography;

interface BasicInfoCardProps {
  user: PortalUser;
  displayName: string;
  email: string;
  groups: string[];
}

export default function BasicInfoCard({
  user,
  displayName,
  email,
  groups,
}: BasicInfoCardProps) {
  return (
    <Card
      title={
        <Space>
          <IdcardOutlined style={{ color: '#1677ff' }} />
          <span>账号基本信息</span>
        </Space>
      }
      style={{ height: '100%' }}
    >
      <Descriptions
        column={1}
        size="middle"
        bordered
        styles={{ label: { width: 140, fontWeight: 500, background: '#fafafa' } }}
      >
        <Descriptions.Item label="用户名称">
          <Text strong>{displayName}</Text>
        </Descriptions.Item>

        <Descriptions.Item label="电子邮箱">
          <Text copyable>{email}</Text>
        </Descriptions.Item>

        <Descriptions.Item label="所属组 (Microsoft)">
          {groups.length > 0 ? (
            <Space wrap size={[0, 6]}>
              {groups.map((grp) => (
                <Tag key={grp} color={getGroupTagColor(grp, user)}>
                  {grp}
                </Tag>
              ))}
            </Space>
          ) : (
            <Text type="secondary">（微软组织中未分配组 / 未配置 SAML 组声明）</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Portal 用户 ID">
          <Text copyable code style={{ fontSize: 12 }}>
            {user.uuid}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item label="注册时间">
          <Space size={4}>
            <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
            <span>{formatTime(user.created_at)}</span>
          </Space>
        </Descriptions.Item>

        <Descriptions.Item label="最近登录">
          <Space size={4}>
            <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
            <span>{formatTime(user.last_login_at)}</span>
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
