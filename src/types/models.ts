export type Gender = 'male' | 'female';

export interface Wish {
  id: string;
  type: 'deskmate' | 'zone' | 'avoid';
  targetId: string;
  priority: number;
  isRedeemed: boolean;
}

export type ConflictType = 
  | 'no_adjacent' // 不能相邻（左右上下都不行）
  | 'no_left_right' // 不能左右相邻
  | 'no_top_bottom' // 不能上下相邻
  | 'stay_front' // 该生需靠前
  | 'stay_back' // 该生需靠后
  | 'avoid'; // 完全避免（尽量不在同一教室区域）

export interface StudentConflict {
  id: string;
  targetStudentId: string; // 冲突的学生ID
  conflictType: ConflictType; // 冲突类型
  reason?: string; // 冲突原因（可选）
}

// 自定义字段定义
export interface CustomFieldDefinition {
  id: string;
  name: string; // 字段名称，如"家长电话"
  key: string; // 字段键，如"parent_phone"
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect'; // 字段类型
  required: boolean; // 是否必填
  options?: string[]; // 选择类型的选项
  defaultValue?: string | number;
  placeholder?: string;
  order: number; // 显示顺序
}

// 积分流水记录
export interface PointsLog {
  id: string;
  studentId: string;
  delta: number; // 积分变化量（正数为加分，负数为扣分）
  reasonType: 'attendance' | 'discipline' | 'performance' | 'homework' | 'activity' | 'manual' | 'redeem' | 'other';
  reasonDetail: string; // 详细原因
  operator: string; // 操作人（教师名称）
  createdAt: string; // ISO8601 时间戳
}

// 奖励配置
export interface Reward {
  id: string;
  name: string; // 奖励名称，如"座位优先选择权"
  type: 'seat_lock' | 'deskmate_priority' | 'zone_preference' | 'custom';
  costPoints: number; // 所需积分
  payload: Record<string, any>; // JSON 配置（如锁定区域、有效期等）
  limitPerStudent?: number; // 每个学生限兑次数（可选）
  isActive: boolean; // 是否启用
  description?: string; // 奖励描述
  icon?: string; // 图标
  order: number; // 排序
}

// 奖励兑换记录
export interface RewardRedeem {
  id: string;
  studentId: string;
  rewardId: string;
  status: 'pending' | 'active' | 'used' | 'expired' | 'cancelled';
  effectiveFrom: string; // 生效时间
  effectiveTo: string; // 失效时间
  linkedWishId?: string; // 关联的愿望ID（可选）
  createdAt: string; // 兑换时间
  usedAt?: string; // 使用时间
  notes?: string; // 备注
}

export interface Student {
  id: string;
  name: string;
  studentNumber?: string; // 学号
  className?: string; // 班级
  gender: Gender;
  height: number;
  vision: number;
  score: string | number; // 综合成绩，支持等级（A/B/C/D）或分数
  tags: string[];
  lockSeat?: string;
  flexibleData: Record<string, string | number>; // 存储自定义字段的值
  points: number;
  wishes: Wish[];
  // 新增字段
  remarks?: string; // 备注
  chineseScore?: string | number; // 语文成绩
  mathScore?: string | number; // 数学成绩
  englishScore?: string | number; // 英语成绩
  conflicts?: StudentConflict[]; // 冲突规则
  customColor?: string; // 自定义背景颜色
  groupLeaderRoles?: string[]; // 组长角色列表，如 ["语文组长", "数学组长", "班长"]
}

export type SeatCellType = 'seat' | 'aisle' | 'stage' | 'void' | 'door' | 'window';

export interface SeatCell {
  id: string;
  row: number;
  col: number;
  type: SeatCellType;
  label?: string;
}

// 课程信息
export interface Course {
  id: string;
  name: string; // 课程名称，如：语文、数学、体育
  teacher?: string; // 任课老师
  color?: string; // 课程颜色标识
}

// 课表节次（一节课）
export interface ClassPeriod {
  id: string;
  dayOfWeek: number; // 星期几（1-7，1=周一，7=周日）
  periodIndex: number; // 第几节课（1-8）
  courseId: string; // 课程ID
}

// 课表配置
export interface Schedule {
  periods: ClassPeriod[]; // 所有课时
  periodNames?: string[]; // 节次名称，如：['第一节', '第二节', ...]
  startTime?: string; // 上课时间
  endTime?: string; // 放学时间
}

// 操作历史记录
export interface HistoryAction {
  id: string;
  timestamp: string;
  actionType: string; // 操作类型：add_student, delete_student, swap_seats, etc.
  description: string; // 操作描述
  snapshot: {
    students: Student[];
    classroom: ClassroomConfig;
    assignments: SeatAssignment[];
    rules: SeatingRuleConfig;
  };
}

