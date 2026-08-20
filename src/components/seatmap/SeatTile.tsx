import type { CSSProperties } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Badge, Tooltip } from 'antd';
import { CrownOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import type { SeatCell, Student, Reward } from '../../types/models';

export interface DisplaySettings {
  nameFontSize: number;
  detailsFontSize: number;
  showStudentNumber: boolean;
  showGenderHeight: boolean;
  showVision: boolean;
  seatLabelSize: number;
}

type Props = {
  seat: SeatCell;
  student?: Student;
  warnings: string[];
  rewards?: Reward[]; // 新增：关联的奖励
  highlighted: boolean;
  dimmed: boolean;
  heatmap?: string;
  privacyMode?: {
    active: boolean;
    highlightId?: string;
  };
  spanCols?: number;
  spanRows?: number;
  onDoubleClick?: (seatId: string, student: Student | undefined) => void;
  onClick?: (seatId: string) => void;
  selected?: boolean;
  displayLabel?: string; // 自定义显示的座位编号
  selectionMode?: boolean; // 批量选择模式
  displaySettings?: DisplaySettings; // 显示设置
  editMode?: 'none' | 'door' | 'window' | 'seat'; // 编辑模式
};

export const Seat = ({
  seat,
  student,
  warnings,
  rewards = [], // 默认为空数组
  highlighted,
  dimmed,
  heatmap,
  privacyMode,
  spanCols = 1,
  spanRows = 1,
  onDoubleClick,
  onClick,
  selected = false,
  displayLabel,
  selectionMode = false,
  displaySettings = {
    nameFontSize: 16,
    detailsFontSize: 10,
    showStudentNumber: true,
    showGenderHeight: true,
    showVision: true,
    seatLabelSize: 9,
  },
  editMode = 'none',
}: Props) => {
  // 座位类型可拖拽
  const isDraggableType = seat.type === 'seat';
  
  // 批量选择模式下，选中的座位可以拖动（即使没有学生）
  // 普通模式下，只有有学生的座位可以拖动
  const canDrag = isDraggableType && (selectionMode ? selected : !!student) && editMode === 'none';
  
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: seat.id,
    disabled: !canDrag,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: seat.id,
    disabled: !isDraggableType,
  });

  const ref = (node: HTMLElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  const privacyActive = Boolean(privacyMode?.active);
  const isTarget = privacyActive && student && privacyMode?.highlightId === student.id;

  // 讲台/过道/空白区域特殊显示
  if (seat.type === 'stage') {
    return (
      <div 
        className="rounded-lg border-2 border-amber-500 bg-gradient-to-br from-amber-100 to-orange-100 px-3 py-4 text-center flex items-center justify-center shadow-md"
        style={{
          gridColumn: spanCols > 1 ? `span ${spanCols}` : undefined,
          gridRow: spanRows > 1 ? `span ${spanRows}` : undefined,
          minHeight: spanRows > 1 ? '120px' : undefined,
        }}
      >
        <p className="text-lg font-bold text-amber-800">🎓 讲台</p>
      </div>
    );
  }

  if (seat.type === 'aisle') {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-2 py-4 text-center flex items-center justify-center">
        <p className="text-xs text-slate-400">过道</p>
      </div>
    );
  }

  if (seat.type === 'door') {
    return (
      <div 
        className="rounded-lg border-2 border-amber-800 bg-gradient-to-br from-amber-800 to-amber-900 text-center flex items-center justify-center shadow-md cursor-pointer hover:opacity-80 transition-opacity" 
        style={{ width: '20px', height: '100%', minHeight: '80px' }}
        onClick={() => onClick?.(seat.id)}
      >
        <p className="text-xs font-bold text-white writing-mode-vertical" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>🚪</p>
      </div>
    );
  }

  if (seat.type === 'window') {
    return (
      <div 
        className="rounded-lg border-2 border-sky-400 bg-gradient-to-br from-sky-100 to-blue-100 text-center flex items-center justify-center shadow-md cursor-pointer hover:opacity-80 transition-opacity" 
        style={{ width: '20px', height: '100%', minHeight: '80px' }}
        onClick={() => onClick?.(seat.id)}
      >
        <p className="text-xs font-bold text-sky-700 writing-mode-vertical" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>🪟</p>
      </div>
    );
  }

  if (seat.type === 'void') {
    if (editMode === 'seat') {
      return (
        <div 
          className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 flex items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors"
          style={{ minHeight: '85px' }}
          onClick={() => onClick?.(seat.id)}
        >
          <PlusOutlined className="text-blue-400 text-xl" />
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-transparent bg-transparent px-2 py-4" />
    );
  }

  // 性别背景色逻辑
  const getGenderBackground = () => {
    if (editMode === 'seat') return 'bg-red-50 border-red-300'; // 编辑模式下显示删除状态
    if (!student) return 'bg-white';
    if (privacyActive || warnings.length > 0) {
      return warnings.length > 0 ? 'bg-red-50/50' : 'bg-white';
    }
    if (heatmap) return ''; // 热力图模式优先
    if (student.customColor) return ''; // 自定义颜色优先
    return student.gender === 'male' ? 'bg-blue-50' : 'bg-pink-50';
  };

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    background: student?.customColor 
      ? student.customColor 
      : (heatmap && !privacyActive && warnings.length === 0 && editMode !== 'seat' ? heatmap : undefined),
  };

  const borderColor =
    editMode === 'seat' ? 'border-red-400 border-dashed' :
    (!privacyActive && warnings.length > 0 ? 'border-red-400' : 'border-slate-200');
  
  const backgroundClass = getGenderBackground();

  return (
    <div
      ref={ref}
      style={style}
      data-seat-id={seat.id}
      className={`relative rounded-xl border px-2 py-2 text-center transition-all duration-200 min-h-[85px] ${borderColor} ${backgroundClass} ${
        isOver ? 'ring-2 ring-brand-400' : ''
      } ${isDragging ? 'opacity-70' : ''} ${highlighted ? 'ring-4 ring-yellow-400 shadow-lg shadow-yellow-300/50 scale-105' : ''} ${
        dimmed ? 'opacity-30' : ''
      } ${isTarget ? 'ring-2 ring-amber-400' : ''} ${selected ? 'ring-4 ring-blue-500 bg-blue-100' : ''
      } cursor-pointer`}
      onClick={() => onClick?.(seat.id)}
      onDoubleClick={() => onDoubleClick?.(seat.id, student)}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
    >
      {/* 编辑模式移除遮罩 */}
      {editMode === 'seat' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20 rounded-xl group">
          <MinusOutlined className="text-red-500 text-xl" />
        </div>
      )}

      {/* 警告角标 */}
      {!privacyActive && warnings.length > 0 && editMode !== 'seat' && (
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[16px] border-l-[16px] border-t-red-500 border-l-transparent rounded-tr-xl" />
      )}

      {/* 奖励标识 */}
      {rewards.length > 0 && editMode !== 'seat' && (
        <div className="absolute -top-2 -left-1 z-10">
          <Tooltip title={`奖励生效：${rewards.map(r => r.name).join(', ')}`}>
            <CrownOutlined style={{ color: '#faad14', fontSize: '18px', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))' }} />
          </Tooltip>
        </div>
      )}

      <p className="text-slate-500 mb-0.5" style={{ fontSize: `${displaySettings.seatLabelSize}px` }}>{displayLabel || seat.id.replace('seat-', '')}</p>
      {student ? (
        <div className="flex flex-col items-center gap-0.5">
          <p className="font-bold text-slate-800 mt-1" style={{ fontSize: `${displaySettings.nameFontSize}px` }}>{student.name}</p>
          {/* 组长角色标识 */}
          {student.groupLeaderRoles && student.groupLeaderRoles.length > 0 && editMode !== 'seat' && (
            <div className="flex flex-wrap gap-0.5 justify-center max-w-full px-1">
              {student.groupLeaderRoles.map((role, index) => (
                <span
                  key={index}
                  className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300"
                  style={{ 
                    fontSize: '9px',
                    lineHeight: '1',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {role}
                </span>
              ))}
            </div>
          )}
          {displaySettings.showStudentNumber && student.studentNumber && (
            <p className="text-slate-400" style={{ fontSize: `${displaySettings.detailsFontSize}px` }}>学号: {student.studentNumber}</p>
          )}
          {!privacyActive && (
            <p className="text-slate-500" style={{ fontSize: `${displaySettings.detailsFontSize}px` }}>
              {displaySettings.showGenderHeight && `${student.gender === 'male' ? '♂' : '♀'} · ${student.height}cm`}
              {displaySettings.showGenderHeight && displaySettings.showVision && ' · '}
              {displaySettings.showVision && `视力 ${student.vision}`}
            </p>
          )}
          {!privacyActive && warnings.length > 0 && editMode !== 'seat' && (
            <div className="text-[10px] text-red-500">
              {warnings.join(' / ')}
            </div>
          )}
          {privacyActive && isTarget && (
            <span className="text-[10px] text-amber-500">专属高亮</span>
          )}
        </div>
      ) : (
        <Badge status="processing" text="空位" />
      )}
    </div>
  );
};

