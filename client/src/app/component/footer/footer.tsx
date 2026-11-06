'use client';

import { Layout } from 'antd';
import { useAppConfig } from '@/lib/config';

export function Footer() {
  const { Footer: AntFooter } = Layout;
  const { appName } = useAppConfig();
  return (
    <AntFooter style={{ textAlign: 'center' }}>
      {appName} ©{new Date().getFullYear()}
    </AntFooter>
  );
}
