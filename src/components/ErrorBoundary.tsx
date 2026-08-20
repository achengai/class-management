import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Result, Button, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
          <Result
            status="500"
            title="应用遇到了一些问题"
            subTitle="抱歉，页面加载过程中发生了错误。"
            extra={[
              <Button 
                type="primary" 
                key="reload" 
                icon={<ReloadOutlined />} 
                onClick={this.handleReload}
              >
                重新加载
              </Button>,
              <Button key="clear" onClick={this.handleClearCache} danger>
                清除缓存并重试
              </Button>,
            ]}
          >
            <div className="desc text-left bg-white p-4 rounded border mt-4 max-w-2xl overflow-auto max-h-60">
              <Paragraph>
                <Text strong style={{ fontSize: 16 }}>错误详情:</Text>
              </Paragraph>
              <Paragraph>
                <Text type="danger">{this.state.error?.toString()}</Text>
              </Paragraph>
              {this.state.errorInfo && (
                <Paragraph>
                  <Text code>{this.state.errorInfo.componentStack}</Text>
                </Paragraph>
              )}
            </div>
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
