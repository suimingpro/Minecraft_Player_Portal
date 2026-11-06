'use client'

import { Breadcrumb, Layout, Menu, MenuProps, theme } from "antd";
import Sider from "antd/es/layout/Sider";


export default function ServerList() {
    const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const chooseItems: MenuProps['items'] = [
    {
      key: '1',
      label: 'All Server',
    },
    {
      key: '2',
      label: 'Approved Server',
    },
    {
      key: '3',
      label: 'In Progress Server',
    },
  ];
  return (
    <div style={{ padding: '0 48px' }}>
        <Breadcrumb
          style={{ margin: '16px 0' }}
          items={[{ title: 'server' },]}
        />
        <Layout
          style={{ padding: '24px 0', background: colorBgContainer, borderRadius: borderRadiusLG }}
        >
          <Sider style={{ background: colorBgContainer }} width={200}>
            <Menu
              mode="inline"
              defaultSelectedKeys={['1']}
              style={{ height: '100%' }}
              items={chooseItems}
            />
          </Sider>
          {/* <Content style={{ padding: '0 24px', minHeight: 280 }}>Content</Content> */}
        </Layout>
      </div>
  );
}
