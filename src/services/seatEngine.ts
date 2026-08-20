import type {
  ClassroomConfig,
  SeatAssignment,
  SeatCell,
  SeatingRuleConfig,
  Student,
  Reward,
  RewardRedeem,
  TemporaryLockRule,
} from '../types/models';

const sortSeats = (cells: SeatCell[]): SeatCell[] =>
  [...cells]
    .filter((cell) => cell.type === 'seat')
    .sort((a, b) => (a.row - b.row === 0 ? a.col - b.col : a.row - b.row));

const needsFrontRow = (
  student: Student,
  rules: SeatingRuleConfig,
): { vision: boolean; height: boolean } => ({
  vision: student.vision <= rules.visionThreshold,
  height: student.height <= rules.heightThreshold,
});

const seatFitsStudent = (
  seat: SeatCell,
  requirement: { vision: boolean; height: boolean },
  rules: SeatingRuleConfig,
) => {
  if (requirement.vision && seat.row > rules.frontRowsForVision) return false;
  if (requirement.height && seat.row > rules.frontRowsForHeight) return false;
  return true;
};

const scoreStudent = (student: Student, rules: SeatingRuleConfig): number => {
  let score = 0;
  if (student.vision <= rules.visionThreshold) score += 100;
  if (student.height <= rules.heightThreshold) score += 50;
  if (student.tags.some((tag) => tag.includes('学霸'))) score += 20;
  score += Math.max(100 - Number(student.score || 0), 0) * 0.5;
  return score;
};

const buildAssignmentMap = (assignments: SeatAssignment[]) =>
  assignments.reduce<Record<string, string | null>>((acc, assignment) => {
    acc[assignment.seatId] = assignment.studentId ?? null;
    return acc;
  }, {});

const getActiveTemporaryLocks = (rules: SeatingRuleConfig) =>
  (rules.temporaryLocks ?? []).filter(
    (lock) => new Date(lock.expiresAt).getTime() >= Date.now(),
  );

const findDeskPair = (
  seats: SeatCell[],
  seatAvailability: Map<string, string | null>,
): [SeatCell, SeatCell] | null => {
  for (let i = 0; i < seats.length; i += 1) {
    const current = seats[i];
    const neighbor = seats.find(
      (seat) =>
        seat.row === current.row &&
        seat.col === current.col + 1 &&
        seatAvailability.get(current.id) === null &&
        seatAvailability.get(seat.id) === null,
    );
    if (neighbor) {
      return [current, neighbor];
    }
  }
  return null;
};

const getNeighbor = (seat: SeatCell, seats: SeatCell[]) => {
  // 简单检查左右相邻
  return seats.find(
    (s) => s.row === seat.row && Math.abs(s.col - seat.col) === 1
  );
};

const resolveMutexConflicts = (
  seatAvailability: Map<string, string | null>,
  seats: SeatCell[],
  rules: SeatingRuleConfig,
  immovableStudents: Set<string>,
) => {
  const seatMap = new Map(seats.map((seat) => [seat.id, seat]));
  const studentSeat = new Map<string, SeatCell>();
  seatAvailability.forEach((studentId, seatId) => {
    if (studentId) {
      const seat = seatMap.get(seatId);
      if (seat) studentSeat.set(studentId, seat);
    }
  });

  const lockedSeats = new Set<string>();
  rules.temporaryLocks?.forEach((lock) => lockedSeats.add(lock.seatId));

  const isSeatProtected = (seatId: string, occupant?: string | null) =>
    lockedSeats.has(seatId) || (occupant ? immovableStudents.has(occupant) : false);

  rules.mutexPairs.forEach((pair) => {
    const [firstId, secondId] = pair.students;
    const seatA = studentSeat.get(firstId);
    const seatB = studentSeat.get(secondId);
    if (!seatA || !seatB) return;

    // Check if they are adjacent
    const distRow = Math.abs(seatA.row - seatB.row);
    const distCol = Math.abs(seatA.col - seatB.col);
    const isAdjacent = (distRow === 0 && distCol === 1) || (distRow === 1 && distCol === 0);

    if (isAdjacent) {
      // Try to move one of them
      // Priority: move non-locked student
      let studentToMove: string | null = null;
      let currentSeat: SeatCell | null = null;

      const isAProtected = isSeatProtected(seatA.id, firstId);
      const isBProtected = isSeatProtected(seatB.id, secondId);

      if (!isAProtected) {
        studentToMove = firstId;
        currentSeat = seatA;
      } else if (!isBProtected) {
        studentToMove = secondId;
        currentSeat = seatB;
      }

      if (studentToMove && currentSeat) {
        const emptySeatId = Array.from(seatAvailability.entries()).find(
          ([_, occupant]) => occupant === null,
        )?.[0];

        if (emptySeatId) {
          seatAvailability.set(currentSeat.id, null);
          seatAvailability.set(emptySeatId, studentToMove);
          studentSeat.set(studentToMove, seatMap.get(emptySeatId)!);
        }
      }
    }
  });
};

