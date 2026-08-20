import { useMemo, useRef, useState, useEffect } from 'react';
import { message } from 'antd';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import { Seat } from './SeatTile';
import { useClassStore } from '../../store/useClassStore';
import type { Student } from '../../types/models';
import SeatLegend from './SeatLegend';
import PrivacyExportModal from './PrivacyExportModal';
import AddStudentModal from '../panels/AddStudentModal';
import BatchEditStudentModal from '../panels/BatchEditStudentModal';
import DisplaySettingsModal, { type DisplaySettings } from './DisplaySettingsModal';
import DraggableModal from '../common/DraggableModal';
import SeatBoardToolbar from './SeatBoardToolbar';
import { useSeatOperations } from '../../hooks/useSeatOperations';
import { collectWarnings, matchesFilter, getHeatmapColor, getSeatDisplayLabel } from '../../utils/seatUtils';
import WallSlot from './WallSlot';
import { exportElementToPdf } from '../../utils/pdfExport';

// 分组颜色选项
const GROUP_COLORS = [
  '#3b82f6', // 蓝
  '#ef4444', // 红
  '#10b981', // 绿
  '#f59e0b', // 黄
  '#8b5cf6', // 紫
  '#ec4899', // 粉
  '#06b6d4', // 青
  '#84cc16', // 赖姆绿
];

