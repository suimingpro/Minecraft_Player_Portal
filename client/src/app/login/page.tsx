'use client';

import '@ant-design/v5-patch-for-react-19';


import React, {
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  Button,
  Card,
  Spin,
  Typography,
} from 'antd';

import {
  WindowsOutlined,
} from '@ant-design/icons';

import {
  useRouter,
  useSearchParams,
} from 'next/navigation';

import {
  getCurrentUser,
  loginWithMicrosoft,
} from '@/lib/auth';
import { useAppConfig } from '@/lib/config';


const {
  Title,
  Text,
} = Typography;


function LoginForm() {
  const { appName } = useAppConfig();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [checkingLogin, setCheckingLogin] =
    useState(true);

  const error =
    searchParams.get('error');


  useEffect(() => {
    const checkLogin = async () => {
      try {
        const user =
          await getCurrentUser();

        // Already logged in
        if (user) {
          router.replace('/');
          return;
        }

      } catch (error) {
        console.error(
          'Failed to check login status:',
          error
        );
      }

      setCheckingLogin(false);
    };

    checkLogin();

  }, [router]);


  const handleMicrosoftLogin = () => {
    loginWithMicrosoft();
  };


  if (checkingLogin) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#f5f5f5',
        }}
      >
        <Spin size="large" />
      </main>
    );
  }


  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f5f5f5',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 12,
          boxShadow:
            '0 8px 24px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          <Title
            level={2}
            style={{
              marginBottom: 8,
            }}
          >
            {appName}
          </Title>

          <Text type="secondary">
            Sign in to your account
          </Text>
        </div>


        {error && (
          <Alert
            type="error"
            showIcon
            message="Microsoft sign-in failed"
            description={error}
            style={{
              marginBottom: 24,
            }}
          />
        )}


        <Button
          type="primary"
          size="large"
          block
          icon={
            <WindowsOutlined />
          }
          onClick={
            handleMicrosoftLogin
          }
          style={{
            height: 48,
            fontSize: 16,
          }}
        >
          Sign in with Microsoft
        </Button>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div>}>
      <LoginForm />
    </React.Suspense>
  );
}
