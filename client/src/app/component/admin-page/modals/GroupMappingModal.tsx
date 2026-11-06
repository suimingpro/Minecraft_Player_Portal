'use client';

import React, { useState } from 'react';
import { Form, Input, message, Modal, Tag, Typography } from 'antd';
import { GroupMappingItem, saveAdminGroupMapping } from '@/lib/auth';
import ColorPickerSelect from '../components/ColorPickerSelect';

const { Text } = Typography;

interface GroupMappingModalProps {
  open: boolean;
  editingMapping: GroupMappingItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const GroupMappingModal: React.FC<GroupMappingModalProps> = ({
  open,
  editingMapping,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [selectedColor, setSelectedColor] = useState('blue');
  const [previewName, setPreviewName] = useState('');

  const handleFinish = async (values: any) => {
    try {
      setSaving(true);
      await saveAdminGroupMapping(
        values.group_id,
        values.group_name,
        values.group_color
      );
      message.success(editingMapping ? '已更新组映射规则' : '已添加组映射规则');
      onClose();
      onSuccess();
    } catch (err: unknown) {
      message.error((err as Error).message || '保存组映射失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editingMapping ? '编辑组映射' : '添加组映射'}
      open={open}
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
      afterOpenChange={(isOpen) => {
        if (isOpen) {
          if (editingMapping) {
            const c = editingMapping.group_color || 'blue';
            setSelectedColor(c);
            setPreviewName(editingMapping.group_name || '');
          } else {
            setSelectedColor('blue');
            setPreviewName('');
          }
        }
      }}
    >
      <Form
        key={editingMapping ? `edit-${editingMapping.id}` : 'new-mapping'}
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        preserve={false}
        initialValues={{
          group_id: editingMapping?.group_id || '',
          group_name: editingMapping?.group_name || '',
          group_color: editingMapping?.group_color || 'blue',
        }}
        onFinish={handleFinish}
      >
        <Form.Item
          label="微软 Entra 组 Object ID (GUID)"
          name="group_id"
          rules={[
            { required: true, message: '请输入微软组 Object ID' },
            {
              pattern: /^[0-9a-fA-F-]{36}$/,
              message: '请输入合法的 36 位 UUID/GUID 格式 (如 65433c9d-3ae1-4e2c-907e-2902dd0ea1fc)',
            },
          ]}
        >
          <Input
            placeholder="如 65433c9d-3ae1-4e2c-907e-2902dd0ea1fc"
            disabled={!!editingMapping}
          />
        </Form.Item>

        <Form.Item
          label="Portal 显示名称"
          name="group_name"
          rules={[{ required: true, message: '请输入友好显示名称' }]}
        >
          <Input
            placeholder="如 管理员组、内服成员、VIP 等"
            onChange={(e) => setPreviewName(e.target.value)}
          />
        </Form.Item>

        <Form.Item
          label="标签颜色 (Tag Color)"
          name="group_color"
          rules={[{ required: true, message: '请选择或输入标签颜色' }]}
        >
          <ColorPickerSelect onColorSelect={(color) => setSelectedColor(color)} />
        </Form.Item>

        {/* Real-time Preview */}
        <div
          style={{
            marginTop: 14,
            padding: '12px 16px',
            background: '#f9f9f9',
            borderRadius: 8,
            border: '1px dashed #d9d9d9',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            效果预览：
          </Text>
          <Tag
            color={selectedColor || 'blue'}
            style={{ fontSize: 13, padding: '3px 12px', margin: 0 }}
          >
            {previewName || '标签名称预览'}
          </Tag>
        </div>
      </Form>
    </Modal>
  );
};

export default GroupMappingModal;
