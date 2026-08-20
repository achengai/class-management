import { Drawer, Timeline, Button, Space, Tag, Empty } from 'antd';
import { UndoOutlined, RedoOutlined, HistoryOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useClassStore } from '../../store/useClassStore';

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
}

const HistoryPanel = ({ open, onClose }: HistoryPanelProps) => {
  const currentClassId = useClassStore((state) => state.classId);
  const currentClass = useClassStore((state) => 
    state.classList.find(c => c.id === currentClassId)
  );
  const undo = useClassStore((state) => state.undo);
  const redo = useClassStore((state) => state.redo);
  const canUndo = useClassStore((state) => state.canUndo());
  const canRedo = useClassStore((state) => state.canRedo());

  if (!currentClass) {
    return null;
  }

  const history = currentClass.history || [];
  const historyIndex = currentClass.historyIndex;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Drawer
      title={
        <Space>
          <HistoryOutlined />
          <span>操作历史</span>
        </Space>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width={400}
      extra={
        <Space>
          <Button
            size="small"
            icon={<UndoOutlined />}
            onClick={undo}
            disabled={!canUndo}
          >
            撤销 (Ctrl+Z)
          </Button>
          <Button
            size="small"
            icon={<RedoOutlined />}
            onClick={redo}
            disabled={!canRedo}
          >
            重做 (Ctrl+Shift+Z)
          </Button>
        </Space>
      }
    >
      <div className="p-4">
        {history.length === 0 ? (
          <Empty description="暂无操作记录" />
        ) : (
          <Timeline
            mode="left"
            items={history.map((action, index) => ({
              key: action.id,
              color: index === historyIndex + 1 ? 'blue' : index <= historyIndex ? 'gray' : 'green',
              dot: index === historyIndex + 1 ? <ClockCircleOutlined style={{ fontSize: '16px' }} /> : undefined,
              children: (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{action.description}</span>
                    {index === historyIndex + 1 && (
                      <Tag color="blue">当前</Tag>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTime(action.timestamp)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    类型: {action.actionType}
                  </div>
                </div>
              ),
            }))}
          />
        )}
        
        {history.length > 0 && (
          <div className="mt-6 p-3 bg-gray-50 rounded">
            <h4 className="text-sm font-semibold mb-2">📊 历史统计</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>总操作数: {history.length}</div>
              <div>当前位置: {historyIndex + 1}</div>
              <div>可撤销: {canUndo ? '是' : '否'}</div>
              <div>可重做: {canRedo ? '是' : '否'}</div>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default HistoryPanel;
