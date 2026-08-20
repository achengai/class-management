import { Modal } from 'antd';
import type { ModalProps } from 'antd';
import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * 可拖动的Modal组件
 * 使用方法：将所有Modal替换为DraggableModal即可
 * 用户可以通过拖动标题栏来移动对话框位置
 */
const DraggableModal: React.FC<ModalProps> = (props) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });

  // 重置位置（当Modal打开/关闭时）
  useEffect(() => {
    if (props.open) {
      setPosition({ x: 0, y: 0 });
    }
  }, [props.open]);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // 只允许在标题栏拖动
    const target = e.target as HTMLElement;
    if (target.closest('.ant-modal-header')) {
      e.preventDefault();
      e.stopPropagation();
      
      dragStartPos.current = {
        x: e.clientX,
        y: e.clientY,
      };
      initialPos.current = {
        x: position.x,
        y: position.y,
      };
      setDragging(true);
    }
  }, [position]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    
    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;
    
    setPosition({
      x: initialPos.current.x + deltaX,
      y: initialPos.current.y + deltaY,
    });
  }, [dragging]);

  const onMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      return () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    }
  }, [dragging, onMouseMove, onMouseUp]);

  return (
    <Modal
      {...props}
      modalRender={(modal) => (
        <div
          style={{
            position: 'absolute',
            left: position.x !== 0 ? `${position.x}px` : undefined,
            top: position.y !== 0 ? `${position.y}px` : undefined,
            userSelect: dragging ? 'none' : 'auto',
          }}
          onMouseDown={onMouseDown}
        >
          <div style={{ cursor: dragging ? 'grabbing' : 'default' }}>
            {modal}
          </div>
        </div>
      )}
    />
  );
};

export default DraggableModal;