export interface ClassInfo {
  id: string;
  grade: string; // 年级，如 "2024级"、"高一"、"初二"
  className: string; // 班级名称，如 "1班"、"3班"
  fullName: string; // 完整名称，如 "2024级1班"
  createdAt: string;
  updatedAt: string;
  // 班级完整状态
  students: Student[];
  classroom: ClassroomConfig;
  assignments: SeatAssignment[];
  rules: SeatingRuleConfig;
  courses: Course[]; // 课程列表
  schedule: Schedule; // 课表
  history: HistoryAction[]; // 操作历史
  historyIndex: number; // 当前历史位置（用于撤销/重做）
  customFields: CustomFieldDefinition[]; // 学生自定义字段定义
  classCustomData: Record<string, string | number>; // 班级级别的自定义数据
  exams: Exam[]; // 考试列表
  examScores: ExamScore[]; // 考试成绩列表
  displaySettings?: DisplaySettings; // 显示设置
  pointsLogs?: PointsLog[]; // 积分流水记录
  rewards?: Reward[]; // 奖励配置列表
  rewardRedeems?: RewardRedeem[]; // 兑换记录列表
  seatSchemes?: SeatLayoutScheme[]; // 座位表方案列表
}

// 门窗位置
export interface DoorWindow {
  id: string;
  type: 'door' | 'window';
  position: 'left' | 'right' | 'top' | 'bottom'; // 位于哪一侧
  index: number; // 在该侧的第几个位置（从1开始，表示第几行或第几列）
}

export interface SeatGroup {
  id: string;
  name: string; // 组名，如 "第一组"
  seatIds: string[]; // 包含的座位ID列表
  color?: string; // 分组颜色（可选）
}

export interface ClassroomConfig {
  rows: number;
  cols: number;
  cells: SeatCell[];
  groupMode?: 'none' | 'column' | 'custom'; // 分组模式：无分组 | 按列分组 | 自由分组
  groupSize?: number; // 每组的列数（默认值，用于新组）
  groupSizes?: number[]; // 每组的列数数组（自定义每组列数）
  groupGap?: number; // 组间间隔（列数）
  customGroups?: SeatGroup[]; // 自由分组列表
  stageAlign?: 'left' | 'center' | 'right'; // 讲台对齐方式：左对齐 | 居中 | 右对齐
  showStageSideSeats?: boolean; // 是否显示讲台左右两侧座位
  subGroupRows?: number; // 组内分小组，每几行一组
  doorsWindows: DoorWindow[]; // 门窗列表
}

export interface SeatAssignment {
  seatId: string;
  studentId: string | null;
}

// 座位表方案
export interface SeatLayoutScheme {
  id: string;
  name: string;                // 方案名称，如"日常排座"、"考试模式"
  classroom: ClassroomConfig;  // 完整的教室配置快照
  assignments: SeatAssignment[]; // 座位分配快照
  createdAt: string;
  updatedAt: string;
}

export interface RelationPairRule {
  id: string;
  students: [string, string];
}

export interface TemporaryLockRule {
  id: string;
  studentId: string;
  seatId: string;
  expiresAt: string; // ISO8601
}

export interface SeatingRuleConfig {
  frontRowsForVision: number;
  visionThreshold: number;
  frontRowsForHeight: number;
  heightThreshold: number;
  genderPolicy: 'mix' | 'separate' | 'any';
  mutexPairs: RelationPairRule[];
  bindingPairs: RelationPairRule[];
  temporaryLocks: TemporaryLockRule[];
}

// 考试科目详情
export interface ExamSubject {
  name: string; // 科目名称
  notes?: string; // 科目备注
}

// 考试信息
export interface Exam {
  id: string;
  name: string; // 考试名称，如"期中考试"、"第一次月考"
  date: string; // 考试日期 ISO8601
  subjects: string[]; // 考试科目列表，如 ["语文", "数学", "英语"]
  subjectDetails?: { [key: string]: { notes?: string } }; // 科目详情（备注等）
  totalScore?: number; // 总分（可选）
  description?: string; // 考试说明
  createdAt: string;
}

// 考试成绩
export interface ExamScore {
  id: string;
  examId: string;
  studentId: string;
  subject: string; // 科目名称
  score: number; // 分数
  rank?: number; // 班级排名（可选）
  notes?: string; // 备注
}

export interface SmartSeatStateSnapshot {
  students: Student[];
  classroom: ClassroomConfig;
  assignments: SeatAssignment[];
  rules: SeatingRuleConfig;
}

export interface DisplaySettings {
  nameFontSize: number; // 姓名字体大小 (12-24)
  detailsFontSize: number; // 详细信息字体大小 (8-14)
  showStudentNumber: boolean; // 显示学号
  showGenderHeight: boolean; // 显示性别身高
  showVision: boolean; // 显示视力
  seatLabelSize: number; // 座位编号字体大小 (8-12)
}

