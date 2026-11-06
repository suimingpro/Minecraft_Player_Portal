'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Button } from 'antd';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <Alert
            type="error"
            showIcon
            message={this.props.fallbackTitle ?? '页面加载出错'}
            description={this.state.error?.message ?? '未知错误'}
            action={
              <Button size="small" danger onClick={() => this.setState({ hasError: false, error: null })}>
                重试
              </Button>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}
