'use client';

import React, {
  Dispatch,
  SetStateAction,
  useState,
} from 'react';

import {
  HomeOutlined,
  SkinOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';

import type { MenuProps } from 'antd';
import { Layout, Menu } from 'antd';

const { Sider } = Layout;

const items: MenuProps['items'] = [
  {
    key: 'home',
    icon: <HomeOutlined />,
    label: 'Home',
  },
  {
    key: 'skin',
    icon: <SkinOutlined />,
    label: 'Skin',
  },
  {
    key: 'server',
    icon: <CloudServerOutlined />,
    label: 'Server',
  },
];

interface AppProps {
  setSelect: Dispatch<SetStateAction<string[]>>;
  select: string[];
}

export default function NevigateBar({
  setSelect,
  select,
}: AppProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
      width={180}
      collapsedWidth={64}
      style={{
        height: 'calc(100vh - 64px)',
        position: 'sticky',
        top: 64,
        left: 0,
        zIndex: 50,
        overflowY: 'auto',
        flexShrink: 0,
        background: '#001529',
      }}
    >
      <Menu
        theme="dark"
        mode="inline"
        items={items}
        selectedKeys={select}
        style={{
          paddingTop: 16,
          borderRight: 0,
        }}
        onSelect={({ key }) => {
          setSelect([key]);
        }}
        onClick={({ key }) => {
          setSelect([key]);
        }}
      />
    </Sider>
  );
}
