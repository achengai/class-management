import React, { useState } from 'react';
import { Modal, Button, Input, Alert, Space, Typography, message } from 'antd';
import { WarningOutlined, DeleteOutlined } from '@ant-design/icons';
import { useClassStore } from '../../store/useClassStore';

const { Text, Title } = Typography;

interface SystemResetModalProps {
  open: boolean;
  onClose: () => void;
}

export const SystemResetModal: React.FC<SystemResetModalProps> = ({ open, onClose }) => {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const fullReset = useClassStore((state) => state.fullReset);

  const handleReset = async () => {
    if (confirmText !== 'RESET') {
      message.error('请输入正确的确认文字');
      return;
    }

    setLoading(true);
    try {
      await fullReset();
      // fullReset handles the reload, but if it doesn't:
      message.success('系统已重置');
      onClose();
    } catch (error) {
      console.error(error);
      message.error('重置失败，请查看控制台');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setConfirmText('');
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined style={{ color: '#ff4d4f' }} />
          <span>系统重置</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      width={480}
      centered
    >
      {step === 1 && (
        <div className="py-2">
          <Alert
            message="警告：这不仅是删除数据"
            description="重置系统将永久删除所有班级、学生信息、排座方案、积分记录以及系统配置。此操作不可撤销。"
            type="warning"
            showIcon
            className="mb-4"
          />
          <Title level={5}>确定要继续吗？</Title>
          <Text type="secondary">
            在重置开始前，系统会自动为您当前的全部数据生成一份本地备份（JSON文件）。
          </Text>
          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={handleClose}>点错了</Button>
            <Button type="primary" danger onClick={() => setStep(2)}>
              我明白，继续下一步
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="py-2">
          <Alert
            message="最后一步确认"
            description={
              <div>
                请在下方输入 <Text code strong>RESET</Text> 以确认删除。
                <br />
                点击下方按钮后，系统将导出备份并立即抹除所有本地存储。
              </div>
            }
            type="error"
            showIcon
            className="mb-4"
          />
          <div className="mb-4">
            <Input
              placeholder="请输入 RESET"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-2"
              status={confirmText && confirmText !== 'RESET' ? 'error' : ''}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setStep(1)}>返回上一步</Button>
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              disabled={confirmText !== 'RESET'}
              loading={loading}
              onClick={handleReset}
            >
              立即抹除全部数据并重启
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
