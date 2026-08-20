import { create } from 'zustand';
import type {
  ClassroomConfig,
  SeatAssignment,
  SeatCell,
  SeatCellType,
  SeatingRuleConfig,
  Student,
  TemporaryLockRule,
  CustomFieldDefinition,
  PointsLog,
  Reward,
  RewardRedeem,
  Exam,
  ExamScore,
  DisplaySettings,
  SeatLayoutScheme,
} from '../types/models';
import { generateSeatingPlan } from '../services/seatEngine';
import { parseStudentWorkbook } from '../utils/xlsx';
import {
  DEFAULT_CLASS_ID,
  DEFAULT_CLASS_NAME,
  createDefaultSnapshot,
  buildAssignmentsForClassroom,
  createSeatGrid,
} from '../utils/defaultSnapshot';
import { saveHistory } from '../utils/historyHelper';
import { getStorageProvider } from '../services/storage';
import { downloadBackup } from '../utils/backupHelper';

type Summary = {
  className: string;
  totalStudents: number;
  availableSeats: number;
  genderRatio: string;
};

type HeatmapMode = 'none' | 'vision' | 'score';

type FilterState = {
  keyword: string;
  tag?: string;
  heatmapMode: HeatmapMode;
};

import type { ClassInfo } from '../types/models';

type ClassStore = {
  classId: string;
  className: string;
  classList: ClassInfo[]; // 所有班级列表
  students: Student[];
  classroom: ClassroomConfig;
  assignments: SeatAssignment[];
  rules: SeatingRuleConfig;
  loading: boolean;
  initialized: boolean;
  error?: string;
  summary: Summary;
  filters: FilterState;
  displaySettings: DisplaySettings;
  spotlightStudentId?: string;
  selectionMode: boolean;
  selectedSeats: string[];
  setSelectionMode: (mode: boolean) => void;
  setSelectedSeats: (seats: string[]) => void;
  toggleSeatSelection: (seatId: string) => void;
  clearSelection: () => void;
  persist: () => void;
  initialize: () => Promise<void>;
  setRules: (partial: Partial<SeatingRuleConfig>) => void;
  setClassroomDimensions: (rows: number, cols: number, extraConfig?: Partial<ClassroomConfig>) => void;
  updateClassroomConfig: (updates: Partial<ClassroomConfig>) => void;
  setStagePosition: (position: 'none' | 'top' | 'bottom' | 'left' | 'right') => void;
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void;
  toggleSeatType: (seatId: string, nextType: SeatCellType) => void;
  runAutoArrange: () => void;
  swapSeats: (a: string, b: string) => void;
  batchUpdateAssignments: (newAssignments: SeatAssignment[]) => void;
  importStudentsFromXlsx: (file: File) => Promise<void>;
  addStudent: (student: Omit<Student, 'id'>, targetSeatId?: string) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  setFilterKeyword: (keyword: string) => void;
  setHighlightTag: (tag?: string) => void;
  setHeatmapMode: (mode: HeatmapMode) => void;
  setSpotlightStudent: (studentId?: string) => void;
  addMutexPair: (pair: [string, string]) => void;
  removeMutexPair: (id: string) => void;
  addBindingPair: (pair: [string, string]) => void;
  removeBindingPair: (id: string) => void;
  addTemporaryLock: (payload: { studentId: string; seatId: string; expiresAt: string }) => void;
  removeTemporaryLock: (id: string) => void;
  cleanupTemporaryLocks: () => void;
  // 班级管理方法
  addNewClass: (grade: string, className: string) => void;
  renameClass: (classId: string, grade: string, className: string) => void;
  switchClass: (classId: string) => void;
  deleteClass: (classId: string) => void;
  // 课程和课表管理方法
  addCourse: (name: string, teacher?: string, color?: string) => void;
  updateCourse: (courseId: string, updates: { name?: string; teacher?: string; color?: string }) => void;
  deleteCourse: (courseId: string) => void;
  updateSchedule: (schedule: any) => void;
  // 操作历史管理
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  // 自定义字段管理
  addCustomField: (field: Omit<CustomFieldDefinition, 'id' | 'order'>) => void;
  updateCustomField: (fieldId: string, updates: Partial<CustomFieldDefinition>) => void;
  deleteCustomField: (fieldId: string) => void;
  // 门窗管理
  addDoorWindow: (type: 'door' | 'window', position: 'left' | 'right' | 'top' | 'bottom', index: number) => void;
  removeDoorWindow: (id: string) => void;
  updateDoorWindow: (id: string, updates: { type?: 'door' | 'window'; position?: 'left' | 'right' | 'top' | 'bottom'; index?: number }) => void;
  // 积分系统
  pointsLogs: PointsLog[]; // 积分流水记录
  rewards: Reward[]; // 奖励配置列表
  rewardRedeems: RewardRedeem[]; // 兑换记录列表
  addPoints: (studentId: string, delta: number, reasonType: PointsLog['reasonType'], reasonDetail: string, operator: string) => void;
  getPointsLogs: (studentId?: string) => PointsLog[];
  addReward: (reward: Omit<Reward, 'id'>) => void;
  updateReward: (rewardId: string, updates: Partial<Reward>) => void;
  deleteReward: (rewardId: string) => void;
  toggleRewardStatus: (rewardId: string) => void;
  redeemReward: (studentId: string, rewardId: string, linkedWishId?: string) => void;
  cancelRedeem: (redeemId: string) => void;
  getActiveRedeems: (studentId?: string) => RewardRedeem[];
  // 数据导出和导入
  exportData: () => any;
  importData: (data: any) => void;
  // 考试成绩管理
  addExam: (exam: Omit<Exam, 'id' | 'createdAt'>) => void;
  updateExam: (examId: string, updates: Partial<Exam>) => void;
  deleteExam: (examId: string) => void;
  addExamScore: (score: Omit<ExamScore, 'id'>) => void;
  updateExamScore: (scoreId: string, updates: Partial<ExamScore>) => void;
  deleteExamScore: (scoreId: string) => void;
  getExamScores: (examId?: string, studentId?: string) => ExamScore[];
  moveBatchSeats: (activeSeatId: string, overSeatId: string, currentSelectedSeats: string[]) => void;
  fullReset: () => Promise<void>;
  // 座位表方案管理
  seatSchemes: SeatLayoutScheme[];
  saveSeatScheme: (name: string) => void;
  applySeatScheme: (schemeId: string) => void;
  deleteSeatScheme: (schemeId: string) => void;
  renameSeatScheme: (schemeId: string, name: string) => void;
};

const summarize = (
  className: string,
  students: Student[],
  classroom: ClassroomConfig,
): Summary => {
  const male = students.filter((s) => s.gender === 'male').length;
  const female = students.length - male;
  return {
    className,
    totalStudents: students.length,
    availableSeats: classroom.cells.filter((cell) => cell.type === 'seat').length,
    genderRatio: `${male}♂ / ${female}♀`,
  };
};

const updateAssignmentsWithPlan = (
  plan: SeatAssignment[],
  classroom: ClassroomConfig,
): SeatAssignment[] => {
  const seatIds = new Set(classroom.cells.filter((cell) => cell.type === 'seat').map((cell) => cell.id));
  return plan.filter((assignment) => seatIds.has(assignment.seatId));
};

const isLockExpired = (lock: TemporaryLockRule) =>
  new Date(lock.expiresAt).getTime() < Date.now();

const snapshotFromState = (state: ClassStore) => ({
  students: state.students,
  classroom: state.classroom,
  assignments: state.assignments,
  rules: state.rules,
});

