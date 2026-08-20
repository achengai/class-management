import type { SeatCell, Student, ClassroomConfig, SeatAssignment, SeatingRuleConfig } from '../../types/models';

// 规则类型
export type RuleId = string;

// 规则评估上下文
export interface RuleContext {
  seat: SeatCell;
  student: Student;
  classroom: ClassroomConfig;
  assignments: SeatAssignment[];
  students: Student[];
  rules: SeatingRuleConfig;
}

// 规则评估结果
export interface RuleResult {
  passed: boolean;
  warning?: string;
  score?: number; // 用于自动排座的评分，负分表示不推荐
}

// 规则接口
export interface ISeatRule {
  id: RuleId;
  name: string;
  description: string;
  enabled: boolean;
  priority: number; // 优先级，越高越重要
  
  evaluate(ctx: RuleContext): RuleResult;
}

// 抽象基础规则类
export abstract class BaseRule implements ISeatRule {
  id: RuleId;
  name: string;
  description: string;
  enabled: boolean = true;
  priority: number = 0;

  constructor(id: string, name: string, description: string, priority: number = 0) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.priority = priority;
  }

  abstract evaluate(ctx: RuleContext): RuleResult;
}

// 视力规则
export class VisionRule extends BaseRule {
  constructor() {
    super('vision', '视力规则', '视力不好的学生需要坐在前排', 100);
  }

  evaluate(ctx: RuleContext): RuleResult {
    const { student, seat, rules } = ctx;
    if (student.vision <= rules.visionThreshold && seat.row > rules.frontRowsForVision) {
      return {
        passed: false,
        warning: '视力需前排',
        score: -50
      };
    }
    return { passed: true };
  }
}

// 身高规则
export class HeightRule extends BaseRule {
  constructor() {
    super('height', '身高规则', '身高较矮的学生需要坐在前排', 80);
  }

  evaluate(ctx: RuleContext): RuleResult {
    const { student, seat, rules } = ctx;
    if (student.height <= rules.heightThreshold && seat.row > rules.frontRowsForHeight) {
      return {
        passed: false,
        warning: '身高需前排',
        score: -30
      };
    }
    return { passed: true };
  }
}

// 互斥对规则
export class MutexRule extends BaseRule {
  constructor() {
    super('mutex', '互斥规则', '互斥的学生不能相邻就坐', 200);
  }

  evaluate(ctx: RuleContext): RuleResult {
    const { student, seat, rules, classroom, assignments, students } = ctx;
    
    if (!rules.mutexPairs || rules.mutexPairs.length === 0) return { passed: true };

    // 查找相邻座位
    const adjacentSeats = [
      classroom.cells.find(c => c.type === 'seat' && c.row === seat.row && c.col === seat.col - 1), // 左侧
      classroom.cells.find(c => c.type === 'seat' && c.row === seat.row && c.col === seat.col + 1), // 右侧
      classroom.cells.find(c => c.type === 'seat' && c.row === seat.row - 1 && c.col === seat.col), // 前面
      classroom.cells.find(c => c.type === 'seat' && c.row === seat.row + 1 && c.col === seat.col), // 后面
    ].filter(Boolean) as SeatCell[];

    for (const adjSeat of adjacentSeats) {
      const adjAssignment = assignments.find(a => a.seatId === adjSeat.id);
      if (!adjAssignment?.studentId) continue;
      
      const adjStudent = students.find(s => s.id === adjAssignment.studentId);
      if (!adjStudent) continue;
      
      const hasMutex = rules.mutexPairs.some(pair => 
        (pair.students[0] === student.id && pair.students[1] === adjStudent.id) ||
        (pair.students[1] === student.id && pair.students[0] === adjStudent.id)
      );
      
      if (hasMutex) {
        return {
          passed: false,
          warning: `与${adjStudent.name}互斥`,
          score: -100
        };
      }
    }
    
    return { passed: true };
  }
}

// 绑定对规则
export class BindingRule extends BaseRule {
  constructor() {
    super('binding', '绑定规则', '绑定的学生必须同桌就坐', 150);
  }

  evaluate(ctx: RuleContext): RuleResult {
    const { student, seat, rules, classroom, assignments, students } = ctx;
    
    if (!rules.bindingPairs || rules.bindingPairs.length === 0) return { passed: true };

    const bindingPair = rules.bindingPairs.find(pair => 
      pair.students[0] === student.id || pair.students[1] === student.id
    );
    
    if (bindingPair) {
      const boundStudentId = bindingPair.students[0] === student.id 
        ? bindingPair.students[1] 
        : bindingPair.students[0];
      
      const boundStudent = students.find(s => s.id === boundStudentId);
      if (!boundStudent) return { passed: true, warning: '绑定学生不存在' };

      const boundAssignment = assignments.find(a => a.studentId === boundStudentId);
      
      // 如果绑定学生还没排座位，暂时不报错（或者是双向检查？）
      // 这里简单处理：如果绑定学生已排座，检查是否同桌
      if (boundAssignment) {
        const boundSeat = classroom.cells.find(c => c.id === boundAssignment.seatId);
        if (boundSeat) {
          const isSameDeskmate = 
            seat.row === boundSeat.row && 
            Math.abs(seat.col - boundSeat.col) === 1;
          
          if (!isSameDeskmate) {
            return {
              passed: false,
              warning: `需与${boundStudent.name}同桌`,
              score: -80
            };
          }
        }
      }
    }
    
    return { passed: true };
  }
}

// 规则工厂/注册表
export class RuleRegistry {
  private static rules: Map<RuleId, ISeatRule> = new Map();

  static register(rule: ISeatRule) {
    this.rules.set(rule.id, rule);
  }

  static get(id: RuleId): ISeatRule | undefined {
    return this.rules.get(id);
  }

  static getAll(): ISeatRule[] {
    return Array.from(this.rules.values())
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority);
  }
  
  // 初始化默认规则
  static initDefaultRules() {
    this.register(new VisionRule());
    this.register(new HeightRule());
    this.register(new MutexRule());
    this.register(new BindingRule());
  }
}

// 运行所有规则
export const evaluateAllRules = (ctx: RuleContext): string[] => {
  const warnings: string[] = [];
  const rules = RuleRegistry.getAll();
  
  for (const rule of rules) {
    const result = rule.evaluate(ctx);
    if (!result.passed && result.warning) {
      warnings.push(result.warning);
    }
  }
  
  return warnings;
};

// 初始化
RuleRegistry.initDefaultRules();
