'use client';
import React, { useState } from 'react';
import {
  Breadcrumb, Card, Col, Row, Statistic,
  Typography, Button, Popconfirm, message,
} from 'antd';
import { PortalUser, API_BASE_URL, resetLauncherPassword } from '@/lib/auth';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  ApiOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

export default function DashBoard({ user }: { user: PortalUser | null }) {
  const { Text, Paragraph } = Typography;

  const [launcherPwd, setLauncherPwd] = useState<string | null>(
    user?.launcher_password ?? null
  );
  const [resetting, setResetting] = useState(false);
  const yggdrasilUrl = `${API_BASE_URL}/api/yggdrasil`;

  const handleResetPassword = async () => {
    setResetting(true);
    try {
      const newPwd = await resetLauncherPassword();
      setLauncherPwd(newPwd);
      message.success('独立密码已刷新！请重新在启动器中登录。');
    } catch (e: unknown) {
      message.error((e as Error).message ?? '刷新失败，请稍后重试');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 20 }}
        items={[{ title: 'Home' }]}
      />

      <Row gutter={[16, 16]}>

        {/* Launcher Login Info */}
        <Col xs={24} sm={24} md={24} lg={24}>
          <Card title="Minecraft 启动器登录信息" style={{ marginBottom: 16 }}>
            <Paragraph>
              您可以使用以下凭证在支持 <strong>Authlib-Injector</strong> 的启动器中登录您的账号：
            </Paragraph>
            <Paragraph>
              <strong>Yggdrasil 认证服务器：</strong>{' '}
              <Text copyable code>{yggdrasilUrl}</Text>
            </Paragraph>
            <Paragraph>
              <strong>邮箱 / 账号：</strong>{' '}
              <Text copyable>{user?.email ?? '(未知邮箱)'}</Text>
            </Paragraph>
            <Paragraph>
              <strong>独立密码：</strong>{' '}
              <Text copyable>{launcherPwd ?? '(暂无)'}</Text>
              <Popconfirm
                title="确认刷新密码？"
                description="刷新后旧密码将立即失效，启动器需重新登录。"
                onConfirm={handleResetPassword}
                okText="确认刷新"
                cancelText="取消"
              >
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  loading={resetting}
                  style={{ marginLeft: 8 }}
                >
                  刷新密码
                </Button>
              </Popconfirm>
            </Paragraph>
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              注：由于网站使用微软单点登录，所以为您随机生成了启动器专用密码。刷新后旧密码立即失效。
            </Paragraph>
            <div style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={<ApiOutlined />}
                href={`authlib-injector:yggdrasil-server:${encodeURIComponent(`${API_BASE_URL}/api/yggdrasil`)}`}
              >
                点住拖拽我到启动器一键导入
              </Button>
            </div>
          </Card>
        </Col>

        {/* Access */}
        <Col xs={24} sm={24} md={12} lg={8}>
          <Card title="Access" style={{ height: '100%' }}>
            <Statistic
              title="Accessible servers"
              value={0}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>

        {/* In progress */}
        <Col xs={24} sm={24} md={12} lg={8}>
          <Card title="In progress" style={{ height: '100%' }}>
            <Statistic
              title="Pending applications"
              value={0}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>

        {/* All server */}
        <Col xs={24} sm={24} md={12} lg={8}>
          <Card title="All server" style={{ height: '100%' }}>
            <Statistic
              title="Total servers"
              value={0}
              prefix={<CloudServerOutlined />}
            />
          </Card>
        </Col>

      </Row>
    </div>
  );
}
