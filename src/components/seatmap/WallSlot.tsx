import React, { useMemo } from 'react';
import type { DoorWindow } from '../../types/models';

interface WallSlotProps {
  side: 'left' | 'right' | 'top' | 'bottom';
  index: number;
  editMode: 'none' | 'door' | 'window';
  doorsWindows: DoorWindow[];
  rows: number;
  cols: number;
  stagePosition: 'top' | 'bottom' | 'left' | 'right' | null;
  onWallClick: (side: 'left' | 'right' | 'top' | 'bottom', index: number) => void;
}

const WallSlot: React.FC<WallSlotProps> = ({
  side,
  index,
  editMode,
  doorsWindows,
  rows,
  cols,
  stagePosition,
  onWallClick,
}) => {
  const feature = doorsWindows?.find(
    dw => dw.position === side && dw.index === index
  );

  // 判断是否靠前
  const isFront = useMemo(() => {
    if (stagePosition === 'bottom') {
      // 如果讲台在底部，靠下的是前门
      return side === 'left' || side === 'right' ? index > rows / 2 : false;
    }
    if (stagePosition === 'right') {
      // 如果讲台在右侧，靠右的是前门（对于top/bottom来说，index大的是右边）
      return side === 'top' || side === 'bottom' ? index > cols / 2 : false;
    }
    if (stagePosition === 'left') {
      // 如果讲台在左侧，靠左的是前门
      return side === 'top' || side === 'bottom' ? index <= cols / 2 : false;
    }
    // 默认情况（讲台在上方或无讲台），靠上的是前门
    return side === 'left' || side === 'right' ? index <= rows / 2 : false;
  }, [index, rows, cols, stagePosition, side]);
  
  // 决定显示文本
  let label = '';
  if (feature?.type === 'door') {
    label = isFront ? '前门' : '后门';
  } else if (feature?.type === 'window') {
    label = '窗户';
  }

  const isHorizontal = side === 'top' || side === 'bottom';

  return (
    <div 
      className={`
        ${isHorizontal ? 'h-8 w-full min-w-[100px] my-2' : 'w-8 h-full min-h-[100px] mx-2'} 
        rounded-lg flex items-center justify-center transition-all
        ${feature 
          ? (feature.type === 'door' 
              ? 'bg-gradient-to-br from-amber-800 to-amber-900 border-2 border-amber-800 shadow-md' 
              : 'border-2 border-sky-400 bg-gradient-to-br from-sky-100 to-blue-100 shadow-md')
          : (editMode === 'none' 
              ? 'border border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/50' 
              : `border-2 border-dashed cursor-pointer ${
                  editMode === 'door' 
                    ? 'border-amber-300 bg-amber-50 hover:bg-amber-100 hover:border-amber-500' 
                    : 'border-sky-300 bg-sky-50 hover:bg-sky-100 hover:border-sky-500'
                }`)
        }
      `}
      onClick={() => onWallClick(side, index)}
    >
      {feature && (
        <span 
          className={`text-xs font-bold ${feature.type === 'door' ? 'text-amber-100' : 'text-sky-700'}`}
          style={isHorizontal ? {} : { writingMode: 'vertical-rl', textOrientation: 'upright' }}
        >
          {label}
        </span>
      )}
      {!feature && editMode !== 'none' && (
        <span className={`text-xs ${editMode === 'door' ? 'text-amber-400' : 'text-sky-400'}`}>+</span>
      )}
    </div>
  );
};

export default WallSlot;
