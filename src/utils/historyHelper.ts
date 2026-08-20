import type { ClassInfo, HistoryAction } from '../types/models';

const MAX_HISTORY_LENGTH = 50; // 最多保存50条历史记录

export const saveHistory = (
  currentClass: ClassInfo,
  actionType: string,
  description: string
): ClassInfo => {
  const newHistoryAction: HistoryAction = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actionType,
    description,
    snapshot: {
      students: currentClass.students,
      classroom: currentClass.classroom,
      assignments: currentClass.assignments,
      rules: currentClass.rules,
    },
  };

  // 如果当前不在最新位置，删除后面的历史
  const history = currentClass.history.slice(0, currentClass.historyIndex + 1);
  
  // 添加新历史
  const newHistory = [...history, newHistoryAction];
  
  // 如果超过最大长度，删除最旧的记录
  if (newHistory.length > MAX_HISTORY_LENGTH) {
    newHistory.shift();
  }

  return {
    ...currentClass,
    history: newHistory,
    historyIndex: newHistory.length - 1,
    updatedAt: new Date().toISOString(),
  };
};