const SeatBoard = () => {
  const [msgApi, contextHolder] = message.useMessage();
  const classroom = useClassStore((state) => state.classroom);
  const assignments = useClassStore((state) => state.assignments);
  const students = useClassStore((state) => state.students);
  const rules = useClassStore((state) => state.rules);
  const swapSeats = useClassStore((state) => state.swapSeats);
  const toggleSeatType = useClassStore((state) => state.toggleSeatType);
  const batchUpdateAssignments = useClassStore((state) => state.batchUpdateAssignments);
  const addStudent = useClassStore((state) => state.addStudent);
  const updateStudent = useClassStore((state) => state.updateStudent);
  const addDoorWindow = useClassStore((state) => state.addDoorWindow);
  const removeDoorWindow = useClassStore((state) => state.removeDoorWindow);
  const setClassroomDimensions = useClassStore((state) => state.setClassroomDimensions);
  const filters = useClassStore((state) => state.filters);
  const setHeatmapMode = useClassStore((state) => state.setHeatmapMode);
  const setFilterKeyword = useClassStore((state) => state.setFilterKeyword);
  const spotlightStudentId = useClassStore((state) => state.spotlightStudentId);
  const undo = useClassStore((state) => state.undo);
  const redo = useClassStore((state) => state.redo);
  const canUndo = useClassStore((state) => state.canUndo)();
  const canRedo = useClassStore((state) => state.canRedo)();
  const rewards = useClassStore((state) => state.rewards);
  const getActiveRedeems = useClassStore((state) => state.getActiveRedeems);
  const setSpotlightStudent = useClassStore((state) => state.setSpotlightStudent);
  const selectionMode = useClassStore((state) => state.selectionMode);
  const selectedSeatsArray = useClassStore((state) => state.selectedSeats);
  const setSelectedSeats = useClassStore((state) => state.setSelectedSeats);
  const setSelectionMode = useClassStore((state) => state.setSelectionMode);
  const toggleSeatSelection = useClassStore((state) => state.toggleSeatSelection);
  // clearSelection available via store if needed

  // 内部为了性能和逻辑方便，转换回 Set
  const selectedSeatsSet = useMemo(() => new Set(selectedSeatsArray), [selectedSeatsArray]);

  // 快捷键逻辑改为使用全局状态
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        if (canRedo) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [targetSeatId, setTargetSeatId] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'none' | 'door' | 'window' | 'seat'>('none');

  // 创建分组模式
  const [creatingGroupMode, setCreatingGroupMode] = useState(false);
  const [groupNameModalOpen, setGroupNameModalOpen] = useState(false);
  const [pendingGroupSeats, setPendingGroupSeats] = useState<string[]>([]);
  const [pendingGroupColor, setPendingGroupColor] = useState(GROUP_COLORS[0]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  useEffect(() => {
    const handleStartCreatingGroup = () => {
      setCreatingGroupMode(true);
      setSelectionMode(true);
      setSelectedSeats([]);
      setEditMode('none');
      setEditingGroupId(null);
      msgApi.info('请在座位图上框选或点击选择要分组的座位，完成后点击"完成分组"');
    };

    const handleEditGroup = (e: CustomEvent) => {
      const group = e.detail;
      if (group) {
        setEditingGroupId(group.id);
        setPendingGroupSeats(group.seatIds);
        setPendingGroupColor(group.color || GROUP_COLORS[0]);
        setGroupNameModalOpen(true);

        // 稍微延迟一下以确保Modal渲染后再设置input值
        setTimeout(() => {
          const input = document.getElementById('group-name-input') as HTMLInputElement;
          if (input) {
            input.value = group.name;
            input.select();
          }
        }, 100);
      }
    };

    window.addEventListener('start-creating-group', handleStartCreatingGroup);
    window.addEventListener('edit-group', handleEditGroup as EventListener);
    return () => {
      window.removeEventListener('start-creating-group', handleStartCreatingGroup);
      window.removeEventListener('edit-group', handleEditGroup as EventListener);
    };
  }, [msgApi]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [selectionMode_addMode, setSelectionMode_addMode] = useState(false); // 记录是否为加选模式
  const [displaySettingsOpen, setDisplaySettingsOpen] = useState(false); // 显示设置对话框
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    nameFontSize: 16,
    detailsFontSize: 10,
    showStudentNumber: true,
    showGenderHeight: true,
    showVision: true,
    seatLabelSize: 9,
  });
  const [batchEditOpen, setBatchEditOpen] = useState(false); // 批量编辑弹窗

  const seatGridRef = useRef<HTMLDivElement>(null);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [exportContext, setExportContext] = useState<'pdf' | 'image'>('pdf');
  const [privacyMode, setPrivacyMode] = useState<{ active: boolean; highlightId?: string }>({
    active: false,
  });

  // 响应式座位大小
  const [seatSize, setSeatSize] = useState(120);
  const containerRef = useRef<HTMLDivElement>(null);

  // 调试：监控 groupMode 变化
  useEffect(() => {
    console.log('========== SeatBoard 渲染 ==========');
    console.log('classroom.groupMode:', classroom.groupMode);
    console.log('classroom.groupSize:', classroom.groupSize);
    console.log('classroom.groupGap:', classroom.groupGap);
    console.log('分组模式激活:', classroom.groupMode === 'column' && classroom.groupSize);
    console.log('====================================');
  }, [classroom.groupMode, classroom.groupSize, classroom.groupGap]);

  const handleSeatDoubleClick = (seatId: string, student: Student | undefined) => {
    if (selectionMode || editMode !== 'none') return;
    setTargetSeatId(seatId);
    setEditingStudent(student || null);
    setModalOpen(true);
  };

  const handleSeatClick = (seatId: string) => {
    if (editMode === 'seat') {
      const cell = classroom.cells.find(c => c.id === seatId);
      if (cell) {
        const nextType = cell.type === 'seat' ? 'void' : 'seat';
        toggleSeatType(seatId, nextType);
        if (nextType === 'seat') {
          msgApi.success('已添加座位');
        } else {
          msgApi.success('已移除座位');
        }
      }
      return;
    }

    if (editMode !== 'none') {
      msgApi.info('请点击座位两侧的墙壁区域添加门窗');
      return;
    }

    if (selectionMode) {
      toggleSeatSelection(seatId);
      return;
    }

    // 普通模式下点击座位切换学生选中状态
    if (editMode === 'none') {
      const assignment = assignments.find(a => a.seatId === seatId);
      if (assignment?.studentId) {
        setSpotlightStudent(assignment.studentId === spotlightStudentId ? undefined : assignment.studentId);
      } else {
        // 点击空位清除选中
        setSpotlightStudent(undefined);
      }
    }
  };

  // 处理墙壁点击
  const handleWallClick = (side: 'left' | 'right' | 'top' | 'bottom', index: number) => {
    if (editMode === 'none' || editMode === 'seat') return;

    const existingFeature = classroom.doorsWindows?.find(
      dw => dw.position === side && dw.index === index
    );

    if (existingFeature) {
      removeDoorWindow(existingFeature.id);
      msgApi.success(`已移除${existingFeature.type === 'door' ? '门' : '窗'}`);
    } else {
      addDoorWindow(editMode as 'door' | 'window', side, index);
      msgApi.success(`已添加${editMode === 'door' ? '门' : '窗'}`);
    }
  };

  // useSeatOperations 需要 Set<string>，我们用内部的 selectedSeats Set
  // 但 setSelectedSeats 需要包装一下从 Set 转 Array
  const setSelectedSeatsFromSet = (seats: Set<string>) => setSelectedSeats(Array.from(seats));
  const seatOperations = useSeatOperations({
    selectedSeats: selectedSeatsSet,
    setSelectedSeats: setSelectedSeatsFromSet,
    setSelectionMode,
    msgApi,
  });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectionMode || !seatGridRef.current) return;
    const target = e.target as HTMLElement;
    const seatElement = target.closest('[data-seat-id]');
    if (seatElement) return;
    setSelectionMode_addMode(e.shiftKey || e.ctrlKey || e.metaKey);
    const rect = seatGridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !seatGridRef.current || !selectionBox) return;
    const rect = seatGridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelectionBox({ ...selectionBox, endX: x, endY: y });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !selectionBox || !seatGridRef.current) {
      setIsDrawing(false);
      setSelectionBox(null);
      return;
    }
    const minX = Math.min(selectionBox.startX, selectionBox.endX);
    const maxX = Math.max(selectionBox.startX, selectionBox.endX);
    const minY = Math.min(selectionBox.startY, selectionBox.endY);
    const maxY = Math.max(selectionBox.startY, selectionBox.endY);
    const gridRect = seatGridRef.current.getBoundingClientRect();
    const newSelected = new Set<string>();
    classroom.cells.forEach((seat) => {
      if (seat.type !== 'seat') return;
      const seatElement = seatGridRef.current?.querySelector(`[data-seat-id="${seat.id}"]`);
      if (!seatElement) return;
      const seatRect = seatElement.getBoundingClientRect();
      const relativeRect = {
        left: seatRect.left - gridRect.left,
        right: seatRect.right - gridRect.left,
        top: seatRect.top - gridRect.top,
        bottom: seatRect.bottom - gridRect.top,
      };
      if (relativeRect.right >= minX && relativeRect.left <= maxX && relativeRect.bottom >= minY && relativeRect.top <= maxY) {
        newSelected.add(seat.id);
      }
    });
    if (selectionMode_addMode) {
      const combinedSelected = Array.from(new Set([...selectedSeatsArray, ...Array.from(newSelected)]));
      setSelectedSeats(combinedSelected);
    } else {
      setSelectedSeats(Array.from(newSelected));
    }
    setIsDrawing(false);
    setSelectionBox(null);
    setSelectionMode_addMode(false);
    if (creatingGroupMode && newSelected.size > 0) {
      setPendingGroupSeats(Array.from(newSelected));
      setGroupNameModalOpen(true);
      setCreatingGroupMode(false);
      setSelectionMode(false);
    }
  };

  const highlightSet = useMemo(() => {
    const set = new Set<string>();
    if (filters.keyword || filters.tag) {
      students
        .filter((student) => matchesFilter(student, filters))
        .forEach((student) => set.add(student.id));
    }
    if (spotlightStudentId) {
      set.add(spotlightStudentId);
    }
    return set;
  }, [filters, spotlightStudentId, students]);

  const stagePosition = useMemo(() => {
    const stageCell = classroom.cells.find(cell => cell.type === 'stage');
    if (!stageCell) return null;
    if (stageCell.row === 1) return 'top';
    if (stageCell.row === classroom.rows) return 'bottom';
    if (stageCell.col === 1) return 'left';
    if (stageCell.col === classroom.cols) return 'right';
    return null;
  }, [classroom.cells, classroom.rows, classroom.cols]);

  useEffect(() => {
    const calculateSeatSize = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const cols = classroom.cols;
      const gap = 8;
      const padding = 32;
      const wallSlotWidth = 40;
      const hasWallSlots = stagePosition !== 'left' && stagePosition !== 'right';
      const availableWidth = containerWidth - padding - (hasWallSlots ? wallSlotWidth * 2 : 0) - (cols - 1) * gap;
      let calculatedSize = Math.floor(availableWidth / cols);
      calculatedSize = Math.max(80, Math.min(180, calculatedSize));
      setSeatSize(calculatedSize);
    };
    setTimeout(calculateSeatSize, 100);
    const resizeObserver = new ResizeObserver(calculateSeatSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => {
      resizeObserver.disconnect();
    };
  }, [classroom.cols, stagePosition]);

  const cellsWithData = useMemo(() => {
    const allCells = classroom.cells
      .sort((a, b) => (a.row - b.row === 0 ? a.col - b.col : a.row - b.row));
    const customGroups = classroom.customGroups || [];
    const groupColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    const activeRedeems = getActiveRedeems();
    return allCells.map((cell) => {
      if (cell.type !== 'seat') {
        return {
          seat: cell,
          student: undefined,
          warnings: [],
          rewards: [],
          highlighted: false,
          dimmed: false,
          heatmap: undefined,
          customGroup: undefined,
        };
      }
      const groupIndex = customGroups.findIndex(group => group.seatIds.includes(cell.id));
      const customGroup = groupIndex !== -1 ? {
        ...customGroups[groupIndex],
        color: customGroups[groupIndex].color || groupColors[groupIndex % groupColors.length]
      } : undefined;
      const assignment = assignments.find((item) => item.seatId === cell.id);
      const student = students.find((item) => item.id === assignment?.studentId);
      const cellRewards = activeRedeems
        .map(redeem => {
          const reward = rewards.find(r => r.id === redeem.rewardId);
          if (!reward) return null;
          if (reward.type === 'seat_lock' && reward.payload.seatId === cell.id) {
            return reward;
          }
          if (student && redeem.studentId === student.id && (reward.type === 'deskmate_priority' || reward.type === 'zone_preference')) {
            return reward;
          }
          return null;
        })
        .filter(Boolean) as any[];
      return {
        seat: cell,
        student,
        warnings: collectWarnings(cell, student, rules, classroom.cells, assignments, students),
        rewards: cellRewards,
        highlighted: student ? highlightSet.has(student.id) : false,
        dimmed: false,
        heatmap: getHeatmapColor(filters.heatmapMode, student),
        displayLabel: getSeatDisplayLabel(cell, stagePosition),
        customGroup,
      };
    });
  }, [assignments, classroom.cells, classroom.rows, classroom.cols, classroom.customGroups, filters.heatmapMode, highlightSet, rules, students, stagePosition, getActiveRedeems, rewards]);

  const rowsOfCells = useMemo(() => {
    const rows: (typeof cellsWithData)[] = [];
    for (let r = 1; r <= classroom.rows; r++) {
      const rowCells = cellsWithData
        .filter((item) => item.seat.row === r)
        .sort((a, b) => a.seat.col - b.seat.col);
      rows.push(rowCells);
    }
    return rows;
  }, [cellsWithData, classroom.rows]);

  const handleSnapshot = () => {
    setExportContext('image');
    setPrivacyModalOpen(true);
  };

  const handlePdfExport = () => {
    setExportContext('pdf');
    setPrivacyModalOpen(true);
  };

  const handleExportConfirm = async (options: { mode: 'teacher' | 'group' | 'individual'; highlightStudentId?: string }) => {
    if (!seatGridRef.current) return;
    setPrivacyModalOpen(false);

    // 设置隐私模式（如果是 teacher 视角则关闭隐私模式）
    const isPrivacy = options.mode !== 'teacher';
    setPrivacyMode({ active: isPrivacy, highlightId: options.highlightStudentId });
    
    // 等待渲染
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      if (exportContext === 'pdf') {
        const titleSuffix = isPrivacy ? (options.mode === 'individual' ? '-个人版' : '-隐私版') : '-教师版';
        msgApi.loading({ content: '正在生成高清晰度 PDF...', key: 'pdfGen', duration: 0 });
        await exportElementToPdf(seatGridRef.current, `座位表${titleSuffix}-${useClassStore.getState().className}.pdf`);
        msgApi.success({ content: 'PDF 已生成并下载', key: 'pdfGen' });
      } else {
        const dataUrl = await toPng(seatGridRef.current, {
          cacheBust: true,
          backgroundColor: '#ffffff',
          quality: 0.95,
        });
        const suffix = options.mode === 'teacher' ? '-full' : (options.highlightStudentId
          ? `-${students.find((s) => s.id === options.highlightStudentId)?.name ?? '个人'}`
          : '-privacy');
        saveAs(dataUrl, `SeatBoard${suffix}-${Date.now()}.png`);
        msgApi.success('图片已导出');
      }
    } catch (error) {
      console.error(error);
      msgApi.error('导出失败，请重试');
    } finally {
      setPrivacyMode({ active: false });
    }
  };

  return (
    <div className="seat-grid" id="seat-grid-root" ref={containerRef}>
      {contextHolder}
      <SeatBoardToolbar
        filters={filters}
        setFilterKeyword={setFilterKeyword}
        setHeatmapMode={setHeatmapMode}
        editMode={editMode}
        setEditMode={setEditMode}
        selectionMode={selectionMode}
        setSelectionMode={setSelectionMode}
        setSelectedSeats={setSelectedSeatsFromSet}
        selectedSeats={selectedSeatsSet}
        classroom={classroom}
        assignments={assignments}
        students={students}
        seatOperations={seatOperations}
        setBatchEditOpen={setBatchEditOpen}
        setDisplaySettingsOpen={setDisplaySettingsOpen}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        handleSnapshot={handleSnapshot}
        handlePdfExport={handlePdfExport}
        msgApi={msgApi}
        creatingGroupMode={creatingGroupMode}
        onFinishCreatingGroup={() => {
          setPendingGroupSeats(selectedSeatsArray);
          setPendingGroupColor(GROUP_COLORS[(classroom.customGroups?.length || 0) % GROUP_COLORS.length]);
          setGroupNameModalOpen(true);
          setCreatingGroupMode(false);
          setSelectionMode(false);
        }}
      />
      <div
        ref={seatGridRef}
        className="relative"
        style={{
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
          {/* 选择框绘制 */}
          {selectionBox && isDrawing && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-30 pointer-events-none z-50"
              style={{
                left: Math.min(selectionBox.startX, selectionBox.endX),
                top: Math.min(selectionBox.startY, selectionBox.endY),
                width: Math.abs(selectionBox.endX - selectionBox.startX),
                height: Math.abs(selectionBox.endY - selectionBox.startY),
              }}
            />
          )}

          {classroom.groupMode === 'column' && classroom.groupSize ? (
            // 分组模式渲染
            <div className="flex flex-col gap-3">
              {/* 讲台区域（如果在上方） */}
              {(() => {
                // 如果讲台不在上方，不渲染
                if (stagePosition !== 'top') return null;

                // 获取第一行所有的 stage 和 seat 类型的单元格
                const stageRowCells = cellsWithData.filter(({ seat }) =>
                  seat.row === 1 && (seat.type === 'stage' || seat.type === 'seat')
                ).sort((a, b) => a.seat.col - b.seat.col);

                if (stageRowCells.length === 0) return null;

                const alignClass = classroom.stageAlign === 'left' ? 'justify-start'
                  : classroom.stageAlign === 'right' ? 'justify-end'
                    : 'justify-center';

                return (
                  <div className={`flex ${alignClass} mb-2`}>
                    <div className="min-w-[800px] flex justify-center gap-4">
                      {stageRowCells.map(({ seat, student, warnings, rewards, highlighted, dimmed, heatmap, displayLabel }, index) => {
                        const nextCell = stageRowCells[index + 1];
                        // 只有 stage 类型才合并
                        const isDoubleStageRow = seat.type === 'stage' && nextCell && nextCell.seat.type === 'stage' &&
                          nextCell.seat.row === seat.row &&
                          nextCell.seat.col === seat.col + 1;

                        const prevCell = stageRowCells[index - 1];
                        const isSecondOfDoubleRow = seat.type === 'stage' && prevCell && prevCell.seat.type === 'stage' &&
                          prevCell.seat.row === seat.row &&
                          prevCell.seat.col === seat.col - 1;

                        if (isSecondOfDoubleRow) return null;

                        return (
                          <Seat
                            key={seat.id}
                            seat={seat}
                            student={student}
                            warnings={warnings}
                            rewards={rewards}
                            highlighted={highlighted}
                            dimmed={dimmed}
                            heatmap={heatmap}
                            privacyMode={privacyMode}
                            spanCols={isDoubleStageRow ? 2 : 1}
                            onDoubleClick={handleSeatDoubleClick}
                            onClick={handleSeatClick}
                            selected={selectedSeatsSet.has(seat.id)}
                            displayLabel={displayLabel}
                            selectionMode={selectionMode}
                            displaySettings={displaySettings}
                            editMode={editMode}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

               <div 
                className="flex" 
                style={{ gap: (classroom.groupGap || 0) * 16 + 16 }} // 基础 16px (gap-4) + 自定义间距
              >
                {/* 左侧墙壁 */}
                <div>
                  {/* 标题占位符，确保对齐 */}
                  <div className="mb-3 h-[28px]"></div>
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: classroom.rows }).map((_, i) => (
                      <WallSlot
                        key={i}
                        side="left"
                        index={i + 1}
                        editMode={editMode === 'seat' ? 'none' : editMode}
                        doorsWindows={classroom.doorsWindows}
                        rows={classroom.rows}
                        cols={classroom.cols}
                        stagePosition={stagePosition}
                        onWallClick={handleWallClick}
                      />
                    ))}
                  </div>
                </div>

                {(() => {
                  // 获取或生成每组的列数配置
                  const groupSizes = classroom.groupSizes || (() => {
                    // 如果没有自定义配置，根据 groupSize 自动生成
                    const defaultGroupSize = classroom.groupSize || 2;
                    const groupCount = Math.ceil(classroom.cols / defaultGroupSize);
                    return Array(groupCount).fill(defaultGroupSize);
                  })();

                  // 计算每组的起始列和结束列
                  let currentCol = 1;

                  return groupSizes.map((groupSize, groupIndex) => {
                    const startCol = currentCol;
                    const endCol = Math.min(startCol + groupSize - 1, classroom.cols);
                    currentCol = endCol + 1; // 下一组的起始列，不再受间距干扰

                    // 计算该组实际的列数
                    const actualCols = endCol - startCol + 1;

                    // 确定要排除的行（如果是 top 或 bottom 讲台）
                    const excludedRow = stagePosition === 'top' ? 1 : (stagePosition === 'bottom' ? classroom.rows : -1);

                    // 只包含普通座位（或在补座模式下的空白），排除讲台所在行
                    const groupCells = cellsWithData.filter(({ seat }) =>
                      (seat.type === 'seat' || (editMode === 'seat' && seat.type === 'void')) &&
                      seat.row !== excludedRow &&
                      seat.col >= startCol && seat.col <= endCol
                    );

                    if (groupCells.length === 0) return null;

                    // 如果启用了子分组
                    if (classroom.subGroupRows) {
                      // 按行分组（每 subGroupRows 行一组）
                      const effectiveRows = new Set(groupCells.map(c => c.seat.row));
                      const sortedRows = Array.from(effectiveRows).sort((a, b) => a - b);

                      // 将行分组
                      const subGroupedRows: number[][] = [];
                      for (let i = 0; i < sortedRows.length; i += classroom.subGroupRows) {
                        subGroupedRows.push(sortedRows.slice(i, i + classroom.subGroupRows));
                      }

                      return (
                        <div key={groupIndex} className="flex-1 border-2 border-red-200 rounded-xl p-3 bg-red-50/30 relative mt-6 flex flex-col gap-4">
                          {/* 大组标题 */}
                          <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                            <span className="bg-white px-4 text-lg font-bold text-red-500 shadow-sm rounded-full border border-red-100">
                              第{['一', '二', '三', '四', '五', '六', '七', '八'][groupIndex] || (groupIndex + 1)}组
                            </span>
                          </div>

                          {subGroupedRows.map((rowsInSub, subIndex) => {
                            const subCells = groupCells.filter(c => rowsInSub.includes(c.seat.row));
                            return (
                              <div key={subIndex} className="border-2 border-red-200 rounded-xl p-3 bg-white/50 relative pt-6">
                                <div className="absolute -top-3 left-4 z-10">
                                  <span className="bg-white px-2 text-xs font-bold text-red-400 shadow-sm rounded-full border border-red-100">
                                    第{subIndex + 1}小组
                                  </span>
                                </div>
                                <div
                                  className="grid gap-2"
                                  style={{
                                    gridTemplateColumns: `repeat(${actualCols}, ${seatSize}px)`
                                  }}
                                >
                                  {subCells.map(({ seat, student, warnings, rewards, highlighted, dimmed, heatmap, displayLabel, customGroup }) => {
                                    const seatEl = (
                                      <Seat
                                        key={seat.id}
                                        seat={seat}
                                        student={student}
                                        warnings={warnings}
                                        rewards={rewards}
                                        highlighted={highlighted}
                                        dimmed={dimmed}
                                        heatmap={heatmap}
                                        privacyMode={privacyMode}
                                        onDoubleClick={handleSeatDoubleClick}
                                        onClick={handleSeatClick}
                                        selected={selectedSeatsSet.has(seat.id)}
                                        displayLabel={displayLabel}
                                        selectionMode={selectionMode}
                                        displaySettings={displaySettings}
                                        editMode={editMode}
                                      />
                                    );

                                    if (customGroup) {
                                      return (
                                        <div
                                          key={seat.id}
                                          className="relative"
                                          style={{
                                            border: `3px solid ${customGroup.color || '#3b82f6'}`,
                                            borderRadius: '8px',
                                            padding: '4px',
                                            backgroundColor: `${customGroup.color || '#3b82f6'}08`,
                                          }}
                                        >
                                          <div
                                            className="absolute -top-3 left-2 px-2 py-0.5 text-xs font-bold rounded-full"
                                            style={{
                                              backgroundColor: customGroup.color || '#3b82f6',
                                              color: 'white',
                                              fontSize: '10px',
                                              zIndex: 10,
                                            }}
                                          >
                                            {customGroup.name}
                                          </div>
                                          {seatEl}
                                        </div>
                                      );
                                    }
                                    return seatEl;
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    return (
                      <div key={groupIndex} className="flex-1 border-2 border-red-200 rounded-xl p-3 bg-red-50/30 relative mt-6">
                        {/* 组标题 - 压在边框上 */}
                        <div className="absolute -top-4 left-0 right-0 flex justify-center">
                          <span className="bg-white px-4 text-lg font-bold text-red-500 shadow-sm rounded-full border border-red-100">
                            第{['一', '二', '三', '四', '五', '六', '七', '八'][groupIndex] || (groupIndex + 1)}组
                          </span>
                        </div>
                        {/* 组内座位 */}
                        <div
                          className="grid gap-2 mt-2"
                          style={{
                            gridTemplateColumns: `repeat(${actualCols}, ${seatSize}px)`,
                          }}
                        >
                          {groupCells.map(({ seat, student, warnings, rewards, highlighted, dimmed, heatmap, displayLabel, customGroup }) => {
                            const seatEl = (
                              <Seat
                                key={seat.id}
                                seat={seat}
                                student={student}
                                warnings={warnings}
                                rewards={rewards}
                                highlighted={highlighted}
                                dimmed={dimmed}
                                heatmap={heatmap}
                                privacyMode={privacyMode}
                                onDoubleClick={handleSeatDoubleClick}
                                onClick={handleSeatClick}
                                selected={selectedSeatsSet.has(seat.id)}
                                displayLabel={displayLabel}
                                selectionMode={selectionMode}
                                displaySettings={displaySettings}
                                editMode={editMode}
                              />
                            );

                            if (customGroup) {
                              return (
                                <div
                                  key={seat.id}
                                  className="relative"
                                  style={{
                                    border: `3px solid ${customGroup.color || '#3b82f6'}`,
                                    borderRadius: '8px',
                                    padding: '4px',
                                    backgroundColor: `${customGroup.color || '#3b82f6'}08`,
                                  }}
                                >
                                  <div
                                    className="absolute -top-3 left-2 px-2 py-0.5 text-xs font-bold rounded-full"
                                    style={{
                                      backgroundColor: customGroup.color || '#3b82f6',
                                      color: 'white',
                                      fontSize: '10px',
                                      zIndex: 10,
                                    }}
                                  >
                                    {customGroup.name}
                                  </div>
                                  {seatEl}
                                </div>
                              );
                            }
                            return seatEl;
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* 右侧墙壁 */}
                <div>
                  {/* 标题占位符，确保对齐 */}
                  <div className="mb-3 h-[28px]"></div>
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: classroom.rows }).map((_, i) => (
                      <WallSlot
                        key={i}
                        side="right"
                        index={i + 1}
                        editMode={editMode === 'seat' ? 'none' : editMode}
                        doorsWindows={classroom.doorsWindows}
                        rows={classroom.rows}
                        cols={classroom.cols}
                        stagePosition={stagePosition}
                        onWallClick={handleWallClick}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 讲台区域（如果在下方） */}
              {(() => {
                // 如果讲台不在下方，不渲染
                if (stagePosition !== 'bottom') return null;

                // 获取最后一行所有的 stage 和 seat 类型的单元格
                const stageRowCells = cellsWithData.filter(({ seat }) =>
                  seat.row === classroom.rows && (seat.type === 'stage' || seat.type === 'seat')
                ).sort((a, b) => a.seat.col - b.seat.col);

                if (stageRowCells.length === 0) return null;

                const alignClass = classroom.stageAlign === 'left' ? 'justify-start'
                  : classroom.stageAlign === 'right' ? 'justify-end'
                    : 'justify-center';

                return (
                  <div className={`flex ${alignClass} mt-2`}>
                    <div className="min-w-[800px] flex justify-center gap-4">
                      {stageRowCells.map(({ seat, student, warnings, rewards, highlighted, dimmed, heatmap, displayLabel }, index) => {
                        const nextCell = stageRowCells[index + 1];
                        const isDoubleStageRow = seat.type === 'stage' && nextCell && nextCell.seat.type === 'stage' &&
                          nextCell.seat.row === seat.row &&
                          nextCell.seat.col === seat.col + 1;

                        const prevCell = stageRowCells[index - 1];
                        const isSecondOfDoubleRow = seat.type === 'stage' && prevCell && prevCell.seat.type === 'stage' &&
                          prevCell.seat.row === seat.row &&
                          prevCell.seat.col === seat.col - 1;

                        if (isSecondOfDoubleRow) return null;

                        return (
                          <Seat
                            key={seat.id}
                            seat={seat}
                            student={student}
                            warnings={warnings}
                            rewards={rewards}
                            highlighted={highlighted}
                            dimmed={dimmed}
                            heatmap={heatmap}
                            privacyMode={privacyMode}
                            spanCols={isDoubleStageRow ? 2 : 1}
                            onDoubleClick={handleSeatDoubleClick}
                            onClick={handleSeatClick}
                            selected={selectedSeatsSet.has(seat.id)}
                            displayLabel={displayLabel}
                            selectionMode={selectionMode}
                            displaySettings={displaySettings}
                            editMode={editMode}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            // 非分组模式渲染
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: stagePosition === 'left' || stagePosition === 'right'
                  ? `repeat(${classroom.cols}, ${seatSize}px)`
                  : `min-content repeat(${classroom.cols}, ${seatSize}px) min-content`,
              }}
            >
              {/* 顶部墙壁插槽（当讲台在左右时） */}
              {(stagePosition === 'left' || stagePosition === 'right') && (
                <>
                  {Array.from({ length: classroom.cols }).map((_, i) => (
                    <WallSlot
                      key={`top-${i}`}
                      side="top"
                      index={i + 1}
                      editMode={editMode === 'seat' ? 'none' : editMode}
                      doorsWindows={classroom.doorsWindows}
                      rows={classroom.rows}
                      cols={classroom.cols}
                      stagePosition={stagePosition}
                      onWallClick={handleWallClick}
                    />
                  ))}
                </>
              )}

              {rowsOfCells.map((rowCells, rowIndex) => {
                const rowNum = rowIndex + 1;
                return (
                  <>
                    {/* 左侧墙壁插槽（仅当讲台在上下时） */}
                    {stagePosition !== 'left' && stagePosition !== 'right' && (
                      <WallSlot
                        side="left"
                        index={rowNum}
                        editMode={editMode === 'seat' ? 'none' : editMode}
                        doorsWindows={classroom.doorsWindows}
                        rows={classroom.rows}
                        cols={classroom.cols}
                        stagePosition={stagePosition}
                        onWallClick={handleWallClick}
                      />
                    )}

                    {/* 该行的座位 */}
                    {rowCells.map(({ seat, student, warnings, rewards, highlighted, dimmed, heatmap, displayLabel, customGroup }, index) => {
                      // 检测连续的讲台格子，合并显示
                      if (seat.type === 'stage') {
                        // 检查同一行的连续讲台（上/下方讲台）
                        const nextCell = rowCells[index + 1];
                        const isDoubleStageRow = nextCell && nextCell.seat.type === 'stage' &&
                          nextCell.seat.row === seat.row &&
                          nextCell.seat.col === seat.col + 1;

                        // 检查同一列的连续讲台（左/右侧讲台）
                        const nextRowCell = cellsWithData.find(c =>
                          c.seat.type === 'stage' &&
                          c.seat.col === seat.col &&
                          c.seat.row === seat.row + 1
                        );
                        const isDoubleStageCol = !!nextRowCell;

                        // 如果是双讲台的第二个格子，跳过渲染
                        const prevCell = rowCells[index - 1];
                        const isSecondOfDoubleRow = prevCell && prevCell.seat.type === 'stage' &&
                          prevCell.seat.row === seat.row &&
                          prevCell.seat.col === seat.col - 1;

                        const prevRowCell = cellsWithData.find(c =>
                          c.seat.type === 'stage' &&
                          c.seat.col === seat.col &&
                          c.seat.row === seat.row - 1
                        );
                        const isSecondOfDoubleCol = !!prevRowCell;

                        if (isSecondOfDoubleRow || isSecondOfDoubleCol) {
                          return null;
                        }

                        // 渲染第一个格子，如果是双讲台则跨列/跨行
                        return (
                          <Seat
                            key={seat.id}
                            seat={seat}
                            student={student}
                            warnings={warnings}
                            highlighted={highlighted}
                            dimmed={dimmed}
                            heatmap={heatmap}
                            privacyMode={privacyMode}
                            spanCols={isDoubleStageRow ? 2 : 1}
                            spanRows={isDoubleStageCol ? 2 : 1}
                            onDoubleClick={handleSeatDoubleClick}
                            onClick={handleSeatClick}
                            selected={selectedSeatsSet.has(seat.id)}
                            displayLabel={displayLabel}
                            selectionMode={selectionMode}
                            displaySettings={displaySettings}
                            editMode={editMode}
                          />
                        );
                      }

                      // 普通座位 - 可能有自定义分组边框
                      const seatElement = (
                        <Seat
                          key={seat.id}
                          seat={seat}
                          student={student}
                          warnings={warnings}
                          rewards={rewards}
                          highlighted={highlighted}
                          dimmed={dimmed}
                          heatmap={heatmap}
                          privacyMode={privacyMode}
                          onDoubleClick={handleSeatDoubleClick}
                          onClick={handleSeatClick}
                          selected={selectedSeatsSet.has(seat.id)}
                          displayLabel={displayLabel}
                          selectionMode={selectionMode}
                          displaySettings={displaySettings}
                          editMode={editMode}
                        />
                      );

                      // 如果是自由分组模式且座位属于某个分组，添加边框
                      if (classroom.groupMode === 'custom' && customGroup) {
                        return (
                          <div
                            key={seat.id}
                            className="relative"
                            style={{
                              border: `3px solid ${customGroup.color}`,
                              borderRadius: '8px',
                              padding: '4px',
                              backgroundColor: `${customGroup.color}08`,
                            }}
                          >
                            {/* 组名标签 */}
                            <div
                              className="absolute -top-3 left-2 px-2 py-0.5 text-xs font-bold rounded-full"
                              style={{
                                backgroundColor: customGroup.color,
                                color: 'white',
                                fontSize: '10px',
                                zIndex: 10,
                              }}
                            >
                              {customGroup.name}
                            </div>
                            {seatElement}
                          </div>
                        );
                      }

                      return seatElement;
                    })}

                    {/* 右侧墙壁插槽（仅当讲台在上下时） */}
                    {stagePosition !== 'left' && stagePosition !== 'right' && (
                      <WallSlot
                        side="right"
                        index={rowNum}
                        editMode={editMode === 'seat' ? 'none' : editMode}
                        doorsWindows={classroom.doorsWindows}
                        rows={classroom.rows}
                        cols={classroom.cols}
                        stagePosition={stagePosition}
                        onWallClick={handleWallClick}
                      />
                    )}
                  </>
                );
              })}

              {/* 底部墙壁插槽（当讲台在左右时） */}
              {(stagePosition === 'left' || stagePosition === 'right') && (
                <>
                  {Array.from({ length: classroom.cols }).map((_, i) => (
                    <WallSlot
                      key={`bottom-${i}`}
                      side="bottom"
                      index={i + 1}
                      editMode={editMode === 'seat' ? 'none' : editMode}
                      doorsWindows={classroom.doorsWindows}
                      rows={classroom.rows}
                      cols={classroom.cols}
                      stagePosition={stagePosition}
                      onWallClick={handleWallClick}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      <SeatLegend />
      <PrivacyExportModal
        open={privacyModalOpen}
        students={students}
        onCancel={() => setPrivacyModalOpen(false)}
        onConfirm={handleExportConfirm}
      />

      {/* 编辑/新建学生对话框 */}
      <AddStudentModal
        open={modalOpen}
        editingStudent={editingStudent}
        stagePosition={stagePosition}
        onCancel={() => {
          setModalOpen(false);
          setEditingStudent(null);
          setTargetSeatId(undefined);
        }}
        onConfirm={(studentData, modalTargetSeatId) => {
          // 使用模态框传入的座位ID，或者使用双击时记录的座位ID
          const finalTargetSeatId = modalTargetSeatId || targetSeatId;

          if (editingStudent) {
            // 编辑现有学生
            updateStudent(editingStudent.id, studentData);

            // 获取当前分配情况
            const currentAssignment = assignments.find(a => a.studentId === editingStudent.id);
            const currentSeatId = currentAssignment?.seatId;

            if (finalTargetSeatId && currentSeatId !== finalTargetSeatId) {
              // 目标座位与当前不一致（或从无座变有座）
              if (currentSeatId) {
                // 已经在座位表上，使用 swap 逻辑（处理潜在冲突）
                swapSeats(currentSeatId, finalTargetSeatId);
              } else {
                // 原来不在座位表上，需要强制分配（并替换目标位置原有的学生，使其变回待分配状态）
                const newAssignments = assignments.map(a => {
                  if (a.seatId === finalTargetSeatId) {
                    return { ...a, studentId: editingStudent.id };
                  }
                  return a;
                });
                batchUpdateAssignments(newAssignments);
              }
              msgApi.success('学生信息和座位已更新');
            } else if (!finalTargetSeatId && currentSeatId) {
              // 取消座位分配（变回待分配）
              const newAssignments = assignments.map(a => {
                if (a.seatId === currentSeatId) {
                  return { ...a, studentId: null };
                }
                return a;
              });
              batchUpdateAssignments(newAssignments);
              msgApi.success('学生信息已更新，已从座位表移除');
            } else {
              msgApi.success('学生信息已更新');
            }
          } else {
            // 新建学生
            const currentClassName = useClassStore.getState().className;
            const classList = useClassStore.getState().classList;
            const classExists = classList.some(cls => cls.fullName === studentData.className);

            addStudent(studentData, finalTargetSeatId);

            // 根据学生班级给出不同的提示
            if (studentData.className && studentData.className !== currentClassName) {
              if (!classExists) {
                msgApi.success(`已自动创建班级"${studentData.className}"并添加学生，请切换到该班级查看`, 4);
              } else {
                msgApi.warning(`学生已添加到"${studentData.className}"，请切换到该班级查看`, 3);
              }
            } else {
              msgApi.success(finalTargetSeatId ? '学生已创建并分配到座位' : '学生已创建');
            }
          }

          setModalOpen(false);
          setEditingStudent(null);
          setTargetSeatId(undefined);
        }}
      />

      {/* 输入组名对话框 */}
      <DraggableModal
        title={editingGroupId ? "编辑分组" : "创建分组"}
        open={groupNameModalOpen}
        onOk={() => {
          const groupNameInput = document.getElementById('group-name-input') as HTMLInputElement;
          const groupName = groupNameInput?.value.trim();

          if (!groupName) {
            msgApi.warning('请输入组名');
            return;
          }

          if (pendingGroupSeats.length === 0) {
            msgApi.warning('未选择任何座位');
            setGroupNameModalOpen(false);
            return;
          }

          if (editingGroupId) {
            // 更新现有分组
            const updatedGroups = (classroom.customGroups || []).map(g =>
              g.id === editingGroupId
                ? { ...g, name: groupName, color: pendingGroupColor }
                : g
            );
            setClassroomDimensions(classroom.rows, classroom.cols, { customGroups: updatedGroups });
            msgApi.success(`已更新分组"${groupName}"`);
          } else {
            // 创建新分组
            const newGroup = {
              id: crypto.randomUUID(),
              name: groupName,
              seatIds: pendingGroupSeats,
              color: pendingGroupColor,
            };

            const newGroups = [...(classroom.customGroups || []), newGroup];
            setClassroomDimensions(classroom.rows, classroom.cols, { customGroups: newGroups });

            msgApi.success(`已创建分组"${groupName}"，包含${pendingGroupSeats.length}个座位`);
          }

          setGroupNameModalOpen(false);
          setPendingGroupSeats([]);
          setSelectedSeats([]);
          setEditingGroupId(null);
        }}
        onCancel={() => {
          setGroupNameModalOpen(false);
          setPendingGroupSeats([]);
          setSelectedSeats([]);
          setEditingGroupId(null);
        }}
      >
        <div className="py-4">
          <p className="mb-2 text-sm text-slate-600">
            已选择 <span className="font-bold text-blue-600">{pendingGroupSeats.length}</span> 个座位
          </p>
          <input
            id="group-name-input"
            type="text"
            placeholder="请输入组名，如：第一组"
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const okButton = document.querySelector('.ant-modal-footer button.ant-btn-primary') as HTMLButtonElement;
                okButton?.click();
              }
            }}
          />
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">选择颜色</label>
            <div className="flex gap-2 flex-wrap">
              {GROUP_COLORS.map(color => (
                <div
                  key={color}
                  className={`w-6 h-6 rounded-full cursor-pointer border-2 transition-all ${pendingGroupColor === color ? 'border-slate-600 scale-125 shadow-md' : 'border-transparent hover:scale-110'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setPendingGroupColor(color)}
                />
              ))}
              {/* 自定义颜色 */}
              <div className="relative">
                <div
                  className={`w-6 h-6 rounded-full cursor-pointer border-2 flex items-center justify-center overflow-hidden transition-all ${!GROUP_COLORS.includes(pendingGroupColor) ? 'border-slate-600 scale-125 shadow-md' : 'border-slate-200 hover:scale-110'}`}
                  style={{
                    background: !GROUP_COLORS.includes(pendingGroupColor) ? pendingGroupColor : 'white'
                  }}
                >
                  {GROUP_COLORS.includes(pendingGroupColor) && <span className="text-xs text-slate-400 font-bold">+</span>}
                </div>
                <input
                  type="color"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={pendingGroupColor}
                  onChange={(e) => setPendingGroupColor(e.target.value)}
                  title="自定义颜色"
                />
              </div>
            </div>
          </div>
        </div>
      </DraggableModal>

      {/* 显示设置对话框 */}
      <DisplaySettingsModal
        open={displaySettingsOpen}
        settings={displaySettings}
        onCancel={() => setDisplaySettingsOpen(false)}
        onConfirm={(newSettings) => {
          setDisplaySettings(newSettings);
          setDisplaySettingsOpen(false);
          msgApi.success('显示设置已保存');
        }}
      />

      {/* 批量编辑弹窗 */}
      <BatchEditStudentModal
        open={batchEditOpen}
        onClose={() => {
          setBatchEditOpen(false);
        }}
        selectedStudents={
          classroom.cells
            .filter(cell => selectedSeatsSet.has(cell.id))
            .map(cell => assignments.find(a => a.seatId === cell.id)?.studentId)
            .filter(Boolean)
            .map(studentId => students.find(s => s.id === studentId))
            .filter(Boolean) as Student[]
        }
      />
    </div>
  );
};

export default SeatBoard;

