import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import type { DoorWindow } from '../../types/models';

interface DoorWindowItemProps {
  doorWindow: DoorWindow;
  onRemove: (id: string) => void;
}

const DoorWindowItem = ({ doorWindow, onRemove }: DoorWindowItemProps) => {
  const isDoor = doorWindow.type === 'door';
  
  return (
    <div
      className={`
        relative flex items-center justify-center
        border-2 rounded
        ${isDoor ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'}
        hover:shadow-md transition-all
        group
      `}
      style={{
        width: doorWindow.position === 'left' || doorWindow.position === 'right' ? '40px' : '80px',
        height: doorWindow.position === 'left' || doorWindow.position === 'right' ? '80px' : '40px',
      }}
    >
      <span className="text-xs font-bold" style={{ 
        writingMode: doorWindow.position === 'left' || doorWindow.position === 'right' ? 'vertical-rl' : 'horizontal-tb'
      }}>
        {isDoor ? '门' : '窗'}
      </span>
      
      <Button
        type="text"
        danger
        size="small"
        icon={<CloseOutlined />}
        onClick={() => onRemove(doorWindow.id)}
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ fontSize: '10px', padding: '2px' }}
      />
    </div>
  );
};

export default DoorWindowItem;
