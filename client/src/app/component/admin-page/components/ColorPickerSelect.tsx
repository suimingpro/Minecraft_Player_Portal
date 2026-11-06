'use client';

import React from 'react';
import { Input, Tag } from 'antd';

export const PRESET_TAG_COLORS = [
  { label: '极客蓝 (geekblue)', value: 'geekblue' },
  { label: '标准蓝 (blue)', value: 'blue' },
  { label: '洋红 (magenta)', value: 'magenta' },
  { label: '紫色 (purple)', value: 'purple' },
  { label: '火山红 (volcano)', value: 'volcano' },
  { label: '红色 (red)', value: 'red' },
  { label: '橙色 (orange)', value: 'orange' },
  { label: '金色 (gold)', value: 'gold' },
  { label: '青色 (cyan)', value: 'cyan' },
  { label: '绿色 (green)', value: 'green' },
  { label: '青柠 (lime)', value: 'lime' },
];

export interface ColorPickerSelectProps {
  value?: string;
  onChange?: (color: string) => void;
  onColorSelect?: (color: string) => void;
}

export const ColorPickerSelect: React.FC<ColorPickerSelectProps> = ({
  value = 'blue',
  onChange,
  onColorSelect,
}) => {
  const currentColor = value || 'blue';

  const triggerChange = (newColor: string) => {
    onChange?.(newColor);
    onColorSelect?.(newColor);
  };

  return (
    <div>
      {/* Presets Grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {PRESET_TAG_COLORS.map((c) => {
          const isSelected = currentColor === c.value;
          return (
            <div
              key={c.value}
              onClick={(e) => {
                e.stopPropagation();
                triggerChange(c.value);
              }}
              style={{
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: 6,
                border: isSelected ? '2px solid #1677ff' : '2px solid transparent',
                backgroundColor: isSelected ? '#e6f4ff' : 'transparent',
                transition: 'all 0.15s ease-in-out',
              }}
            >
              <Tag
                color={c.value}
                style={{
                  margin: 0,
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: '2px 8px',
                  userSelect: 'none',
                }}
              >
                {c.label} {isSelected ? '✓' : ''}
              </Tag>
            </div>
          );
        })}
      </div>

      {/* Custom input with native color picker */}
      <Input
        value={currentColor}
        onChange={(e) => {
          triggerChange(e.target.value);
        }}
        placeholder="支持 Ant Design 预设颜色名或 16 进制颜色代码（如 #1677ff）"
        addonBefore={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="color"
              value={currentColor.startsWith('#') && currentColor.length === 7 ? currentColor : '#1677ff'}
              onChange={(e) => {
                triggerChange(e.target.value);
              }}
              style={{
                width: 22,
                height: 22,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: 'transparent',
              }}
              title="取色器选择自定义颜色"
            />
            <span style={{ fontSize: 12 }}>取色器</span>
          </div>
        }
      />
    </div>
  );
};

export default ColorPickerSelect;
