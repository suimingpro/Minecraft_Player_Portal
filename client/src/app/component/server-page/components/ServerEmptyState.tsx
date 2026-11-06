'use client';

import React from 'react';
import { Card, Empty, Typography } from 'antd';

const { Text } = Typography;

export default function ServerEmptyState() {
  return (
    <Card style={{ textAlign: 'center', padding: '40px 0', borderRadius: 12 }}>
      <Empty
        description={
          <div>
            <Text style={{ fontSize: 16, color: '#595959' }}>
              当前暂无可用的公开服务器
            </Text>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                管理员可在管理页面的“服务器管理”板块添加并配置公开服务器。
              </Text>
            </div>
          </div>
        }
      />
    </Card>
  );
}