export const useClassStore = create<ClassStore>((set, get) => {
  const snapshot = createDefaultSnapshot();
  const initialSummary = summarize(DEFAULT_CLASS_NAME, snapshot.students, snapshot.classroom);

  const persist = () => {
    const state = get();
    const storage = getStorageProvider();

    // 核心安全检查：如果 classList 意外为空，至少包含当前班级
    let currentClassList = state.classList;
    if (currentClassList.length === 0) {
      console.warn('[Store] classList is empty during persist, recovering from active state...');
      // 这里我们可以通过当前状态反向构造一个班级条目
      const activeClassEntry: ClassInfo = {
        id: state.classId,
        grade: '', // 无法得知具体年级
        className: '', 
        fullName: state.className,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        students: state.students,
        classroom: state.classroom,
        assignments: state.assignments,
        rules: state.rules,
        displaySettings: state.displaySettings,
        pointsLogs: state.pointsLogs,
        rewards: state.rewards,
        rewardRedeems: state.rewardRedeems,
        courses: [], 
        schedule: { periods: [] },
        history: [],
        historyIndex: -1,
        customFields: [],
        classCustomData: {},
        exams: [],
        examScores: [],
      };
      currentClassList = [activeClassEntry];
    } else {
      // 正常同步：将内存中的活跃状态同步回列表
      currentClassList = currentClassList.map((c) => {
        if (c.id === state.classId) {
          return {
            ...c,
            students: state.students,
            classroom: state.classroom,
            assignments: state.assignments,
            rules: state.rules,
            displaySettings: state.displaySettings,
            pointsLogs: state.pointsLogs,
            rewards: state.rewards,
            rewardRedeems: state.rewardRedeems,
            seatSchemes: state.seatSchemes,
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });
    }

    const payload = {
      classId: state.classId,
      className: state.className,
      snapshot: snapshotFromState(state),
      classList: currentClassList,
    };

    storage.saveSnapshot(payload as any).catch((error) => {
      console.error('Failed to persist snapshot', error);
    });
  };

  const ensureLockFreshness = (rules: SeatingRuleConfig) => ({
    ...rules,
    temporaryLocks: rules.temporaryLocks.filter((lock) => !isLockExpired(lock)),
  });

  // 初始化默认班级列表
  const now = new Date().toISOString();
  const defaultCourses = [
    { id: crypto.randomUUID(), name: '语文', teacher: '张老师', color: 'blue' },
    { id: crypto.randomUUID(), name: '数学', teacher: '李老师', color: 'green' },
    { id: crypto.randomUUID(), name: '英语', teacher: '王老师', color: 'orange' },
    { id: crypto.randomUUID(), name: '体育', teacher: '刘老师', color: 'cyan' },
  ];
  const defaultClass: ClassInfo = {
    id: DEFAULT_CLASS_ID,
    grade: '三年级',
    className: '二班',
    fullName: DEFAULT_CLASS_NAME,
    createdAt: now,
    updatedAt: now,
    students: snapshot.students,
    classroom: snapshot.classroom,
    assignments: snapshot.assignments,
    rules: snapshot.rules,
    courses: defaultCourses,
    schedule: { periods: [] },
    history: [],
    historyIndex: -1,
    customFields: [],
    classCustomData: {},
    exams: [],
    examScores: [],
    pointsLogs: [],
    rewards: [],
    rewardRedeems: [],
  };

  const defaultDisplaySettings: DisplaySettings = {
    nameFontSize: 16,
    detailsFontSize: 10,
    showStudentNumber: true,
    showGenderHeight: true,
    showVision: true,
    seatLabelSize: 9,
  };

  return {
    classId: DEFAULT_CLASS_ID,
    className: DEFAULT_CLASS_NAME,
    classList: [defaultClass],
    students: snapshot.students,
    classroom: snapshot.classroom,
    assignments: snapshot.assignments,
    rules: snapshot.rules,
    loading: false,
    initialized: false,
    error: undefined,
    summary: initialSummary,
    filters: {
      keyword: '',
      tag: undefined,
      heatmapMode: 'none',
    },
    displaySettings: defaultDisplaySettings,
    selectionMode: false,
    selectedSeats: [],
    spotlightStudentId: undefined,
    pointsLogs: [],
    rewards: [],
    rewardRedeems: [],
    seatSchemes: [],
    persist,
    initialize: async () => {
      if (get().initialized) return;
      const storage = getStorageProvider();

      set({ loading: true });
      try {
        const payload = await storage.loadSnapshot();
        if (!payload) {
          set({ loading: false, initialized: true });
          return;
        }

        let loadedClassList = (payload as any).classList || [];
        
        // 关键修复：确保默认班级始终在列表中
        if (!loadedClassList.find((c: ClassInfo) => c.id === DEFAULT_CLASS_ID)) {
          console.log('[Store] Default class missing from loaded list, recovering...');
          loadedClassList = [defaultClass, ...loadedClassList];
        }

        set({
          classId: payload.classId,
          className: payload.className,
          students: payload.snapshot.students,
          classroom: payload.snapshot.classroom,
          assignments: payload.snapshot.assignments,
          rules: ensureLockFreshness(payload.snapshot.rules),
          displaySettings: loadedClassList.find((c: ClassInfo) => c.id === payload.classId)?.displaySettings || defaultDisplaySettings,
          pointsLogs: loadedClassList.find((c: ClassInfo) => c.id === payload.classId)?.pointsLogs || payload.pointsLogs || [],
          rewards: loadedClassList.find((c: ClassInfo) => c.id === payload.classId)?.rewards || payload.rewards || [],
          rewardRedeems: loadedClassList.find((c: ClassInfo) => c.id === payload.classId)?.rewardRedeems || payload.rewardRedeems || [],
          seatSchemes: loadedClassList.find((c: ClassInfo) => c.id === payload.classId)?.seatSchemes || [],
          classList: loadedClassList,
          summary: summarize(payload.className, payload.snapshot.students, payload.snapshot.classroom),
          loading: false,
          initialized: true,
        });
      } catch (error) {
        console.error(error);
        set({ loading: false, initialized: true, error: '无法加载本地数据' });
      }
    },
    setRules: (partial) => {
      set((state) => {
        const nextRules = ensureLockFreshness({ ...state.rules, ...partial });
        return { rules: nextRules };
      });
      persist();
    },
    setClassroomDimensions: (rows, cols, extraConfig) => {
      console.log('[Store] setClassroomDimensions 被调用，参数:', { rows, cols, extraConfig });
      set((state) => {
        // 1. 检测当前是否有讲台，以及讲台的位置
        let stagePosition: 'top' | 'bottom' | 'left' | 'right' | null = null;
        let hasStage = false;

        state.classroom.cells.forEach((cell) => {
          if (cell.type === 'stage') {
            hasStage = true;
            // 根据讲台位置判断方向
            if (cell.row === 1) {
              stagePosition = 'top';
            } else if (cell.row === state.classroom.rows) {
              stagePosition = 'bottom';
            } else if (cell.col === 1) {
              stagePosition = 'left';
            } else if (cell.col === state.classroom.cols) {
              stagePosition = 'right';
            }
          }
        });

        // 2. 创建新网格（全部初始化为座位）
        const newCells = createSeatGrid(rows, cols);

        // 2.5. 保留原有座位的类型和标签（除了讲台，讲台会重新计算）
        const cellsWithPreservedTypes = newCells.map((newCell): SeatCell => {
          // 查找对应的旧座位
          const oldCell = state.classroom.cells.find(
            c => c.row === newCell.row && c.col === newCell.col
          );

          // 如果找到旧座位且不是讲台类型，保留其类型和标签
          if (oldCell && oldCell.type !== 'stage') {
            return {
              ...newCell,
              type: oldCell.type,
              label: oldCell.label,
            };
          }

          return newCell;
        });

        // 3. 如果之前有讲台，在新网格中重新居中设置
        // 计算居中位置（支持奇偶数）
        const isEvenCols = cols % 2 === 0;
        const isEvenRows = rows % 2 === 0;

        // 对于偶数列，讲台占中间两格；奇数列占一格
        const stageColStart = isEvenCols ? cols / 2 : Math.ceil(cols / 2);
        const stageColEnd = isEvenCols ? cols / 2 + 1 : Math.ceil(cols / 2);

        // 对于偶数行，讲台占中间两格；奇数行占一格
        const stageRowStart = isEvenRows ? rows / 2 : Math.ceil(rows / 2);
        const stageRowEnd = isEvenRows ? rows / 2 + 1 : Math.ceil(rows / 2);

        const finalCells = cellsWithPreservedTypes.map((cell): SeatCell => {
          if (!hasStage || !stagePosition) {
            // 没有讲台，直接返回座位
            return cell;
          }

          // 获取最新的显示配置和对齐方式
          const showStageSideSeats = extraConfig?.showStageSideSeats ?? state.classroom.showStageSideSeats ?? false;
          const stageAlign = extraConfig?.stageAlign ?? state.classroom.stageAlign ?? 'center';

          // 根据讲台位置重新计算居中位置
          if (stagePosition === 'top') {
            if (cell.row === 1) {
              // 根据对齐方式确定讲台列范围
              let currentStageColStart = stageColStart;
              let currentStageColEnd = stageColEnd;

              if (stageAlign === 'left') {
                currentStageColStart = 1;
                currentStageColEnd = isEvenCols ? 2 : 1;
              } else if (stageAlign === 'right') {
                currentStageColStart = isEvenCols ? cols - 1 : cols;
                currentStageColEnd = cols;
              }

              if (cell.col >= currentStageColStart && cell.col <= currentStageColEnd) {
                return { ...cell, type: 'stage' };
              } else if (showStageSideSeats) {
                // 护法座位逻辑
                if (stageAlign === 'left') {
                  // 左对齐时，护法在讲台右侧两个座位
                  if (cell.col === currentStageColEnd + 1 || cell.col === currentStageColEnd + 2) {
                    // 确保不超出列范围
                    if (cell.col <= cols) return { ...cell, type: 'seat' };
                  }
                } else if (stageAlign === 'right') {
                  // 右对齐时，护法在讲台左侧两个座位
                  if (cell.col === currentStageColStart - 1 || cell.col === currentStageColStart - 2) {
                    // 确保不超出列范围
                    if (cell.col >= 1) return { ...cell, type: 'seat' };
                  }
                } else {
                  // 居中对齐时，护法紧贴讲台左右两侧
                  if (cell.col === currentStageColStart - 1 || cell.col === currentStageColEnd + 1) {
                    // 确保不超出列范围
                    if (cell.col >= 1 && cell.col <= cols) return { ...cell, type: 'seat' };
                  }
                }
                return { ...cell, type: 'void' };
              } else {
                return { ...cell, type: 'void' };
              }
            }
          } else if (stagePosition === 'bottom') {
            if (cell.row === rows) {
              // 根据对齐方式确定讲台列范围
              let currentStageColStart = stageColStart;
              let currentStageColEnd = stageColEnd;

              if (stageAlign === 'left') {
                currentStageColStart = 1;
                currentStageColEnd = isEvenCols ? 2 : 1;
              } else if (stageAlign === 'right') {
                currentStageColStart = isEvenCols ? cols - 1 : cols;
                currentStageColEnd = cols;
              }

              if (cell.col >= currentStageColStart && cell.col <= currentStageColEnd) {
                return { ...cell, type: 'stage' };
              } else if (showStageSideSeats) {
                // 护法座位逻辑
                if (stageAlign === 'left') {
                  // 左对齐时，护法在讲台右侧两个座位
                  if (cell.col === currentStageColEnd + 1 || cell.col === currentStageColEnd + 2) {
                    // 确保不超出列范围
                    if (cell.col <= cols) return { ...cell, type: 'seat' };
                  }
                } else if (stageAlign === 'right') {
                  // 右对齐时，护法在讲台左侧两个座位
                  if (cell.col === currentStageColStart - 1 || cell.col === currentStageColStart - 2) {
                    // 确保不超出列范围
                    if (cell.col >= 1) return { ...cell, type: 'seat' };
                  }
                } else {
                  // 居中对齐时，护法紧贴讲台左右两侧
                  if (cell.col === currentStageColStart - 1 || cell.col === currentStageColEnd + 1) {
                    // 确保不超出列范围
                    if (cell.col >= 1 && cell.col <= cols) return { ...cell, type: 'seat' };
                  }
                }
                return { ...cell, type: 'void' };
              } else {
                return { ...cell, type: 'void' };
              }
            }
          } else if (stagePosition === 'left') {
            if (cell.col === 1) {
              if (cell.row >= stageRowStart && cell.row <= stageRowEnd) {
                return { ...cell, type: 'stage' };
              } else {
                return { ...cell, type: 'void' };
              }
            }
          } else if (stagePosition === 'right') {
            if (cell.col === cols) {
              if (cell.row >= stageRowStart && cell.row <= stageRowEnd) {
                return { ...cell, type: 'stage' };
              } else {
                return { ...cell, type: 'void' };
              }
            }
          }

          return cell;
        });

        const classroom: ClassroomConfig = {
          ...state.classroom,
          ...extraConfig,
          rows,
          cols,
          cells: finalCells,
          doorsWindows: state.classroom.doorsWindows || [],
        };
        console.log('[Store] 新的 classroom 配置:', { groupMode: classroom.groupMode, groupSize: classroom.groupSize, groupGap: classroom.groupGap });

        // 保留现有的座位分配，为新座位创建空分配
        const newSeatCells = finalCells.filter(cell => cell.type === 'seat');
        const newAssignments: SeatAssignment[] = [];

        // 遍历所有新座位
        newSeatCells.forEach(newCell => {
          // 查找是否有旧的分配记录（基于座位ID）
          const oldAssignment = state.assignments.find(a => a.seatId === newCell.id);

          if (oldAssignment) {
            // 如果旧座位存在，保留原分配
            newAssignments.push(oldAssignment);
          } else {
            // 如果是新增座位，创建空分配
            newAssignments.push({
              seatId: newCell.id,
              studentId: null,
            });
          }
        });

        // 处理被删除座位上的学生，将他们移到空座位
        const deletedSeatIds = new Set(
          state.assignments
            .map(a => a.seatId)
            .filter(seatId => !newSeatCells.some(cell => cell.id === seatId))
        );

        // 找出被删除座位上的学生
        const displacedStudentIds = state.assignments
          .filter(a => deletedSeatIds.has(a.seatId) && a.studentId)
          .map(a => a.studentId);

        // 将被移除的学生分配到空座位
        let emptyAssignmentIndex = 0;
        displacedStudentIds.forEach(studentId => {
          // 找到下一个空座位
          while (emptyAssignmentIndex < newAssignments.length) {
            if (newAssignments[emptyAssignmentIndex].studentId === null) {
              newAssignments[emptyAssignmentIndex].studentId = studentId;
              emptyAssignmentIndex++;
              break;
            }
            emptyAssignmentIndex++;
          }
        });

        return {
          classroom,
          assignments: newAssignments,
          summary: summarize(state.className, state.students, classroom),
        };
      });
      persist();
    },
    updateClassroomConfig: (updates) => {
      set((state) => ({
        classroom: {
          ...state.classroom,
          ...updates,
        },
      }));
      persist();
    },
    updateDisplaySettings: (settings) => {
      set((state) => {
        const newSettings = { ...state.displaySettings, ...settings };
        // 也要同步到 classList 中当前班级的 displaySettings
        const updatedClassList = state.classList.map(c =>
          c.id === state.classId
            ? { ...c, displaySettings: newSettings, updatedAt: new Date().toISOString() }
            : c
        );

        return {
          displaySettings: newSettings,
          classList: updatedClassList,
        };
      });
      persist();
    },
    setStagePosition: (position) => {
      set((state) => {
        // 检测当前讲台
        const hasStage = state.classroom.cells.some(cell => cell.type === 'stage');
        const stageCell = state.classroom.cells.find(cell => cell.type === 'stage');

        let newRows = state.classroom.rows;
        let newCols = state.classroom.cols;

        // 如果要移除讲台
        if (position === 'none') {
          if (hasStage && stageCell) {
            // 减少行或列
            if (stageCell.row === 1 || stageCell.row === state.classroom.rows) {
              newRows = state.classroom.rows - 1;
            } else if (stageCell.col === 1 || stageCell.col === state.classroom.cols) {
              newCols = state.classroom.cols - 1;
            }
          }
          // 创建新网格（无讲台）
          const newCells = createSeatGrid(newRows, newCols);
          const classroom: ClassroomConfig = {
            rows: newRows,
            cols: newCols,
            cells: newCells,
            doorsWindows: state.classroom.doorsWindows || [],
          };
          const assignments = buildAssignmentsForClassroom(classroom, state.students);
          return {
            classroom,
            assignments,
            summary: summarize(state.className, state.students, classroom),
          };
        }

        // 如果有旧讲台，先移除
        if (hasStage && stageCell) {
          if (stageCell.row === 1 || stageCell.row === state.classroom.rows) {
            newRows = state.classroom.rows - 1;
          } else if (stageCell.col === 1 || stageCell.col === state.classroom.cols) {
            newCols = state.classroom.cols - 1;
          }
        }

        // 增加新的行/列
        if (position === 'top' || position === 'bottom') {
          newRows = newRows + 1;
        } else if (position === 'left' || position === 'right') {
          newCols = newCols + 1;
        }

        // 创建新网格并设置讲台
        const newCells = createSeatGrid(newRows, newCols);

        // 计算居中位置（支持奇偶数）
        const isEvenCols = newCols % 2 === 0;
        const isEvenRows = newRows % 2 === 0;

        // 对于偶数列，讲台占中间两格；奇数列占一格
        const stageColStart = isEvenCols ? newCols / 2 : Math.ceil(newCols / 2);
        const stageColEnd = isEvenCols ? newCols / 2 + 1 : Math.ceil(newCols / 2);

        // 对于偶数行，讲台占中间两格；奇数行占一格
        const stageRowStart = isEvenRows ? newRows / 2 : Math.ceil(newRows / 2);
        const stageRowEnd = isEvenRows ? newRows / 2 + 1 : Math.ceil(newRows / 2);

        const finalCells = newCells.map((cell): SeatCell => {
          if (position === 'top' && cell.row === 1) {
            // 上方讲台：中间列
            if (cell.col >= stageColStart && cell.col <= stageColEnd) {
              return { ...cell, type: 'stage' };
            } else {
              return { ...cell, type: 'void' };
            }
          } else if (position === 'bottom' && cell.row === newRows) {
            // 下方讲台：中间列
            if (cell.col >= stageColStart && cell.col <= stageColEnd) {
              return { ...cell, type: 'stage' };
            } else {
              return { ...cell, type: 'void' };
            }
          } else if (position === 'left' && cell.col === 1) {
            // 左侧讲台：中间行
            if (cell.row >= stageRowStart && cell.row <= stageRowEnd) {
              return { ...cell, type: 'stage' };
            } else {
              return { ...cell, type: 'void' };
            }
          } else if (position === 'right' && cell.col === newCols) {
            // 右侧讲台：中间行
            if (cell.row >= stageRowStart && cell.row <= stageRowEnd) {
              return { ...cell, type: 'stage' };
            } else {
              return { ...cell, type: 'void' };
            }
          }
          return cell;
        });

        const classroom: ClassroomConfig = {
          rows: newRows,
          cols: newCols,
          cells: finalCells,
          doorsWindows: state.classroom.doorsWindows || [],
        };

        const assignments = buildAssignmentsForClassroom(classroom, state.students);
        return {
          classroom,
          assignments,
          summary: summarize(state.className, state.students, classroom),
        };
      });
      persist();
    },
    toggleSeatType: (seatId, nextType) => {
      set((state) => {
        const updatedCells = state.classroom.cells.map((cell): SeatCell => {
          if (cell.id === seatId) {
            return { ...cell, type: nextType };
          }
          return cell;
        });

        const classroomNext = { ...state.classroom, cells: updatedCells };

        // 更新 assignment 列表
        let assignmentsNext = [...state.assignments];

        if (nextType === 'seat') {
          // 如果是添加座位，且没有分配记录，则添加
          if (!assignmentsNext.some(a => a.seatId === seatId)) {
            assignmentsNext.push({ seatId, studentId: null });
          }
        }

        // 过滤掉不再是座位的分配记录（如果移除了座位）
        assignmentsNext = assignmentsNext.filter((assignment) =>
          updatedCells.some((cell) => cell.id === assignment.seatId && cell.type === 'seat'),
        );

        return {
          classroom: classroomNext,
          assignments: assignmentsNext,
          summary: summarize(state.className, state.students, classroomNext),
        };
      });
      persist();
    },
    runAutoArrange: () => {
      const state = get();

      // 获取生效的奖励兑换
      const now = new Date().toISOString();
      const activeRedeems = state.rewardRedeems.filter(
        redeem => redeem.status === 'active' &&
          redeem.effectiveFrom <= now &&
          redeem.effectiveTo >= now
      );

      // 组合奖励信息
      const activeRewards = activeRedeems.map(redeem => {
        const reward = state.rewards.find(r => r.id === redeem.rewardId);
        return reward ? { reward, redeem } : null;
      }).filter(Boolean) as Array<{ reward: Reward; redeem: RewardRedeem }>;

      const plan = generateSeatingPlan(
        state.students,
        state.classroom,
        ensureLockFreshness(state.rules),
        activeRewards,
        state.assignments,
      );

      set((state) => {
        // 保存历史记录
        const currentClass = state.classList.find(c => c.id === state.classId);
        let updatedClassList = state.classList;

        const finalPlan = updateAssignmentsWithPlan(plan, state.classroom);

        if (currentClass) {
          const description = '智能排座';
          const updatedClass = saveHistory(
            { ...currentClass, students: state.students, classroom: state.classroom, assignments: finalPlan, rules: state.rules },
            'auto_arrange',
            description
          );

          updatedClassList = state.classList.map(c =>
            c.id === state.classId ? updatedClass : c
          );
        }

        return {
          assignments: finalPlan,
          classList: updatedClassList,
        };
      });
      persist();
    },
    swapSeats: (a, b) => {
      set((state) => {
        const assignmentA = state.assignments.find((assignment) => assignment.seatId === a);
        const assignmentB = state.assignments.find((assignment) => assignment.seatId === b);
        if (!assignmentA || !assignmentB) return {};

        const assignments = state.assignments.map((assignment) => {
          if (assignment.seatId === a) {
            return { ...assignment, studentId: assignmentB.studentId };
          }
          if (assignment.seatId === b) {
            return { ...assignment, studentId: assignmentA.studentId };
          }
          return assignment;
        });

        // 保存历史记录
        const currentClass = state.classList.find(c => c.id === state.classId);
        let updatedClassList = state.classList;

        if (currentClass) {
          const studentA = assignmentA.studentId ? state.students.find(s => s.id === assignmentA.studentId) : null;
          const studentB = assignmentB.studentId ? state.students.find(s => s.id === assignmentB.studentId) : null;
          const nameA = studentA?.name || '空位';
          const nameB = studentB?.name || '空位';
          const description = `交换座位: ${nameA} ↔ ${nameB}`;

          const updatedClass = saveHistory(
            { ...currentClass, students: state.students, classroom: state.classroom, assignments, rules: state.rules },
            'swap_seats',
            description
          );

          updatedClassList = state.classList.map(c =>
            c.id === state.classId ? updatedClass : c
          );
        }

        return {
          assignments,
          classList: updatedClassList,
          summary: summarize(state.className, state.students, state.classroom),
        };
      });
      persist();
    },
    batchUpdateAssignments: (newAssignments) => {
      set((state) => {
        // 保存历史记录
        const currentClass = state.classList.find(c => c.id === state.classId);
        let updatedClassList = state.classList;

        if (currentClass) {
          const description = `批量更新座位 (${newAssignments.length} 个)`;
          const updatedClass = saveHistory(
            { ...currentClass, students: state.students, classroom: state.classroom, assignments: newAssignments, rules: state.rules },
            'batch_update_seats',
            description
          );

          updatedClassList = state.classList.map(c =>
            c.id === state.classId ? updatedClass : c
          );
        }

        return {
          assignments: newAssignments,
          classList: updatedClassList,
          summary: summarize(state.className, state.students, state.classroom),
        };
      });
      persist();
    },
    importStudentsFromXlsx: async (file) => {
      set({ loading: true, error: undefined });
      try {
        const parsed = await parseStudentWorkbook(file);
        // 如果没有解析到学生，就不处理
        if (parsed.length === 0) {
          set({ loading: false });
          return;
        }

        const students = parsed;
        let classroomState = get().classroom;

        // 检查座位是否足够
        let seatCount = classroomState.cells.filter(c => c.type === 'seat').length;
        if (students.length > seatCount) {
          const needed = students.length - seatCount;
          const cols = classroomState.cols;
          const safeCols = cols > 0 ? cols : 1;
          const rowsToAdd = Math.ceil(needed / safeCols);
          const newRows = classroomState.rows + rowsToAdd;

          console.log(`[Import] 学生数(${students.length}) > 座位数(${seatCount})，自动增加 ${rowsToAdd} 行`);

          // 调用 setClassroomDimensions 扩容
          get().setClassroomDimensions(newRows, cols);

          // 获取更新后的 classroom
          classroomState = get().classroom;

          // 扩容后再次验证座位数是否足够
          seatCount = classroomState.cells.filter(c => c.type === 'seat').length;
          if (students.length > seatCount) {
            // 如果仍然不足，继续扩容（可能因为讲台、空白等占用了位置）
            const stillNeeded = students.length - seatCount;
            const additionalRows = Math.ceil(stillNeeded / safeCols);
            const finalRows = classroomState.rows + additionalRows;
            console.log(`[Import] 扩容后座位数(${seatCount})仍不足，再增加 ${additionalRows} 行`);
            get().setClassroomDimensions(finalRows, cols);
            classroomState = get().classroom;
          }
        }

        const assignments = buildAssignmentsForClassroom(classroomState, students);
        set({
          students,
          assignments,
          loading: false,
          summary: summarize(get().className, students, classroomState),
        });
        persist();
      } catch (error) {
        set({
          loading: false,
          error: error instanceof Error ? error.message : '导入失败',
        });
      }
    },
    addStudent: (studentData, targetSeatId) => {
      console.log('========== Store.addStudent 被调用 ==========');
      console.log('1. 接收到的 studentData:', studentData);
      console.log('2. studentData.className:', studentData.className);
      console.log('3. targetSeatId:', targetSeatId);
      console.log('4. 当前激活班级:', get().className);

      set((state) => {
        const newStudent: Student = {
          ...studentData,
          id: crypto.randomUUID(),
        };
        console.log('5. 创建的 newStudent:', newStudent);
        console.log('6. newStudent.className:', newStudent.className);

        // 找到学生所属的班级
        let targetClass = state.classList.find(cls => cls.fullName === newStudent.className);
        let isCurrentClass = targetClass?.id === state.classId;
        let updatedClassList = state.classList;

        // 如果找不到对应的班级，自动创建新班级
        if (!targetClass && newStudent.className) {
          console.log(`🆕 班级"${newStudent.className}"不存在，正在自动创建...`);

          // 解析班级名称（如"2024级 1班" -> grade: "2024级", className: "1班"）
          const parseClassName = (fullName: string): { grade: string; className: string } => {
            // 尝试匹配 "XXXX级 X班" 格式
            let match = fullName.match(/^(.+级)\s*(.+班)$/);
            if (match) return { grade: match[1], className: match[2] };

            // 尝试匹配 "X年X班" 格式（如"三年二班"）
            match = fullName.match(/^(.+年)(.+班)$/);
            if (match) return { grade: match[1], className: match[2] };

            // 尝试匹配 "高X/初XX班" 格式
            match = fullName.match(/^(高\w+|初\w+)(.+班)$/);
            if (match) return { grade: match[1], className: match[2] };

            // 默认：将整个名称作为className，grade为空
            return { grade: '', className: fullName };
          };

          const { grade, className } = parseClassName(newStudent.className);
          const newClassId = crypto.randomUUID();
          const now = new Date().toISOString();
          const snapshot = createDefaultSnapshot();

          // 统一格式：无空格
          const standardizedFullName = `${grade}${className}`;
          // 更新学生的className为统一格式
          newStudent.className = standardizedFullName;

          const newClass: ClassInfo = {
            id: newClassId,
            grade,
            className,
            fullName: standardizedFullName,
            createdAt: now,
            updatedAt: now,
            students: [newStudent], // 直接将新学生添加到新班级
            classroom: snapshot.classroom,
            assignments: snapshot.assignments,
            rules: snapshot.rules,
            courses: [
              { id: crypto.randomUUID(), name: '语文', color: 'blue' },
              { id: crypto.randomUUID(), name: '数学', color: 'green' },
              { id: crypto.randomUUID(), name: '英语', color: 'orange' },
            ],
            schedule: { periods: [] },
            history: [],
            historyIndex: -1,
            customFields: state.classList[0]?.customFields || [],
            classCustomData: {},
            exams: [],
            examScores: [],
          };

          updatedClassList = [...state.classList, newClass];
          targetClass = newClass;
          isCurrentClass = false; // 新创建的班级不是当前激活的班级

          console.log(`✅ 已自动创建班级"${newStudent.className}"`);
        } else if (!newStudent.className) {
          // 如果学生没有填写班级，使用当前班级
          newStudent.className = state.className;
          isCurrentClass = true;
        }

        console.log('7. 学生所属班级:', targetClass?.fullName || state.className);
        console.log('8. 是否当前班级:', isCurrentClass);

        // 如果学生所属班级就是当前班级，则更新当前 students
        const students = isCurrentClass ? [...state.students, newStudent] : state.students;

        // 更新 classList：将学生添加到对应班级的 students 数组（如果班级是已存在的）
        // 如果班级是新创建的，学生已经在创建时添加了，不需要再次添加
        if (targetClass && updatedClassList === state.classList) {
          updatedClassList = state.classList.map(cls => {
            if (cls.fullName === newStudent.className) {
              return {
                ...cls,
                students: [...cls.students, newStudent]
              };
            }
            return cls;
          });
        }

        // 智能分配座位（只有当学生属于当前班级时）
        const seatCells = state.classroom.cells.filter((cell) => cell.type === 'seat');
        let assignments = state.assignments;

        if (isCurrentClass && targetSeatId) {
          // 如果指定了目标座位，优先分配到该座位
          const targetAssignment = state.assignments.find(a => a.seatId === targetSeatId);
          if (targetAssignment) {
            // 如果目标座位已存在分配记录
            assignments = state.assignments.map(assignment =>
              assignment.seatId === targetSeatId
                ? { ...assignment, studentId: newStudent.id }
                : assignment
            );
          } else {
            // 如果目标座位没有分配记录，创建新的
            assignments = [
              ...state.assignments,
              { seatId: targetSeatId, studentId: newStudent.id }
            ];
          }
        } else if (isCurrentClass) {
          // 自动查找空座位（只有当学生属于当前班级时）
          const emptySeat = seatCells.find(seat => {
            const assignment = state.assignments.find(a => a.seatId === seat.id);
            return assignment && assignment.studentId === null;
          });

          if (emptySeat) {
            // 如果有空座位，将新学生分配到空座位
            assignments = state.assignments.map(assignment =>
              assignment.seatId === emptySeat.id
                ? { ...assignment, studentId: newStudent.id }
                : assignment
            );
          } else {
            // 如果没有空座位，检查是否有未分配的座位
            const unassignedSeats = seatCells.filter(seat =>
              !state.assignments.some(a => a.seatId === seat.id)
            );

            if (unassignedSeats.length > 0) {
              // 为新座位创建分配
              assignments = [
                ...state.assignments,
                {
                  seatId: unassignedSeats[0].id,
                  studentId: newStudent.id,
                }
              ];
            }
          }
        }

        console.log('9. 学生被添加到班级:', targetClass?.fullName || '未找到班级');
        console.log('10. 是否也添加到当前激活班级:', isCurrentClass);
        console.log('11. classList 已更新');
        console.log('===============================================');

        return {
          students,
          assignments,
          classList: updatedClassList,
          summary: summarize(state.className, students, state.classroom),
        };
      });
      persist();
    },
    updateStudent: (id, updates) => {
      set((state) => {
        const students = state.students.map((student) =>
          student.id === id ? { ...student, ...updates } : student
        );
        return {
          students,
          summary: summarize(state.className, students, state.classroom),
        };
      });
      persist();
    },
    deleteStudent: (id) => {
      set((state) => {
        const students = state.students.filter((student) => student.id !== id);
        const assignments = state.assignments.map((assignment) =>
          assignment.studentId === id
            ? { ...assignment, studentId: null }
            : assignment
        );
        return {
          students,
          assignments,
          summary: summarize(state.className, students, state.classroom),
        };
      });
      persist();
    },
    setFilterKeyword: (keyword) =>
      set((state) => ({
        filters: {
          ...state.filters,
          keyword,
        },
      })),
    setHighlightTag: (tag) =>
      set((state) => ({
        filters: {
          ...state.filters,
          tag,
        },
      })),
    setHeatmapMode: (mode) =>
      set((state) => ({
        filters: {
          ...state.filters,
          heatmapMode: mode,
        },
      })),
    setSpotlightStudent: (studentId) => set({ spotlightStudentId: studentId }),
    setSelectionMode: (mode) => set({ selectionMode: mode, selectedSeats: mode ? [] : [] }),
    setSelectedSeats: (seats) => set({ selectedSeats: seats }),
    toggleSeatSelection: (seatId) =>
      set((state) => {
        const seats = new Set(state.selectedSeats);
        if (seats.has(seatId)) {
          seats.delete(seatId);
        } else {
          seats.add(seatId);
        }
        return { selectedSeats: Array.from(seats) };
      }),
    clearSelection: () => set({ selectedSeats: [], selectionMode: false }),
    addMutexPair: (pair) => {
      if (pair[0] === pair[1]) return;
      set((state) => ({
        rules: {
          ...state.rules,
          mutexPairs: [
            ...state.rules.mutexPairs,
            { id: crypto.randomUUID(), students: pair },
          ],
        },
      }));
      persist();
    },
    removeMutexPair: (id) => {
      set((state) => ({
        rules: {
          ...state.rules,
          mutexPairs: state.rules.mutexPairs.filter((rule) => rule.id !== id),
        },
      }));
      persist();
    },
    addBindingPair: (pair) => {
      if (pair[0] === pair[1]) return;
      set((state) => ({
        rules: {
          ...state.rules,
          bindingPairs: [
            ...state.rules.bindingPairs,
            { id: crypto.randomUUID(), students: pair },
          ],
        },
      }));
      persist();
    },
    removeBindingPair: (id) => {
      set((state) => ({
        rules: {
          ...state.rules,
          bindingPairs: state.rules.bindingPairs.filter((rule) => rule.id !== id),
        },
      }));
      persist();
    },
    addTemporaryLock: ({ studentId, seatId, expiresAt }) => {
      set((state) => {
        const locks = state.rules.temporaryLocks.filter((lock) => lock.studentId !== studentId);
        return {
          rules: {
            ...state.rules,
            temporaryLocks: [
              ...locks,
              {
                id: crypto.randomUUID(),
                studentId,
                seatId,
                expiresAt,
              },
            ],
          },
        };
      });
      persist();
    },
    removeTemporaryLock: (id) => {
      set((state) => ({
        rules: {
          ...state.rules,
          temporaryLocks: state.rules.temporaryLocks.filter((lock) => lock.id !== id),
        },
      }));
      persist();
    },
    cleanupTemporaryLocks: () => {
      set((state) => ({
        rules: {
          ...state.rules,
          temporaryLocks: state.rules.temporaryLocks.filter((lock) => !isLockExpired(lock)),
        },
      }));
      persist();
    },
    // 班级管理方法实现
    addNewClass: (grade, className) => {
      set((state) => {
        const newClassId = crypto.randomUUID();
        const fullName = `${grade}${className}`;
        const now = new Date().toISOString();

        // 创建新班级的默认状态
        const snapshot = createDefaultSnapshot();
        const defaultCourses = [
          { id: crypto.randomUUID(), name: '语文', color: 'blue' },
          { id: crypto.randomUUID(), name: '数学', color: 'green' },
          { id: crypto.randomUUID(), name: '英语', color: 'orange' },
        ];
        const newClass: ClassInfo = {
          id: newClassId,
          grade,
          className,
          fullName,
          createdAt: now,
          updatedAt: now,
          students: [],
          classroom: snapshot.classroom,
          assignments: snapshot.assignments,
          rules: snapshot.rules,
          courses: defaultCourses,
          schedule: { periods: [] },
          history: [],
          historyIndex: -1,
          customFields: [],
          classCustomData: {},
          exams: [],
          examScores: [],
        };

        return {
          classList: [...state.classList, newClass],
        };
      });
      persist();
    },
    renameClass: (classId, grade, className) => {
      set((state) => {
        const fullName = `${grade}${className}`;

        const updatedClassList = state.classList.map((c) => {
          if (c.id === classId) {
            return {
              ...c,
              grade,
              className: className,
              fullName,
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        });

        const updates: Partial<ClassStore> = { classList: updatedClassList };

        // 如果是当前班级，同时更新当前名称
        if (state.classId === classId) {
          updates.className = fullName;
          updates.summary = {
            ...state.summary,
            className: fullName,
          };
        }

        return updates;
      });
      get().persist();
    },
    switchClass: (classId) => {
      set((state) => {
        const targetClass = state.classList.find((c) => c.id === classId);
        if (!targetClass) {
          console.error('[Store] Switch target class not found:', classId);
          return {};
        }

        // 1. 同步当前活跃班级数据到 classList 数组中
        const updatedClassList = state.classList.map((c) => {
          if (c.id === state.classId) {
            return {
              ...c,
              students: state.students,
              classroom: state.classroom,
              assignments: state.assignments,
              rules: state.rules,
              displaySettings: state.displaySettings,
              pointsLogs: state.pointsLogs,
              rewards: state.rewards,
              rewardRedeems: state.rewardRedeems,
              seatSchemes: state.seatSchemes,
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        });

        // 2. 加载目标班级数据并设置 classList
        return {
          classId: targetClass.id,
          className: targetClass.fullName,
          classList: updatedClassList,
          students: targetClass.students,
          classroom: targetClass.classroom,
          assignments: targetClass.assignments,
          rules: targetClass.rules,
          displaySettings: targetClass.displaySettings || defaultDisplaySettings,
          pointsLogs: targetClass.pointsLogs || [],
          rewards: targetClass.rewards || [],
          rewardRedeems: targetClass.rewardRedeems || [],
          seatSchemes: targetClass.seatSchemes || [],
          summary: summarize(targetClass.fullName, targetClass.students, targetClass.classroom),
        };
      });
      get().persist();
    },
    deleteClass: (classId) => {
      set((state) => {
        if (state.classList.length <= 1) return {};

        const updatedClassList = state.classList.filter((c) => c.id !== classId);

        // 如果删除的是当前班级，切换到第一个班级
        if (state.classId === classId) {
          if (updatedClassList.length === 0) {
            // 如果删除后没有班级了，不应该发生（因为前面检查了 length <= 1）
            // 但为了安全起见，返回空状态
            return {
              classList: updatedClassList,
            };
          }
          const firstClass = updatedClassList[0];
          if (!firstClass) {
            return {
              classList: updatedClassList,
            };
          }
          return {
            classList: updatedClassList,
            classId: firstClass.id,
            className: firstClass.fullName,
            students: firstClass.students,
            classroom: firstClass.classroom,
            assignments: firstClass.assignments,
            rules: firstClass.rules,
            displaySettings: firstClass.displaySettings || defaultDisplaySettings,
            pointsLogs: firstClass.pointsLogs || [],
            rewards: firstClass.rewards || [],
            rewardRedeems: firstClass.rewardRedeems || [],
            summary: summarize(firstClass.fullName, firstClass.students, firstClass.classroom),
          };
        }

        return {
          classList: updatedClassList,
        };
      });
      persist();
    },
    // 课程和课表管理方法实现
    addCourse: (name, teacher, color) => {
      set((state) => {
        const currentClass = state.classList.find(c => c.id === state.classId);
        if (!currentClass) return {};

        const newCourse = {
          id: crypto.randomUUID(),
          name,
          teacher,
          color: color || 'blue',
        };

        const updatedClass = {
          ...currentClass,
          courses: [...currentClass.courses, newCourse],
          updatedAt: new Date().toISOString(),
        };

        return {
          classList: state.classList.map(c => c.id === state.classId ? updatedClass : c),
        };
      });
      persist();
    },
    updateCourse: (courseId, updates) => {
      set((state) => {
        const currentClass = state.classList.find(c => c.id === state.classId);
        if (!currentClass) return {};

        const updatedClass = {
          ...currentClass,
          courses: currentClass.courses.map(c =>
            c.id === courseId ? { ...c, ...updates } : c
          ),
          updatedAt: new Date().toISOString(),
        };

        return {
          classList: state.classList.map(c => c.id === state.classId ? updatedClass : c),
        };
      });
      persist();
    },
    deleteCourse: (courseId) => {
      set((state) => {
        const currentClass = state.classList.find(c => c.id === state.classId);
        if (!currentClass) return {};

        const updatedClass = {
          ...currentClass,
          courses: currentClass.courses.filter(c => c.id !== courseId),
          schedule: {
            ...currentClass.schedule,
            periods: currentClass.schedule.periods.filter(p => p.courseId !== courseId),
          },
          updatedAt: new Date().toISOString(),
        };

        return {
          classList: state.classList.map(c => c.id === state.classId ? updatedClass : c),
        };
      });
      persist();
    },
    updateSchedule: (schedule) => {
      set((state) => {
        const currentClass = state.classList.find(c => c.id === state.classId);
        if (!currentClass) return {};

        const updatedClass = {
          ...currentClass,
          schedule,
          updatedAt: new Date().toISOString(),
        };

        return {
          classList: state.classList.map(c => c.id === state.classId ? updatedClass : c),
        };
      });
      persist();
    },
    // 操作历史管理实现
    undo: () => {
      set((state) => {
        const currentClass = state.classList.find(c => c.id === state.classId);
        if (!currentClass) return {};
        if (currentClass.historyIndex < 0) return {};
        if (currentClass.historyIndex >= currentClass.history.length) return {};

        const historyAction = currentClass.history[currentClass.historyIndex];
        if (!historyAction) return {};

        const updatedClass = {
          ...currentClass,
          students: historyAction.snapshot.students,
          classroom: historyAction.snapshot.classroom,
          assignments: historyAction.snapshot.assignments,
          rules: historyAction.snapshot.rules,
          historyIndex: currentClass.historyIndex - 1,
          updatedAt: new Date().toISOString(),
        };

        const updatedClassList = state.classList.map(c =>
          c.id === state.classId ? updatedClass : c
        );

        return {
          classList: updatedClassList,
          students: historyAction.snapshot.students,
          classroom: historyAction.snapshot.classroom,
          assignments: historyAction.snapshot.assignments,
          rules: historyAction.snapshot.rules,
          summary: summarize(currentClass.fullName, historyAction.snapshot.students, historyAction.snapshot.classroom),
        };
      });
      persist();
    },
    redo: () => {
      set((state) => {
        const currentClass = state.classList.find(c => c.id === state.classId);
        if (!currentClass) return {};
        if (currentClass.history.length === 0) return {};
        if (currentClass.historyIndex >= currentClass.history.length - 1) return {};

        const nextIndex = currentClass.historyIndex + 1;
        if (nextIndex < 0 || nextIndex >= currentClass.history.length) return {};

        const historyAction = currentClass.history[nextIndex];
        if (!historyAction) return {};

        const updatedClass = {
          ...currentClass,
          students: historyAction.snapshot.students,
          classroom: historyAction.snapshot.classroom,
          assignments: historyAction.snapshot.assignments,
          rules: historyAction.snapshot.rules,
          historyIndex: nextIndex,
          updatedAt: new Date().toISOString(),
        };

        const updatedClassList = state.classList.map(c =>
          c.id === state.classId ? updatedClass : c
        );

        return {
          classList: updatedClassList,
          students: historyAction.snapshot.students,
          classroom: historyAction.snapshot.classroom,
          assignments: historyAction.snapshot.assignments,
          rules: historyAction.snapshot.rules,
          summary: summarize(currentClass.fullName, historyAction.snapshot.students, historyAction.snapshot.classroom),
        };
      });
      persist();
    },
    canUndo: () => {
      const state = get();
      const currentClass = state.classList.find(c => c.id === state.classId);
      return currentClass ? currentClass.historyIndex >= 0 : false;
    },
    canRedo: () => {
      const state = get();
      const currentClass = state.classList.find(c => c.id === state.classId);
      return currentClass ? currentClass.historyIndex < currentClass.history.length - 1 : false;
    },
    // 自定义字段管理方法实现
    addCustomField: (field) => {
      set((state) => {
        const currentClass = state.classList.find(c => c.id === state.classId);
        if (!currentClass) return {};

        const newField: CustomFieldDefinition = {
          ...field,
          id: crypto.randomUUID(),
          order: currentClass.customFields.length,
        };

        const updatedClass = {
          ...currentClass,
          customFields: [...currentClass.customFields, newField],
          updatedAt: new Date().toISOString(),
        };

        return {
          classList: state.classList.map(c => c.id === state.classId ? updatedClass : c),
        };
      });
      persist();
    },
    updateCustomField: (fieldId, updates) => {
      set((state) => {
        const currentClass = state.classList.find(c => c.id === state.classId);
        if (!currentClass) return {};

        const updatedClass = {
          ...currentClass,
          customFields: currentClass.customFields.map(f =>
            f.id === fieldId ? { ...f, ...updates } : f
          ),
          updatedAt: new Date().toISOString(),
        };

        return {
          classList: state.classList.map(c => c.id === state.classId ? updatedClass : c),
        };
      });
      persist();
    },
    deleteCustomField: (fieldId) => {
      set((state) => {
        const currentClass = state.classList.find(c => c.id === state.classId);
        if (!currentClass) return {};

        const fieldKey = currentClass.customFields.find(f => f.id === fieldId)?.key;

        // 删除字段定义
        const updatedClass = {
          ...currentClass,
          customFields: currentClass.customFields.filter(f => f.id !== fieldId),
          updatedAt: new Date().toISOString(),
        };

        // 同时删除所有学生该字段的数据
        const updatedStudents = state.students.map(student => {
          if (fieldKey && student.flexibleData[fieldKey] !== undefined) {
            const { [fieldKey]: _, ...rest } = student.flexibleData;
            return { ...student, flexibleData: rest };
          }
          return student;
        });

        return {
          classList: state.classList.map(c => c.id === state.classId ? { ...updatedClass, students: updatedStudents } : c),
          students: updatedStudents,
        };
      });
      persist();
    },
    // 门窗管理方法实现
    addDoorWindow: (type, position, index) => {
      set((state) => {
        const newDoorWindow = {
          id: crypto.randomUUID(),
          type,
          position,
          index,
        };

        const updatedClassroom = {
          ...state.classroom,
          doorsWindows: [...state.classroom.doorsWindows, newDoorWindow],
        };

        return {
          classroom: updatedClassroom,
        };
      });
      persist();
    },
    removeDoorWindow: (id) => {
      set((state) => {
        const updatedClassroom = {
          ...state.classroom,
          doorsWindows: state.classroom.doorsWindows.filter(dw => dw.id !== id),
        };

        return {
          classroom: updatedClassroom,
        };
      });
      persist();
    },
    updateDoorWindow: (id, updates) => {
      set((state) => {
        const updatedClassroom = {
          ...state.classroom,
          doorsWindows: state.classroom.doorsWindows.map(dw =>
            dw.id === id ? { ...dw, ...updates } : dw
          ),
        };

        return {
          classroom: updatedClassroom,
        };
      });
      persist();
    },
    // 积分系统方法实现
    addPoints: (studentId, delta, reasonType, reasonDetail, operator) => {
      set((state) => {
        // 创建积分流水记录
        const log: PointsLog = {
          id: crypto.randomUUID(),
          studentId,
          delta,
          reasonType,
          reasonDetail,
          operator,
          createdAt: new Date().toISOString(),
        };

        // 更新学生积分
        const students = state.students.map(student =>
          student.id === studentId
            ? { ...student, points: student.points + delta }
            : student
        );

        return {
          students,
          pointsLogs: [...state.pointsLogs, log],
          summary: summarize(state.className, students, state.classroom),
        };
      });
      persist();
    },
    getPointsLogs: (studentId) => {
      const state = get();
      if (studentId) {
        return state.pointsLogs.filter(log => log.studentId === studentId);
      }
      return state.pointsLogs;
    },
    addReward: (reward) => {
      set((state) => ({
        rewards: [...state.rewards, {
          ...reward,
          id: crypto.randomUUID(),
          order: state.rewards.length,
        }],
      }));
      persist();
    },
    updateReward: (rewardId, updates) => {
      set((state) => ({
        rewards: state.rewards.map(reward =>
          reward.id === rewardId ? { ...reward, ...updates } : reward
        ),
      }));
      persist();
    },
    deleteReward: (rewardId) => {
      set((state) => ({
        rewards: state.rewards.filter(reward => reward.id !== rewardId),
      }));
      persist();
    },
    toggleRewardStatus: (rewardId) => {
      set((state) => ({
        rewards: state.rewards.map(reward =>
          reward.id === rewardId ? { ...reward, isActive: !reward.isActive } : reward
        ),
      }));
      persist();
    },
    redeemReward: (studentId, rewardId, linkedWishId) => {
      const state = get();
      const reward = state.rewards.find(r => r.id === rewardId);
      if (!reward || !reward.isActive) {
        throw new Error('奖励不存在或未启用');
      }

      const student = state.students.find(s => s.id === studentId);
      if (!student) {
        throw new Error('学生不存在');
      }

      if (student.points < reward.costPoints) {
        throw new Error(`积分不足，需要 ${reward.costPoints} 积分，当前只有 ${student.points} 积分`);
      }

      // 检查兑换限制
      if (reward.limitPerStudent) {
        const redeemCount = state.rewardRedeems.filter(
          r => r.studentId === studentId && r.rewardId === rewardId && r.status === 'active'
        ).length;
        if (redeemCount >= reward.limitPerStudent) {
          throw new Error(`已达兑换上限，每个学生最多兑换 ${reward.limitPerStudent} 次`);
        }
      }

      set((state) => {
        // 创建兑换记录
        const redeem: RewardRedeem = {
          id: crypto.randomUUID(),
          studentId,
          rewardId,
          status: 'active',
          effectiveFrom: new Date().toISOString(),
          effectiveTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 默认30天
          linkedWishId,
          createdAt: new Date().toISOString(),
        };

        // 扣除积分并记录流水
        const pointsLog: PointsLog = {
          id: crypto.randomUUID(),
          studentId,
          delta: -reward.costPoints,
          reasonType: 'redeem',
          reasonDetail: `兑换奖励：${reward.name}`,
          operator: 'system',
          createdAt: new Date().toISOString(),
        };

        const students = state.students.map(s =>
          s.id === studentId
            ? { ...s, points: s.points - reward.costPoints }
            : s
        );

        return {
          students,
          rewardRedeems: [...state.rewardRedeems, redeem],
          pointsLogs: [...state.pointsLogs, pointsLog],
          summary: summarize(state.className, students, state.classroom),
        };
      });
      persist();
    },
    cancelRedeem: (redeemId) => {
      set((state) => ({
        rewardRedeems: state.rewardRedeems.map(redeem =>
          redeem.id === redeemId
            ? { ...redeem, status: 'cancelled' as const }
            : redeem
        ),
      }));
      persist();
    },
    getActiveRedeems: (studentId) => {
      const state = get();
      const now = new Date().toISOString();
      let redeems = state.rewardRedeems.filter(
        redeem => redeem.status === 'active' &&
          redeem.effectiveFrom <= now &&
          redeem.effectiveTo >= now
      );
      if (studentId) {
        redeems = redeems.filter(redeem => redeem.studentId === studentId);
      }
      return redeems;
    },
    exportData: () => {
      const state = get();

      // 关键：先保存当前班级的最新状态到classList
      const updatedClassList = state.classList.map((c) => {
        if (c.id === state.classId) {
          return {
            ...c,
            students: state.students,
            classroom: state.classroom,
            assignments: state.assignments,
            rules: state.rules,
            displaySettings: state.displaySettings,
            pointsLogs: state.pointsLogs,
            rewards: state.rewards,
            rewardRedeems: state.rewardRedeems,
            seatSchemes: state.seatSchemes,
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });

      return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        classId: state.classId,
        classList: updatedClassList, // 使用更新后的classList，包含当前班级的最新数据
        pointsLogs: state.pointsLogs,
        rewards: state.rewards,
        rewardRedeems: state.rewardRedeems,
      };
    },
    importData: (data: any) => {
      if (!data || !data.version) {
        throw new Error('无效的备份文件格式');
      }

      // 验证数据结构
      if (!Array.isArray(data.classList)) {
        throw new Error('备份数据不完整：缺少班级列表');
      }

      // 恢复数据
      const targetClassId = data.classId || data.classList[0]?.id || DEFAULT_CLASS_ID;
      const targetClass = data.classList.find((c: ClassInfo) => c.id === targetClassId) || data.classList[0];

      if (!targetClass) {
        throw new Error('备份数据中没有有效的班级信息');
      }

      set({
        classId: targetClassId,
        className: targetClass.fullName,
        classList: data.classList,
        students: targetClass.students,
        classroom: targetClass.classroom,
        assignments: targetClass.assignments,
        rules: ensureLockFreshness(targetClass.rules),
        displaySettings: targetClass.displaySettings || defaultDisplaySettings,
        pointsLogs: targetClass.pointsLogs || data.pointsLogs || [],
        rewards: targetClass.rewards || data.rewards || [],
        rewardRedeems: targetClass.rewardRedeems || data.rewardRedeems || [],
        seatSchemes: targetClass.seatSchemes || [],
        summary: summarize(targetClass.fullName, targetClass.students, targetClass.classroom),
      });

      persist();
    },
    // 考试成绩管理方法实现
    addExam: (exam) => {
      set((state) => {
        const currentClass = state.classList.find(c => c.id === state.classId);
        if (!currentClass) return {};

        const newExam: Exam = {
          ...exam,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };

        const updatedClass = {
          ...currentClass,
          exams: [...currentClass.exams, newExam],
          updatedAt: new Date().toISOString(),
        };

        return {
          classList: state.classList.map(c => c.id === state.classId ? updatedClass : c),
        };
      });
      persist();
    },
    updateExam: (examId, updates) => {
      set((state) => {
        const currentClass = state.classList.find(c => c.id === state.classId);
        if (!currentClass) return {};

        const updatedClass = {
          ...currentClass,
          exams: currentClass.exams.map(exam =>
            exam.id === examId ? { ...exam, ...updates } : exam
          ),
          updatedAt: new Date().toISOString(),
        };

        return {
          classList: state.classList.map(c => c.id === state.classId ? updatedClass : c),
        };
      });
      persist();
    },
    deleteExam: (examId) => {
      set((state) => {
        const currentClass = state.classList.find(c => c.id === state.classId);
        if (!currentClass) return {};

        const updatedClass = {
          ...currentClass,
          exams: currentClass.exams.filter(exam => exam.id !== examId),
          examScores: currentClass.examScores.filter(score => score.examId !== examId),
          updatedAt: new Date().toISOString(),
        };

        return {
          classList: state.classList.map(c => c.id === state.classId ? updatedClass : c),
        };
      });
      persist();
    },
    addExamScore: (score) => {
      set((state) => {
        const currentClass = state.classList.find(c => c.id === state.classId);
        if (!currentClass) return {};

        const newScore: ExamScore = {
          ...score,
          id: crypto.randomUUID(),
        };

        const updatedClass = {
          ...currentClass,
          examScores: [...currentClass.examScores, newScore],
          updatedAt: new Date().toISOString(),
        };

        return {
          classList: state.classList.map(c => c.id === state.classId ? updatedClass : c),
        };
      });
      persist();
    },
    updateExamScore: (scoreId, updates) => {
      set((state) => {
        const currentClass = state.classList.find(c => c.id === state.classId);
        if (!currentClass) return {};

        const updatedClass = {
          ...currentClass,
          examScores: currentClass.examScores.map(score =>
            score.id === scoreId ? { ...score, ...updates } : score
          ),
          updatedAt: new Date().toISOString(),
        };

        return {
          classList: state.classList.map(c => c.id === state.classId ? updatedClass : c),
        };
      });
      persist();
    },
    deleteExamScore: (scoreId) => {
      set((state) => {
        const currentClass = state.classList.find(c => c.id === state.classId);
        if (!currentClass) return {};

        const updatedClass = {
          ...currentClass,
          examScores: currentClass.examScores.filter(score => score.id !== scoreId),
          updatedAt: new Date().toISOString(),
        };

        return {
          classList: state.classList.map(c => c.id === state.classId ? updatedClass : c),
        };
      });
      persist();
    },
    getExamScores: (examId, studentId) => {
      const state = get();
      const currentClass = state.classList.find(c => c.id === state.classId);
      if (!currentClass) return [];

      let scores = currentClass.examScores;
      if (examId) {
        scores = scores.filter(score => score.examId === examId);
      }
      if (studentId) {
        scores = scores.filter(score => score.studentId === studentId);
      }
      return scores;
    },
    moveBatchSeats: (activeSeatId, overSeatId, currentSelectedSeats) => {
      set((state) => {
        const activeSeat = state.classroom.cells.find(c => c.id === activeSeatId);
        const overSeat = state.classroom.cells.find(c => c.id === overSeatId);

        if (!activeSeat || !overSeat) return {};

        // 计算偏移量
        const rowOffset = overSeat.row - activeSeat.row;
        const colOffset = overSeat.col - activeSeat.col;

        // 获取所有需要移动的座位
        const selectedCells = state.classroom.cells.filter(c => currentSelectedSeats.includes(c.id));

        // 计算目标位置并验证是否都在范围内且是有效座位
        const moves: Array<{ fromId: string; toId: string }> = [];
        let allValid = true;

        for (const cell of selectedCells) {
          const targetRow = cell.row + rowOffset;
          const targetCol = cell.col + colOffset;

          const targetSeat = state.classroom.cells.find(
            c => c.row === targetRow && c.col === targetCol && c.type === 'seat'
          );

          if (!targetSeat) {
            allValid = false;
            break;
          }

          moves.push({ fromId: cell.id, toId: targetSeat.id });
        }

        if (!allValid) {
          return {};
        }

        // 执行批量移动
        const newAssignments = [...state.assignments];

        // 先清除所有移动目标位置的学生（避免冲突）
        for (const move of moves) {
          const targetIndex = newAssignments.findIndex(a => a.seatId === move.toId);
          if (targetIndex !== -1) {
            newAssignments[targetIndex] = { ...newAssignments[targetIndex], studentId: null };
          }
        }

        // 再将学生移动到目标位置
        for (const move of moves) {
          const sourceAssignment = state.assignments.find(a => a.seatId === move.fromId);
          if (sourceAssignment?.studentId) {
            const targetIndex = newAssignments.findIndex(a => a.seatId === move.toId);
            if (targetIndex !== -1) {
              newAssignments[targetIndex] = {
                ...newAssignments[targetIndex],
                studentId: sourceAssignment.studentId
              };
            }

            // 清除原位置
            const sourceIndex = newAssignments.findIndex(a => a.seatId === move.fromId);
            if (sourceIndex !== -1) {
              newAssignments[sourceIndex] = {
                ...newAssignments[sourceIndex],
                studentId: null
              };
            }
          }
        }

        return {
          assignments: newAssignments,
          selectedSeats: [], // 移动后清除选择
        };
      });
      persist();
    },
    fullReset: async () => {
      const state = get();
      const storage = getStorageProvider();

      try {
        // 1. 自动触发备份
        const data = state.exportData();
        downloadBackup(data);

        // 2. 清除存储
        await storage.clearData();

        // 3. 重置本地状态到初始值
        // 这里最简单的方法是刷新页面，因为 initialize 会处理默认数据
        window.location.reload();
      } catch (error) {
        console.error('Full reset failed:', error);
        throw error;
      }
    },
    // ========== 座位表方案管理 ==========
    saveSeatScheme: (name) => {
      const state = get();
      const scheme: SeatLayoutScheme = {
        id: crypto.randomUUID(),
        name,
        classroom: JSON.parse(JSON.stringify(state.classroom)),
        assignments: JSON.parse(JSON.stringify(state.assignments)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set({ seatSchemes: [...state.seatSchemes, scheme] });
      persist();
    },
    applySeatScheme: (schemeId) => {
      const state = get();
      const scheme = state.seatSchemes.find((s) => s.id === schemeId);
      if (!scheme) return;

      // 深拷贝以防止引用污染
      const classroom = JSON.parse(JSON.stringify(scheme.classroom));
      const assignments = JSON.parse(JSON.stringify(scheme.assignments));

      set({
        classroom,
        assignments,
        summary: summarize(state.className, state.students, classroom),
      });
      persist();
    },
    deleteSeatScheme: (schemeId) => {
      set((state) => ({
        seatSchemes: state.seatSchemes.filter((s) => s.id !== schemeId),
      }));
      persist();
    },
    renameSeatScheme: (schemeId, name) => {
      set((state) => ({
        seatSchemes: state.seatSchemes.map((s) =>
          s.id === schemeId ? { ...s, name, updatedAt: new Date().toISOString() } : s
        ),
      }));
      persist();
    },
  };
});

export default useClassStore;