export const generateSeatingPlan = (
  students: Student[],
  classroom: ClassroomConfig,
  rules: SeatingRuleConfig,
  activeRewards: Array<{ reward: Reward; redeem: RewardRedeem }> = [],
  currentAssignments: SeatAssignment[] = [],
): SeatAssignment[] => {
  // 1. 处理奖励规则
  // 将 seat_lock 类型的奖励转换为临时锁定
  const rewardLocks = activeRewards
    .filter(({ reward }) => reward.type === 'seat_lock')
    .map(({ redeem, reward }) => {
      const seatId = reward.payload.seatId;
      if (!seatId) return null;
      return {
        id: `reward-${redeem.id}`,
        studentId: redeem.studentId,
        seatId: seatId,
        expiresAt: redeem.effectiveTo,
      };
    })
    .filter(Boolean) as TemporaryLockRule[];

  // 合并临时锁定规则
  const effectiveLocks = [
    ...(rules.temporaryLocks || []),
    ...rewardLocks,
  ];

  // 将 deskmate_priority 类型的奖励转换为绑定对
  const rewardBindings = activeRewards
    .filter(({ reward }) => reward.type === 'deskmate_priority')
    .map(({ redeem, reward }) => {
      const targetStudentId = reward.payload.targetStudentId;
      if (!targetStudentId) return null;
      return {
        id: `reward-${redeem.id}`,
        students: [redeem.studentId, targetStudentId] as [string, string],
      };
    })
    .filter(Boolean) as Array<{ id: string; students: [string, string] }>;

  // 合并绑定对规则
  const effectiveBindingPairs = [
    ...(rules.bindingPairs || []),
    ...rewardBindings,
  ];

  // 使用合并后的规则进行排座
  const effectiveRules = {
    ...rules,
    temporaryLocks: effectiveLocks,
    bindingPairs: effectiveBindingPairs,
  };

  // ... (后续代码使用 effectiveRules 代替 rules)

  const seats = sortSeats(classroom.cells);
  const seatAvailability = new Map(seats.map((seat) => [seat.id, null as string | null]));
  const assignmentMap = buildAssignmentMap(currentAssignments);
  const activeLocks = getActiveTemporaryLocks(effectiveRules);
  const immovableStudents = new Set<string>();

  // preserve locked seats first
  students
    .filter((student) => student.lockSeat)
    .forEach((student) => {
      if (student.lockSeat && seatAvailability.has(student.lockSeat)) {
        seatAvailability.set(student.lockSeat, student.id);
        immovableStudents.add(student.id);
      }
    });

  activeLocks.forEach((lock) => {
    if (seatAvailability.has(lock.seatId)) {
      seatAvailability.set(lock.seatId, lock.studentId);
      immovableStudents.add(lock.studentId);
    }
  });

  effectiveRules.bindingPairs.forEach((pair) => {
    pair.students.forEach((id) => immovableStudents.add(id));
  });

  const seatIsLocked = new Set(
    [...students.filter((s) => s.lockSeat).map((s) => s.lockSeat!), ...activeLocks.map((lock) => lock.seatId)],
  );

  // reuse existing placement if it still satisfies
  currentAssignments.forEach((assignment) => {
    if (!assignment.studentId) return;
    if (seatAvailability.get(assignment.seatId) === null) {
      seatAvailability.set(assignment.seatId, assignment.studentId);
    }
  });

  const pendingStudents = new Set(
    students
      .filter((student) => ![...seatAvailability.values()].includes(student.id))
      .map((student) => student.id),
  );

  // binding pairs
  effectiveRules.bindingPairs.forEach((pair) => {
    const [firstId, secondId] = pair.students;
    if (!pendingStudents.has(firstId) || !pendingStudents.has(secondId)) return;
    const desk = findDeskPair(seats, seatAvailability);
    if (!desk) return;
    seatAvailability.set(desk[0].id, firstId);
    seatAvailability.set(desk[1].id, secondId);
    pendingStudents.delete(firstId);
    pendingStudents.delete(secondId);
  });

  const rankedStudents = students
    .filter((student) => pendingStudents.has(student.id))
    .sort((a, b) => scoreStudent(b, rules) - scoreStudent(a, rules));

  const isSeatFixed = (seatId: string) => seatIsLocked.has(seatId);

  seats.forEach((seat) => {
    if (seatAvailability.get(seat.id)) return;
    if (isSeatFixed(seat.id)) return;

    // 性别策略检查
    let preferredGender: 'male' | 'female' | null = null;
    if (rules.genderPolicy && rules.genderPolicy !== 'any') {
      const neighbor = getNeighbor(seat, seats);
      if (neighbor) {
        const neighborId = seatAvailability.get(neighbor.id);
        if (neighborId) {
          const neighborStudent = students.find((s) => s.id === neighborId);
          if (neighborStudent) {
            if (rules.genderPolicy === 'mix') {
              preferredGender = neighborStudent.gender === 'male' ? 'female' : 'male';
            } else if (rules.genderPolicy === 'separate') {
              preferredGender = neighborStudent.gender;
            }
          }
        }
      }
    }

    // 优先查找同时满足规则和性别偏好的学生
    let candidateIndex = -1;
    
    if (preferredGender) {
      candidateIndex = rankedStudents.findIndex((student) =>
        student.gender === preferredGender &&
        seatFitsStudent(seat, needsFrontRow(student, rules), rules)
      );
    }

    // 如果没找到，退化为只满足规则
    if (candidateIndex === -1) {
      candidateIndex = rankedStudents.findIndex((student) =>
        seatFitsStudent(seat, needsFrontRow(student, rules), rules),
      );
    }

    const student = rankedStudents.splice(
      candidateIndex >= 0 ? candidateIndex : 0,
      1,
    )[0];
    if (student) {
      seatAvailability.set(seat.id, student.id);
    }
  });

  // fill any remaining seat with whoever left
  seats.forEach((seat) => {
    if (seatAvailability.get(seat.id)) return;
    if (rankedStudents.length === 0) return;
    const student = rankedStudents.shift();
    if (student) {
      seatAvailability.set(seat.id, student.id);
    }
  });

  resolveMutexConflicts(seatAvailability, seats, rules, immovableStudents);

  return seats.map((seat) => ({
    seatId: seat.id,
    studentId: seatAvailability.get(seat.id) ?? assignmentMap[seat.id] ?? null,
  }));
};

