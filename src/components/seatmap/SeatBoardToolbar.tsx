import React from 'react';
import { Button, Tooltip, Space, Select, Input } from 'antd';
import {
  SearchOutlined,
  BgColorsOutlined,
  SettingOutlined,
  UndoOutlined,
  RedoOutlined,
  CameraOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  EditOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import type { Student, SeatCell, SeatAssignment } from '../../types/models';

interface SeatBoardToolbarProps {
  filters: { keyword: string; heatmapMode: 'none' | 'vision' | 'score'; tag?: string };
  setFilterKeyword: (keyword: string) => void;
  setHeatmapMode: (mode: 'none' | 'vision' | 'score') => void;
  editMode: 'none' | 'door' | 'window' | 'seat';
  setEditMode: (mode: 'none' | 'door' | 'window' | 'seat') => void;
  selectionMode: boolean;
  setSelectionMode: (mode: boolean) => void;
  setSelectedSeats: (seats: Set<string>) => void;
  selectedSeats: Set<string>;
  classroom: { cells: SeatCell[] };
  assignments: SeatAssignment[];
  students: Student[];
  seatOperations: {
    handleRowRotate: () => void;
    handleSwapTwoRows: () => void;
    handleColumnRotate: () => void;
    handleSwapTwoColumns: () => void;
    handleAllRowsShift: (direction: 'up' | 'down') => void;
    handleAllColumnsShift: (direction: 'left' | 'right') => void;
  };
  setBatchEditOpen: (open: boolean) => void;
  setDisplaySettingsOpen: (open: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  handleSnapshot: () => void;
  handlePdfExport: () => void;
  msgApi: any; // MessageInstance
  creatingGroupMode?: boolean;
  onFinishCreatingGroup?: () => void;
}

const SeatBoardToolbar: React.FC<SeatBoardToolbarProps> = ({
  filters,
  setFilterKeyword,
  setHeatmapMode,
  editMode,
  setEditMode,
  selectionMode,
  setSelectionMode,
  setSelectedSeats,
  selectedSeats,
  classroom,
  assignments,
  students,
  seatOperations,
  setBatchEditOpen,
  setDisplaySettingsOpen,
  undo,
  redo,
  canUndo,
  canRedo,
  handleSnapshot,
  handlePdfExport,
  msgApi,
  creatingGroupMode,
  onFinishCreatingGroup,
}) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div></div>
      <Space size="small" wrap>
        <Input.Search
          placeholder="搜索学生姓名..."
          allowClear
          size="small"
          style={{ width: 200 }}
          value={filters.keyword}
          onChange={(e) => setFilterKeyword(e.target.value)}
          prefix={<SearchOutlined />}
        />
        <Tooltip title="根据成绩/视力查看热力图">
          <Select
            size="small"
            value={filters.heatmapMode}
            style={{ width: 140 }}
            onChange={(value) => setHeatmapMode(value)}
            suffixIcon={<BgColorsOutlined />}
            options={[
              { label: '关闭热力图', value: 'none' },
              { label: '视力热力图', value: 'vision' },
              { label: '成绩热力图', value: 'score' },
            ]}
          />
        </Tooltip>
        {!selectionMode && (
          <>
            <Button
              size="small"
              type={editMode === 'door' ? 'primary' : 'default'}
              onClick={() => {
                setEditMode(editMode === 'door' ? 'none' : 'door');
                setSelectionMode(false);
              }}
            >
              {editMode === 'door' ? '✓ 门' : '🚪 设置门'}
            </Button>
            <Button
              size="small"
              type={editMode === 'window' ? 'primary' : 'default'}
              onClick={() => {
                setEditMode(editMode === 'window' ? 'none' : 'window');
                setSelectionMode(false);
              }}
            >
              {editMode === 'window' ? '✓ 窗' : '🪟 设置窗'}
            </Button>
            <Button
              size="small"
              type={editMode === 'seat' ? 'primary' : 'default'}
              onClick={() => {
                setEditMode(editMode === 'seat' ? 'none' : 'seat');
                setSelectionMode(false);
              }}
            >
              {editMode === 'seat' ? '✓ 补座' : '+ 补座'}
            </Button>
          </>
        )}
        <Button
          size="small"
          type={selectionMode ? 'primary' : 'default'}
          onClick={() => {
            if (creatingGroupMode && onFinishCreatingGroup && selectedSeats.size > 0) {
              onFinishCreatingGroup();
              return;
            }
            setSelectionMode(!selectionMode);
            setSelectedSeats(new Set());
            setEditMode('none');
          }}
        >
          {selectionMode ? (creatingGroupMode ? '完成分组' : '退出选择') : '批量选择'}
        </Button>
        {selectionMode && selectedSeats.size > 0 && (() => {
          const selectedCells = classroom.cells.filter(cell => selectedSeats.has(cell.id));
          const rows = [...new Set(selectedCells.map(c => c.row))];
          const cols = [...new Set(selectedCells.map(c => c.col))];

          return (
            <>
              {rows.length >= 2 && (
                <Button size="small" onClick={seatOperations.handleRowRotate}>
                  行轮换 ({selectedSeats.size})
                </Button>
              )}
              {rows.length === 2 && (
                <Button size="small" onClick={seatOperations.handleSwapTwoRows}>
                  交换两行
                </Button>
              )}
              {cols.length >= 2 && (
                <Button size="small" onClick={seatOperations.handleColumnRotate}>
                  列轮换 ({selectedSeats.size})
                </Button>
              )}
              {cols.length === 2 && (
                <Button size="small" onClick={seatOperations.handleSwapTwoColumns}>
                  交换两列
                </Button>
              )}
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  const selectedStudents = classroom.cells
                    .filter(cell => selectedSeats.has(cell.id))
                    .map(cell => assignments.find(a => a.seatId === cell.id)?.studentId)
                    .filter(Boolean)
                    .map(studentId => students.find(s => s.id === studentId))
                    .filter(Boolean) as Student[];

                  if (selectedStudents.length === 0) {
                    msgApi.warning('选中的座位上没有学生');
                    return;
                  }
                  setBatchEditOpen(true);
                }}
              >
                批量编辑 ({classroom.cells.filter(cell => selectedSeats.has(cell.id)).map(cell => assignments.find(a => a.seatId === cell.id)?.studentId).filter(Boolean).length}人)
              </Button>
              <span className="text-xs text-slate-500">
                💡 按住Shift/Ctrl框选可加选 | 拖动选中座位可批量移动
              </span>
            </>
          );
        })()}

        {/* 全局循环移动按钮 - 批量选择模式下显示 */}
        {selectionMode && (
          <>
            <Tooltip title="所有行循环上移">
              <Button
                icon={<ArrowUpOutlined />}
                size="small"
                onClick={() => seatOperations.handleAllRowsShift('up')}
              >
                行上移
              </Button>
            </Tooltip>
            <Tooltip title="所有行循环下移">
              <Button
                icon={<ArrowDownOutlined />}
                size="small"
                onClick={() => seatOperations.handleAllRowsShift('down')}
              >
                行下移
              </Button>
            </Tooltip>
            <Tooltip title="所有列循环左移">
              <Button
                icon={<ArrowLeftOutlined />}
                size="small"
                onClick={() => seatOperations.handleAllColumnsShift('left')}
              >
                列左移
              </Button>
            </Tooltip>
            <Tooltip title="所有列循环右移">
              <Button
                icon={<ArrowRightOutlined />}
                size="small"
                onClick={() => seatOperations.handleAllColumnsShift('right')}
              >
                列右移
              </Button>
            </Tooltip>
          </>
        )}

        <Tooltip title="显示设置">
          <Button
            icon={<SettingOutlined />}
            size="small"
            onClick={() => setDisplaySettingsOpen(true)}
          >
            设置
          </Button>
        </Tooltip>

        <Tooltip title="撤销 (Ctrl+Z)">
          <Button
            icon={<UndoOutlined />}
            size="small"
            onClick={undo}
            disabled={!canUndo}
          />
        </Tooltip>

        <Tooltip title="重做 (Ctrl+Y)">
          <Button
            icon={<RedoOutlined />}
            size="small"
            onClick={redo}
            disabled={!canRedo}
          />
        </Tooltip>

        {/* 缩放功能已移至全局Header */}

        {!selectionMode && (
          <>
            <Button icon={<PrinterOutlined />} size="small" type="primary" onClick={handlePdfExport}>
              导出 PDF (打印)
            </Button>
            <Button icon={<CameraOutlined />} size="small" onClick={handleSnapshot}>
              导出图片
            </Button>
          </>
        )}
      </Space>
    </div>
  );
};

export default SeatBoardToolbar;
