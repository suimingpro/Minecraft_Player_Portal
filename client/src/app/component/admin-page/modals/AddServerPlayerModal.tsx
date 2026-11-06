'use client';

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
  SwapOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  addAdminServerPlayer,
  AdminUserData,
  batchAddAdminServerPlayers,
  GroupDetail,
  GroupMappingItem,
  MinecraftServer,
  removeAdminServerPlayerByUuid,
  ServerPlayerRule,
} from '@/lib/auth';

const { Text } = Typography;

interface RegisteredPlayerRow {
  key: string;
  user_uuid: string;
  player_uuid: string;
  minecraft_username: string;
  skin_url: string | null;
  user_email: string | null;
  user_display_name: string | null;
  groups: string[];
  group_details: GroupDetail[];
  currentRule: ServerPlayerRule | null;
  ruleStatus: 'whitelist' | 'blacklist' | 'none';
}

interface AddServerPlayerModalProps {
  open: boolean;
  server: MinecraftServer | null;
  users: AdminUserData[];
  mappings: GroupMappingItem[];
  serverRules: ServerPlayerRule[];
  onClose: () => void;
  onRulesChanged: () => Promise<void> | void;
}

export const AddServerPlayerModal: React.FC<AddServerPlayerModalProps> = ({
  open,
  server,
  users,
  mappings,
  serverRules,
  onClose,
  onRulesChanged,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('not_in_rule');
  const [selectedPlayerKeys, setSelectedPlayerKeys] = useState<React.Key[]>([]);
  const [batchAdding, setBatchAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'registered' | 'manual'>('registered');

  const [manualForm] = Form.useForm();
  const [addingManual, setAddingManual] = useState(false);

  // Compute all registered players with their rule status for the current selected server
  const serverPlayersList: RegisteredPlayerRow[] = useMemo(() => {
    if (!server) return [];

    const ruleMap = new Map<string, ServerPlayerRule>();
    for (const r of serverRules) {
      if (r.player_uuid) {
        ruleMap.set(r.player_uuid.toLowerCase(), r);
      }
    }

    return users
      .filter((u) => u.player && u.player.player_uuid)
      .map((u) => {
        const p = u.player!;
        const puuid = p.player_uuid!.toLowerCase();
        const currentRule = ruleMap.get(puuid);
        return {
          key: puuid,
          user_uuid: u.uuid,
          player_uuid: p.player_uuid!,
          minecraft_username: p.minecraft_username || '未知玩家',
          skin_url: p.skin_url,
          user_email: u.email,
          user_display_name: u.display_name,
          groups: u.groups || [],
          group_details: u.group_details || [],
          currentRule: currentRule || null,
          ruleStatus: currentRule
            ? (currentRule.rule_type as 'whitelist' | 'blacklist')
            : 'none',
        };
      });
  }, [users, serverRules, server]);

  // Filtered players based on search keyword, group, and rule status
  const filteredServerPlayers = useMemo(() => {
    return serverPlayersList.filter((item) => {
      // 1. Status Filter
      if (statusFilter === 'not_in_rule' && item.ruleStatus !== 'none') {
        return false;
      }
      if (statusFilter === 'in_rule' && item.ruleStatus === 'none') {
        return false;
      }
      if (statusFilter === 'in_whitelist' && item.ruleStatus !== 'whitelist') {
        return false;
      }
      if (statusFilter === 'in_blacklist' && item.ruleStatus !== 'blacklist') {
        return false;
      }

      // 2. Group Filter
      if (groupFilter !== 'all') {
        if (groupFilter === '__none__') {
          if (item.groups.length > 0) return false;
        } else if (!item.groups.includes(groupFilter)) {
          return false;
        }
      }

      // 3. Search Keyword
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const matchName = item.minecraft_username.toLowerCase().includes(kw);
        const matchUuid = item.player_uuid.toLowerCase().includes(kw);
        const matchEmail = (item.user_email || '').toLowerCase().includes(kw);
        const matchDisplayName = (item.user_display_name || '').toLowerCase().includes(kw);
        if (!matchName && !matchUuid && !matchEmail && !matchDisplayName) {
          return false;
        }
      }

      return true;
    });
  }, [serverPlayersList, statusFilter, groupFilter, searchKeyword]);

  // Batch Add Players
  const handleBatchAdd = async (ruleType: 'whitelist' | 'blacklist') => {
    if (!server) return;
    if (selectedPlayerKeys.length === 0) {
      message.warning('请先勾选需要添加的玩家');
      return;
    }

    try {
      setBatchAdding(true);
      const playersToAdd = selectedPlayerKeys.map((key) => {
        const item = serverPlayersList.find((p) => p.key === key);
        return {
          player_uuid: String(key),
          player_name: item?.minecraft_username || null,
          rule_type: ruleType,
        };
      });

      await batchAddAdminServerPlayers(server.id, playersToAdd);
      message.success(
        `已成功批量将 ${playersToAdd.length} 名玩家加入${
          ruleType === 'whitelist' ? '白名单' : '黑名单'
        }`
      );
      setSelectedPlayerKeys([]);
      await onRulesChanged();
    } catch (err: unknown) {
      message.error((err as Error).message || '批量添加玩家失败');
    } finally {
      setBatchAdding(false);
    }
  };

  // Add / Switch single player rule
  const handleAddSinglePlayer = async (
    playerUuid: string,
    playerName: string,
    ruleType: 'whitelist' | 'blacklist'
  ) => {
    if (!server) return;
    try {
      await addAdminServerPlayer(server.id, playerUuid, playerName, ruleType);
      message.success(
        `已将玩家【${playerName}】加入${ruleType === 'whitelist' ? '白名单' : '黑名单'}`
      );
      await onRulesChanged();
    } catch (err: unknown) {
      message.error((err as Error).message || '操作失败');
    }
  };

  // Remove single player from rules by UUID
  const handleRemoveSinglePlayerByUuid = async (
    playerUuid: string,
    playerName: string
  ) => {
    if (!server) return;
    try {
      await removeAdminServerPlayerByUuid(server.id, playerUuid);
      message.success(`已将玩家【${playerName}】从名单移除`);
      await onRulesChanged();
    } catch (err: unknown) {
      message.error((err as Error).message || '移除失败');
    }
  };

  // Manual Add Player Rule submit (for offline / unregistered UUIDs)
  const handleManualAddSubmit = async (values: any) => {
    if (!server) return;
    try {
      setAddingManual(true);
      await addAdminServerPlayer(
        server.id,
        values.player_uuid,
        values.player_name,
        values.rule_type
      );
      message.success('已成功添加玩家规则');
      manualForm.resetFields();
      await onRulesChanged();
    } catch (err: unknown) {
      message.error((err as Error).message || '添加玩家失败');
    } finally {
      setAddingManual(false);
    }
  };

  const addPlayerColumns: ColumnsType<RegisteredPlayerRow> = [
    {
      title: '玩家信息',
      key: 'player',
      width: 200,
      render: (_, record) => (
        <Space size={10}>
          <Avatar
            shape="square"
            size={36}
            src={`https://minotar.net/helm/${encodeURIComponent(record.minecraft_username)}/36`}
            icon={<UserOutlined />}
            style={{ borderRadius: 6, flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {record.minecraft_username}
            </div>
            <Text
              copyable={{ text: record.player_uuid }}
              type="secondary"
              style={{ fontSize: 11 }}
            >
              {record.player_uuid.slice(0, 8)}...
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '关联门户账号',
      key: 'user',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            {record.user_display_name || '未填写真实姓名'}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.user_email || '无邮箱'}
          </Text>
        </div>
      ),
    },
    {
      title: '所属组',
      key: 'groups',
      width: 170,
      render: (_, record) => {
        const details = record.group_details;
        if (details && details.length > 0) {
          return (
            <Space wrap size={[2, 4]}>
              {details.map((g) => (
                <Tag
                  key={g.id || g.name}
                  color={g.color || 'blue'}
                  style={{ borderRadius: 4, fontSize: 11, marginRight: 0 }}
                >
                  {g.name}
                </Tag>
              ))}
            </Space>
          );
        }
        if (!record.groups || record.groups.length === 0) {
          return (
            <Text type="secondary" style={{ fontSize: 12 }}>
              无分组
            </Text>
          );
        }
        return (
          <Space wrap size={[2, 4]}>
            {record.groups.map((gid) => (
              <Tag
                key={gid}
                color="blue"
                style={{ borderRadius: 4, fontSize: 11, marginRight: 0 }}
              >
                {gid.slice(0, 8)}...
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '当前在服状态',
      key: 'ruleStatus',
      width: 120,
      render: (_, record) => {
        if (record.ruleStatus === 'whitelist') {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              已在白名单
            </Tag>
          );
        }
        if (record.ruleStatus === 'blacklist') {
          return (
            <Tag color="error" icon={<StopOutlined />}>
              已在黑名单
            </Tag>
          );
        }
        return <Tag color="default">未添加</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 170,
      render: (_, record) => {
        if (record.ruleStatus === 'whitelist') {
          return (
            <Space size={6}>
              <Button
                size="small"
                icon={<SwapOutlined />}
                onClick={() =>
                  handleAddSinglePlayer(
                    record.player_uuid,
                    record.minecraft_username,
                    'blacklist'
                  )
                }
              >
                改黑名单
              </Button>
              <Popconfirm
                title="确定从名单移除？"
                onConfirm={() =>
                  handleRemoveSinglePlayerByUuid(
                    record.player_uuid,
                    record.minecraft_username
                  )
                }
                okText="确定"
                cancelText="取消"
              >
                <Button size="small" danger icon={<DeleteOutlined />}>
                  移除
                </Button>
              </Popconfirm>
            </Space>
          );
        }
        if (record.ruleStatus === 'blacklist') {
          return (
            <Space size={6}>
              <Button
                size="small"
                icon={<SwapOutlined />}
                onClick={() =>
                  handleAddSinglePlayer(
                    record.player_uuid,
                    record.minecraft_username,
                    'whitelist'
                  )
                }
              >
                改白名单
              </Button>
              <Popconfirm
                title="确定从名单移除？"
                onConfirm={() =>
                  handleRemoveSinglePlayerByUuid(
                    record.player_uuid,
                    record.minecraft_username
                  )
                }
                okText="确定"
                cancelText="取消"
              >
                <Button size="small" danger icon={<DeleteOutlined />}>
                  移除
                </Button>
              </Popconfirm>
            </Space>
          );
        }
        return (
          <Space size={6}>
            <Button
              size="small"
              type="primary"
              ghost
              icon={<CheckCircleOutlined />}
              onClick={() =>
                handleAddSinglePlayer(
                  record.player_uuid,
                  record.minecraft_username,
                  'whitelist'
                )
              }
            >
              + 白名单
            </Button>
            <Button
              size="small"
              danger
              ghost
              icon={<StopOutlined />}
              onClick={() =>
                handleAddSinglePlayer(
                  record.player_uuid,
                  record.minecraft_username,
                  'blacklist'
                )
              }
            >
              + 黑名单
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserAddOutlined style={{ color: '#1677ff', fontSize: 18 }} />
          <span>添加玩家到服务器名单 -【{server?.name || ''}】</span>
        </div>
      }
      open={open}
      onCancel={() => {
        onClose();
        setSelectedPlayerKeys([]);
      }}
      footer={[
        <Button
          key="close"
          type="primary"
          onClick={() => {
            onClose();
            setSelectedPlayerKeys([]);
          }}
        >
          完成
        </Button>,
      ]}
      width={980}
      destroyOnHidden
      afterOpenChange={(isOpen) => {
        if (isOpen) {
          setSelectedPlayerKeys([]);
          setSearchKeyword('');
          setGroupFilter('all');
          setStatusFilter('not_in_rule');
          setActiveTab('registered');
        }
      }}
    >
      <div style={{ marginTop: 8 }}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <span>
              当前服务器限制模式：
              <strong>
                {server?.access_mode === 'whitelist'
                  ? '白名单模式（仅白名单内玩家可进入）'
                  : server?.access_mode === 'blacklist'
                  ? '黑名单模式（黑名单内玩家禁止进入）'
                  : '全部开放模式（名单作为预备规则）'}
              </strong>
              。在下方列表中可通过多维筛选定位玩家，并支持单行快捷添加或批量勾选添加。
            </span>
          }
        />

        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as 'registered' | 'manual')}
          items={[
            {
              key: 'registered',
              label: `已注册玩家列表 (${serverPlayersList.length} 人)`,
              children: (
                <div>
                  {/* Filters Bar */}
                  <Card
                    size="small"
                    style={{
                      marginBottom: 16,
                      backgroundColor: '#fafafa',
                      borderColor: '#f0f0f0',
                    }}
                  >
                    <Row gutter={[12, 12]} align="middle">
                      <Col xs={24} sm={10} md={9}>
                        <Input
                          placeholder="搜索玩家用户名 / UUID / 邮箱 / 姓名..."
                          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                          value={searchKeyword}
                          onChange={(e) => setSearchKeyword(e.target.value)}
                          allowClear
                        />
                      </Col>
                      <Col xs={12} sm={7} md={5}>
                        <Select
                          style={{ width: '100%' }}
                          value={groupFilter}
                          onChange={setGroupFilter}
                          placeholder="筛选所属组"
                          options={[
                            { value: 'all', label: '所有用户组' },
                            ...mappings.map((m) => ({
                              value: m.group_id,
                              label: m.group_name || m.group_id.slice(0, 8),
                            })),
                            { value: '__none__', label: '未加入任何组' },
                          ]}
                        />
                      </Col>
                      <Col xs={12} sm={7} md={6}>
                        <Select
                          style={{ width: '100%' }}
                          value={statusFilter}
                          onChange={setStatusFilter}
                          placeholder="在服名单状态"
                          options={[
                            { value: 'not_in_rule', label: '仅显示：未添加玩家' },
                            { value: 'all', label: '全部状态 (含已添加)' },
                            { value: 'in_rule', label: '仅显示：已在名单中' },
                            { value: 'in_whitelist', label: '仅显示：已在白名单' },
                            { value: 'in_blacklist', label: '仅显示：已在黑名单' },
                          ]}
                        />
                      </Col>
                      <Col xs={24} sm={24} md={4} style={{ textAlign: 'right' }}>
                        <Button
                          onClick={() => {
                            setSearchKeyword('');
                            setGroupFilter('all');
                            setStatusFilter('all');
                          }}
                        >
                          重置筛选
                        </Button>
                      </Col>
                    </Row>
                  </Card>

                  {/* Batch Action Toolbar */}
                  {selectedPlayerKeys.length > 0 && (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: '8px 16px',
                        background: '#e6f4ff',
                        border: '1px solid #91caff',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <Space>
                        <Text strong style={{ color: '#0958d9' }}>
                          已选中 {selectedPlayerKeys.length} 位玩家
                        </Text>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => setSelectedPlayerKeys([])}
                        >
                          取消全选
                        </Button>
                      </Space>
                      <Space>
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          loading={batchAdding}
                          onClick={() => handleBatchAdd('whitelist')}
                        >
                          批量加入白名单
                        </Button>
                        <Button
                          danger
                          icon={<StopOutlined />}
                          loading={batchAdding}
                          onClick={() => handleBatchAdd('blacklist')}
                        >
                          批量加入黑名单
                        </Button>
                      </Space>
                    </div>
                  )}

                  {/* Main Players Table */}
                  <Table
                    rowSelection={{
                      selectedRowKeys: selectedPlayerKeys,
                      onChange: setSelectedPlayerKeys,
                    }}
                    columns={addPlayerColumns}
                    dataSource={filteredServerPlayers}
                    rowKey="key"
                    pagination={{
                      defaultPageSize: 8,
                      showSizeChanger: true,
                      pageSizeOptions: ['8', '15', '30', '50'],
                      showTotal: (total) => `共 ${total} 位匹配玩家`,
                    }}
                    size="middle"
                    scroll={{ x: 800 }}
                  />
                </div>
              ),
            },
            {
              key: 'manual',
              label: '手动输入 / 离线玩家 UUID',
              forceRender: true,
              children: (
                <div style={{ maxWidth: 520, margin: '20px auto' }}>
                  <Alert
                    type="warning"
                    showIcon
                    message="手动添加离线或未注册玩家"
                    description="如果玩家尚未在门户网站注册，但已知其正版/离线 Minecraft UUID，可以在此处直接添加规则。"
                    style={{ marginBottom: 20 }}
                  />

                  <Form
                    key={server?.id || 'manual-rule-form'}
                    form={manualForm}
                    layout="vertical"
                    preserve={false}
                    initialValues={{
                      rule_type:
                        server?.access_mode === 'blacklist'
                          ? 'blacklist'
                          : 'whitelist',
                    }}
                    onFinish={handleManualAddSubmit}
                  >
                    <Form.Item
                      label="Minecraft 玩家 UUID"
                      name="player_uuid"
                      rules={[
                        { required: true, message: '请输入玩家 UUID' },
                        {
                          pattern: /^[0-9a-fA-F-]{32,36}$/,
                          message: '请输入有效的 32 或 36 位 UUID 格式',
                        },
                      ]}
                    >
                      <Input placeholder="例如: 02dd4fc6-8370-46f6-9c7a-2a5f2c87cec5" />
                    </Form.Item>

                    <Form.Item
                      label="Minecraft 玩家用户名"
                      name="player_name"
                      rules={[{ required: false }]}
                    >
                      <Input placeholder="例如: Steve（可选，便于标识）" />
                    </Form.Item>

                    <Form.Item
                      label="规则类型"
                      name="rule_type"
                      rules={[{ required: true, message: '请选择规则类型' }]}
                    >
                      <Radio.Group>
                        <Radio value="whitelist">白名单 (允许进入该服)</Radio>
                        <Radio value="blacklist">黑名单 (禁止进入该服)</Radio>
                      </Radio.Group>
                    </Form.Item>

                    <Form.Item style={{ marginTop: 24 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={addingManual}
                        icon={<PlusOutlined />}
                        block
                      >
                        添加该规则
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
};

export default AddServerPlayerModal;
