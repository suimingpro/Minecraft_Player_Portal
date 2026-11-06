'use client';

import '@ant-design/v5-patch-for-react-19';


import React, {
  useEffect,
  useState,
} from 'react';

import {
  Avatar,
  Dropdown,
  Layout,
  Space,
  Spin,
  Typography,
} from 'antd';

import type { MenuProps } from 'antd';

import {
  DownOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';

import Image from 'next/image';

import {
  useRouter,
} from 'next/navigation';

import NevigateBar
  from './component/nevigate-bar/nevigation-bar';

import DashBoard
  from './component/main-page/DashBoard';

import SkinPage
  from './component/skin-page/SkinPage';
import ServerPage
  from './component/server-page/ServerPage';
import ProfilePage
  from './component/profile-page/ProfilePage';
import AdminPage
  from './component/admin-page/AdminPage';
import ErrorBoundary from './component/ErrorBoundary';

import {
  Footer,
} from './component/footer/footer';

import {
  getCurrentUser,
  logout,
  type PortalUser,
} from '@/lib/auth';
import { useAppConfig } from '@/lib/config';


const {
  Header,
  Content,
} = Layout;

const {
  Text,
} = Typography;


export default function Home() {
  const { appName } = useAppConfig();
  const router = useRouter();

  const [select, setSelect] =
    useState(['home']);

  const [user, setUser] =
    useState<PortalUser | null>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [logoError, setLogoError] =
    useState(false);


  // =========================================================
  // Check authentication
  // =========================================================

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const currentUser =
          await getCurrentUser();

        // 没有登录
        if (!currentUser) {
          router.replace('/login');
          return;
        }

        setUser(currentUser);

      } catch (error) {
        console.error(
          'Authentication check failed:',
          error,
        );

        router.replace('/login');

      } finally {
        setAuthLoading(false);
      }
    };

    // Check URL tab query param
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['home', 'skin', 'server', 'profile', 'admin'].includes(tab)) {
        setSelect([tab]);
      }
    }

    checkAuthentication();

  }, [router]);


  // =========================================================
  // User dropdown
  // =========================================================

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    ...(user?.is_admin
      ? [
          {
            key: 'admin',
            icon: <SettingOutlined />,
            label: '管理面板',
          },
        ]
      : []),
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
    },
  ];


  // =========================================================
  // User menu handler
  // =========================================================

const handleUserMenuClick:
  MenuProps['onClick'] =
  ({ key }) => {

    if (key === 'profile') {
      setSelect(['profile']);
      return;
    }

    if (key === 'admin') {
      if (!user?.is_admin) {
        return;
      }
      setSelect(['admin']);
      return;
    }

    if (key === 'logout') {
      logout();
      return;
    }
  };


  // =========================================================
  // Checking login state
  // =========================================================

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#f5f5f5',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }


  // redirect 到 /login 期间不要显示页面
  if (!user) {
    return null;
  }


  // =========================================================
  // Display values
  // =========================================================

  const username =
    user.name ||
    user.email ||
    'Microsoft User';

  const avatarText =
    username
      .charAt(0)
      .toUpperCase();

  // DiceBear initials avatar — 和微软 M365 头像风格一致
  const avatarUrl =
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}&backgroundColor=0078d4&radius=50&fontSize=40`;


  // =========================================================
  // Main UI
  // =========================================================

  return (
    <Layout
      style={{
        minHeight: '100vh',
      }}
    >
      {/* 顶部栏 */}
      <Header
        style={{
          height: 64,
          padding: '0 24px',
          background: '#001529',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          overflow: 'hidden',
        }}
      >

        {/* 左边 Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              minWidth: 36,
              minHeight: 36,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderRadius: 6,
            }}
          >
            {!logoError ? (
              <Image
                src="/logo.png"
                alt={`${appName} Logo`}
                width={36}
                height={36}
                style={{ objectFit: 'contain', width: 36, height: 36 }}
                onError={() => setLogoError(true)}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 18,
                  userSelect: 'none',
                }}
              >
                {appName.charAt(0) || 'M'}
              </div>
            )}
          </div>

          <span
            style={{
              color: '#fff',
              fontSize: 20,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {appName}
          </span>
        </div>


        {/* 右边用户 Dropdown */}
        <Dropdown
          menu={{
            items: userMenuItems,
            onClick: handleUserMenuClick,
          }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Space
            size={10}
            style={{
              cursor: 'pointer',
              height: '100%',
            }}
          >

            <Avatar
              size={34}
              src={avatarUrl}
              onError={() => {
                // fallback 到首字母
                return false;
              }}
            >
              {avatarText}
            </Avatar>


            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                lineHeight: 1.25,
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 15,
                }}
              >
                {username}
              </Text>

              {user.email && (
                <Text
                  style={{
                    color:
                      'rgba(255,255,255,0.65)',
                    fontSize: 11,
                  }}
                >
                  {user.email}
                </Text>
              )}
            </div>


            <DownOutlined
              style={{
                color: '#fff',
                fontSize: 11,
              }}
            />

          </Space>
        </Dropdown>

      </Header>


      {/* Header 下方 */}
      <Layout hasSider style={{ minHeight: 'calc(100vh - 64px)' }}>

        {/* 左侧导航栏 */}
        <NevigateBar
          setSelect={setSelect}
          select={select}
        />

        {/* 右侧区域 */}
        <Layout style={{ minHeight: 'calc(100vh - 64px)', background: '#f5f5f5' }}>

          <Content
            style={{
              background: '#f5f5f5',
              minWidth: 0,
            }}
          >
            {select.includes('home') && (
              <DashBoard user={user} />
            )}

            {select.includes('skin') && (
              <ErrorBoundary fallbackTitle="皮肤页面加载出错">
                <SkinPage />
              </ErrorBoundary>
            )}

            {select.includes('server') && (
              <ErrorBoundary fallbackTitle="服务器页面加载出错">
                <ServerPage user={user} />
              </ErrorBoundary>
            )}

            {select.includes('profile') && (
              <ErrorBoundary fallbackTitle="个人资料页面加载出错">
                <ProfilePage
                  user={user}
                  onNavigateTab={(tab) => setSelect([tab])}
                  onUserUpdate={(updated) => setUser(updated)}
                />
              </ErrorBoundary>
            )}

            {select.includes('admin') && (
              <ErrorBoundary fallbackTitle="管理面板加载出错">
                <AdminPage
                  user={user}
                  onNavigateTab={(tab) => setSelect([tab])}
                />
              </ErrorBoundary>
            )}
          </Content>

          <Footer />

        </Layout>

      </Layout>

    </Layout>
  );
}