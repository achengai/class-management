import * as XLSX from 'xlsx';
import type { ClassroomConfig, SeatAssignment, Student } from '../types/models';

const buildSeatDataset = (
  students: Student[],
  assignments: SeatAssignment[],
  classroom: ClassroomConfig,
) => {
  const seatMap = new Map(classroom.cells.map((cell) => [cell.id, cell]));
  const studentMap = new Map(students.map((student) => [student.id, student]));

  return assignments.map((assignment) => {
    const seat = seatMap.get(assignment.seatId);
    const student = assignment.studentId ? studentMap.get(assignment.studentId) : undefined;
    return {
      SeatId: seat?.id ?? assignment.seatId,
      Row: seat?.row ?? '',
      Column: seat?.col ?? '',
      Student: student?.name ?? '空位',
      Gender: student?.gender === 'male' ? '男' : student?.gender === 'female' ? '女' : '',
      Height: student?.height ?? '',
      Vision: student?.vision ?? '',
      Score: student?.score ?? '',
      Tags: student?.tags.join(', ') ?? '',
    };
  });
};

const buildStudentDataset = (students: Student[]) =>
  students.map((student) => ({
    ID: student.id,
    Name: student.name,
    Gender: student.gender === 'male' ? '男' : '女',
    Height: student.height,
    Vision: student.vision,
    Score: student.score,
    Tags: student.tags.join(', '),
    Points: student.points,
  }));

export async function exportSeatPlanWorkbook(
  students: Student[],
  assignments: SeatAssignment[],
  classroom: ClassroomConfig,
  fileName = 'SeatPlan.xlsx',
) {
  if (assignments.length === 0) {
    throw new Error('当前没有任何排座数据，无法导出');
  }
  const seatSheet = XLSX.utils.json_to_sheet(buildSeatDataset(students, assignments, classroom));
  const studentSheet = XLSX.utils.json_to_sheet(buildStudentDataset(students));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, seatSheet, 'SeatPlan');
  XLSX.utils.book_append_sheet(workbook, studentSheet, 'Students');
  XLSX.writeFile(workbook, fileName);
}

