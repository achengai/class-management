import type {
  ClassroomConfig,
  SeatAssignment,
  SeatCell,
  Student,
  SmartSeatStateSnapshot,
  SeatingRuleConfig,
} from '../types/models';

export const DEFAULT_CLASS_ID = 'class-default';
export const DEFAULT_CLASS_NAME = '三年二班';

export const DEFAULT_RULES: SeatingRuleConfig = {
  visionThreshold: 4.8,
  frontRowsForVision: 2,
  heightThreshold: 150,
  frontRowsForHeight: 2,
  genderPolicy: 'any',
  mutexPairs: [],
  bindingPairs: [],
  temporaryLocks: [],
};

export const seedStudents: Student[] = [
  {
    id: 'stu-001',
    name: '张三',
    className: '三年二班',
    gender: 'male',
    height: 172,
    vision: 4.6,
    score: 92,
    tags: ['纪律委员', '近视'],
    remarks: '需要坐前排，戴眼镜',
    flexibleData: { 午餐: 'A餐' },
    points: 24,
    wishes: [],
  },
  {
    id: 'stu-002',
    name: '李四',
    className: '三年二班',
    gender: 'female',
    height: 158,
    vision: 5.0,
    score: 88,
    tags: ['语文课代表'],
    flexibleData: { 午餐: 'B餐' },
    points: 18,
    wishes: [],
  },
  {
    id: 'stu-003',
    name: '王五',
    className: '三年二班',
    gender: 'male',
    height: 165,
    vision: 4.5,
    score: 73,
    tags: ['多动'],
    flexibleData: { 午餐: 'A餐' },
    points: 6,
    wishes: [],
  },
  {
    id: 'stu-004',
    name: '赵六',
    className: '三年二班',
    gender: 'female',
    height: 149,
    vision: 5.2,
    score: 95,
    tags: ['学霸'],
    flexibleData: { 特长: '钢琴' },
    points: 32,
    wishes: [],
  },
  {
    id: 'stu-005',
    name: '陈七',
    className: '三年二班',
    gender: 'male',
    height: 160,
    vision: 4.2,
    score: 81,
    tags: ['爱讲话'],
    flexibleData: {},
    points: 9,
    wishes: [],
  },
  {
    id: 'stu-006',
    name: '刘八',
    className: '三年二班',
    gender: 'female',
    height: 155,
    vision: 4.9,
    score: 84,
    tags: ['近视'],
    flexibleData: {},
    points: 12,
    wishes: [],
  },
];

export const createSeatGrid = (rows: number, cols: number): SeatCell[] => {
  const cells: SeatCell[] = [];
  for (let r = 1; r <= rows; r += 1) {
    for (let c = 1; c <= cols; c += 1) {
      cells.push({
        id: `seat-${r}-${c}`,
        row: r,
        col: c,
        type: 'seat',
      });
    }
  }
  return cells;
};

export const buildAssignmentsForClassroom = (
  classroom: ClassroomConfig,
  students: Student[],
): SeatAssignment[] => {
  const seatCells = classroom.cells
    .filter((cell) => cell.type === 'seat')
    .sort((a, b) => (a.row - b.row === 0 ? a.col - b.col : a.row - b.row));

  return seatCells.map((cell, index) => ({
    seatId: cell.id,
    studentId: students[index]?.id ?? null,
  }));
};

export const createDefaultSnapshot = (): SmartSeatStateSnapshot => {
  // 创建 7x8 网格（包含讲台行）
  const rows = 7;
  const cols = 8;
  const cells = createSeatGrid(rows, cols);
  
  // 计算讲台居中位置
  const isEvenCols = cols % 2 === 0;
  const stageColStart = isEvenCols ? cols / 2 : Math.ceil(cols / 2);
  const stageColEnd = isEvenCols ? cols / 2 + 1 : Math.ceil(cols / 2);
  
  // 设置第1行为讲台（上方）
  const cellsWithStage = cells.map((cell): SeatCell => {
    if (cell.row === 1) {
      // 第1行：中间格子为讲台，其他为空白
      if (cell.col >= stageColStart && cell.col <= stageColEnd) {
        return { ...cell, type: 'stage' };
      } else {
        return { ...cell, type: 'void' };
      }
    }
    return cell;
  });
  
  const classroom: ClassroomConfig = {
    rows,
    cols,
    cells: cellsWithStage,
    doorsWindows: [],
  };
  
  return {
    students: seedStudents,
    classroom,
    assignments: buildAssignmentsForClassroom(classroom, seedStudents),
    rules: {
      ...DEFAULT_RULES,
      mutexPairs: [...DEFAULT_RULES.mutexPairs],
      bindingPairs: [...DEFAULT_RULES.bindingPairs],
      temporaryLocks: [...DEFAULT_RULES.temporaryLocks],
    },
  };
};

