import * as XLSX from 'xlsx';
import type { Student } from '../types/models';

const normalizeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

export async function parseStudentWorkbook(file: File): Promise<Student[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) {
    throw new Error('Excel 文件为空');
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: '',
  });

  return rows.map((row, index) => ({
    id: (row.id as string) || crypto.randomUUID(),
    name: (row.name as string) || (row['姓名'] as string) || `学生${index + 1}`,
    gender:
      ((row.gender as string) || (row['性别'] as string)) === '女'
        ? 'female'
        : 'male',
    height: normalizeNumber(row.height ?? row['身高'], 160),
    vision: normalizeNumber(row.vision ?? row['视力'], 5.0),
    score: normalizeNumber(row.score ?? row['成绩'], 80),
    tags: typeof row.tags === 'string' ? (row.tags as string).split(/[，,]/) : [],
    flexibleData: {},
    points: normalizeNumber(row.points, 0),
    wishes: [],
  }));
}

