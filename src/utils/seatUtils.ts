import type { SeatCell, Student } from '../types/models';
import type { useClassStore } from '../store/useClassStore';
import { evaluateAllRules } from '../services/rules/RuleEngine';

type RuleShape = ReturnType<typeof useClassStore.getState>['rules'];
type AssignmentShape = ReturnType<typeof useClassStore.getState>['assignments'][number];
type FilterShape = ReturnType<typeof useClassStore.getState>['filters'];

export const collectWarnings = (
  seat: SeatCell,
  student: Student | undefined,
  rules: RuleShape,
  allCells: SeatCell[],
  allAssignments: AssignmentShape[],
  allStudents: Student[],
) => {
  if (!student) return [];
  
  return evaluateAllRules({
    seat,
    student,
    rules,
    classroom: { cells: allCells } as any, // RuleEngine expects ClassroomConfig but only uses cells. We might need to adjust RuleContext or cast here.
    assignments: allAssignments,
    students: allStudents,
  });
};

export const matchesFilter = (
  student: Student,
  filters: FilterShape,
) => {
  const keyword = filters.keyword.trim().toLowerCase();
  const matchKeyword =
    !keyword ||
    student.name.toLowerCase().includes(keyword) ||
    student.tags.some((tag) => tag.toLowerCase().includes(keyword));
  const matchTag = !filters.tag || student.tags.includes(filters.tag);
  return matchKeyword && matchTag;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const getHeatmapColor = (
  mode: FilterShape['heatmapMode'],
  student?: Student,
) => {
  if (!student || mode === 'none') return undefined;
  if (mode === 'vision') {
    const ratio = 1 - clamp((student.vision - 4) / 1.3, 0, 1);
    const hue = 0 + ratio * 40;
    return `hsla(${hue}, 85%, 75%, 0.7)`;
  }
  if (mode === 'score') {
    const scoreVal = typeof student.score === 'number' ? student.score : parseFloat(student.score as string) || 0;
    const ratio = clamp(scoreVal / 100, 0, 1);
    const hue = 210 - ratio * 120;
    return `hsla(${hue}, 70%, 70%, 0.7)`;
  }
  return undefined;
};

export const getSeatDisplayLabel = (seat: SeatCell, stagePosition: 'top' | 'bottom' | 'left' | 'right' | null): string => {
  if (seat.type !== 'seat') return '';
  
  let displayRow = seat.row;
  let displayCol = seat.col;
  
  // 根据讲台位置调整显示编号
  if (stagePosition === 'top') {
    displayRow = seat.row - 1;
  } else if (stagePosition === 'left') {
    displayCol = seat.col - 1;
  }
  // bottom 和 right 位置不需要调整，因为讲台在后面
  
  return `${displayRow}-${displayCol}`;
};
