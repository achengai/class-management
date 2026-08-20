import { useState } from 'react';
import { Modal, Button, Select, InputNumber, Space, List, Tag, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useClassStore } from '../../store/useClassStore';

interface DoorWindowManagerProps {
  open: boolean;
  onClose: () => void;
}

const DoorWindowManager = ({ open, onClose }: DoorWindowManagerProps) => {
  const [msgApi, contextHolder] = message.useMessage();
  const classroom = useClassStore((state) => state.classroom);
  const addDoorWindow = useClassStore((state) => state.addDoorWindow);
  const removeDoorWindow = useClassStore((state) => state.removeDoorWindow);
  
  const [newType, setNewType] = useState<'door' | 'window'>('door');
  const [newPosition, setNewPosition] = useState<'left' | 'right' | 'top' | 'bottom'>('left');
  const [newIndex, setNewIndex] = useState(1);

  const handleAdd = () => {
    // 验证
    const maxIndex = newPosition === 'left' || newPosition === 'right' 
      ? classroom.rows 
      : classroom.cols;
      
    if (newIndex < 1 || newIndex > maxIndex) {
      msgApi.error(`位置必须在 1-${maxIndex} 之间`);
      return;
    }
    
    // 检查是否已存在
    const exists = classroom.doorsWindows.some(
      dw => dw.position === newPosition && dw.index === newIndex
    );
    
    if (exists) {
      msgApi.error('该位置已有门或窗');
      return;
    }
    
    addDoorWindow(newType, newPosition, newIndex);
    msgApi.success(`已添加${newType === 'door' ? '门' : '窗'}`);
  };

  const handleRemove = (id: string) => {
    removeDoorWindow(id);
    msgApi.success('已删除');
  };

  const positionLabels: Record<string, string> = {
    left: '左侧',
    right: '右侧',
    top: '顶部',
    bottom: '底部',
  };

  return (
    <>
      {contextHolder}
      <Modal
        title="门窗管理"
        open={open}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <h4 className="text-sm font-semibold mb-3">添加门或窗</h4>
          <Space>
            <Select
              value={newType}
              onChange={setNewType}
              style={{ width: 100 }}
              options={[
                { label: '🚪 门', value: 'door' },
                { label: '🪟 窗', value: 'window' },
              ]}
            />
            <Select
              value={newPosition}
              onChange={setNewPosition}
              style={{ width: 120 }}
              options={[
                { label: '左侧', value: 'left' },
                { label: '右侧', value: 'right' },
                { label: '顶部', value: 'top' },
                { label: '底部', value: 'bottom' },
              ]}
            />
            <InputNumber
              value={newIndex}
              onChange={(value) => setNewIndex(value || 1)}
              min={1}
              max={newPosition === 'left' || newPosition === 'right' ? classroom.rows : classroom.cols}
              addonBefore="第"
              addonAfter={newPosition === 'left' || newPosition === 'right' ? '行' : '列'}
              style={{ width: 140 }}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              添加
            </Button>
          </Space>
          <div className="text-xs text-gray-500 mt-2">
            提示：{newPosition === 'left' || newPosition === 'right' 
              ? `左右侧门窗位于第几行，范围 1-${classroom.rows}` 
              : `上下侧门窗位于第几列，范围 1-${classroom.cols}`}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">已添加的门窗</h4>
          {classroom.doorsWindows.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              暂无门窗，请添加
            </div>
          ) : (
            <List
              dataSource={classroom.doorsWindows}
              renderItem={(dw) => (
                <List.Item
                  actions={[
                    <Button
                      key="delete"
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemove(dw.id)}
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color={dw.type === 'door' ? 'red' : 'blue'}>
                          {dw.type === 'door' ? '🚪 门' : '🪟 窗'}
                        </Tag>
                        <span className="text-sm">
                          {positionLabels[dw.position]} 第{dw.index}{dw.position === 'left' || dw.position === 'right' ? '行' : '列'}
                        </span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Modal>
    </>
  );
};

export default DoorWindowManager;
