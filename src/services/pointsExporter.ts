import * as XLSX from 'xlsx';
import type { PointsLog, Student } from '../types/models';

/**
 * 导出积分流水为Excel文件
 */
export async function exportPointsLogsWorkbook(
  pointsLogs: PointsLog[],
  students: Student[],
  filename: string = 'PointsLogs.xlsx'
): Promise<void> {
  // 创建学生ID到姓名的映射
  const studentMap = new Map(students.map(s => [s.id, s.name]));
  
  // 准备导出数据
  const exportData = pointsLogs.map(log => ({
    '学生姓名': studentMap.get(log.studentId) || '未知',
    '积分变化': log.delta,
    '类型': getReasonTypeLabel(log.reasonType),
    '详细原因': log.reasonDetail,
    '操作人': log.operator,
    '操作时间': formatDate(log.createdAt),
  }));

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(exportData);
  
  // 设置列宽
  const colWidths = [
    { wch: 12 }, // 学生姓名
    { wch: 10 }, // 积分变化
    { wch: 12 }, // 类型
    { wch: 30 }, // 详细原因
    { wch: 12 }, // 操作人
    { wch: 20 }, // 操作时间
  ];
  ws['!cols'] = colWidths;
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '积分流水');
  
  // 生成Excel文件
  XLSX.writeFile(wb, filename);
}

/**
 * 导出学生积分汇总
 */
export async function exportStudentPointsSummary(
  students: Student[],
  pointsLogs: PointsLog[],
  filename: string = 'StudentPointsSummary.xlsx'
): Promise<void> {
  // 计算每个学生的积分统计
  const summaryData = students.map(student => {
    const logs = pointsLogs.filter(log => log.studentId === student.id);
    const totalIncome = logs.filter(l => l.delta > 0).reduce((sum, l) => sum + l.delta, 0);
    const totalExpense = logs.filter(l => l.delta < 0).reduce((sum, l) => sum + Math.abs(l.delta), 0);
    const logCount = logs.length;
    
    return {
      '姓名': student.name,
      '性别': student.gender === 'male' ? '男' : '女',
      '当前积分': student.points,
      '累计获得': totalIncome,
      '累计支出': totalExpense,
      '操作次数': logCount,
      '最后操作': logs.length > 0 ? formatDate(logs[logs.length - 1].createdAt) : '无',
    };
  });

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(summaryData);
  
  // 设置列宽
  const colWidths = [
    { wch: 12 }, // 姓名
    { wch: 6 },  // 性别
    { wch: 10 }, // 当前积分
    { wch: 10 }, // 累计获得
    { wch: 10 }, // 累计支出
    { wch: 10 }, // 操作次数
    { wch: 20 }, // 最后操作
  ];
  ws['!cols'] = colWidths;
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '学生积分汇总');
  
  // 生成Excel文件
  XLSX.writeFile(wb, filename);
}

/**
 * 获取原因类型的中文标签
 */
function getReasonTypeLabel(reasonType: PointsLog['reasonType']): string {
  const labels: Record<PointsLog['reasonType'], string> = {
    attendance: '出勤',
    discipline: '纪律',
    performance: '课堂表现',
    homework: '作业',
    activity: '活动',
    manual: '手动调整',
    redeem: '兑换',
    other: '其他',
  };
  return labels[reasonType] || reasonType;
}

/**
 * 格式化日期时间
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
