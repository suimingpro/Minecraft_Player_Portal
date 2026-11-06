'use client';

// Must be the first import in this file so the patch runs
// before any antd component is instantiated on the client.
import '@ant-design/v5-patch-for-react-19';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from '@/lib/config';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider>
        {children}
      </ConfigProvider>
    </AntdRegistry>
  );
}
