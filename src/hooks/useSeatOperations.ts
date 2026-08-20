import { useCallback } from 'react';
import { useClassStore } from '../store/useClassStore';
import type { MessageInstance } from 'antd/es/message/interface';

interface UseSeatOperationsProps {
  selectedSeats: Set<string>;
  setSelectedSeats: (seats: Set<string>) => void;
  setSelectionMode: (mode: boolean) => void;
  msgApi: MessageInstance;
}

export const useSeatOperations = ({
  selectedSeats,
  setSelectedSeats,
  setSelectionMode,
  msgApi,
}: UseSeatOperationsProps) => {
  const classroom = useClassStore((state) => state.classroom);
  const assignments = useClassStore((state) => state.assignments);
  const batchUpdateAssignments = useClassStore((state) => state.batchUpdateAssignments);

  // 行轮换
  const handleRowRotate = useCallback(() => {
    if (selectedSeats.size === 0) {
      msgApi.warning('请先选择座位');
      return;
    }

    const selectedCells = classroom.cells.filter(cell => selectedSeats.has(cell.id));
    const rows = [...new Set(selectedCells.map(c => c.row))].sort((a, b) => a - b);
    
    if (rows.length < 2) {
      msgApi.warning('请选择至少两行座位');
      return;
    }

    // 按行和列建立座位映射： row -> col -> seatId
    const rowColMap: Record<number, Record<number, string>> = {};
    rows.forEach(row => {
      rowColMap[row] = {};
      classroom.cells
        .filter(c => c.row === row && c.type === 'seat')
        .forEach(c => {
          rowColMap[row][c.col] = c.id;
        });
    });

    // 获取每行每列的学生ID： row -> col -> studentId
    const rowStudentMap: Record<number, Record<number, string | null>> = {};
    rows.forEach(row => {
      rowStudentMap[row] = {};
      Object.entries(rowColMap[row]).forEach(([colStr, seatId]) => {
        const col = parseInt(colStr);
        const assignment = assignments.find(a => a.seatId === seatId);
        rowStudentMap[row][col] = assignment?.studentId || null;
      });
    });

    // 轮换：最后一行移到第一行，其他行顺延
    const rotatedRows = [rows[rows.length - 1], ...rows.slice(0, -1)];

    // 应用轮换
    const newAssignments = assignments.map(assignment => {
      const cell = classroom.cells.find(c => c.id === assignment.seatId);
      if (!cell || !rows.includes(cell.row)) return assignment;

      // 找到该座位在轮换后应该对应的行
      const currentRowIndex = rows.indexOf(cell.row);
      const sourceRow = rotatedRows[currentRowIndex];
      
      // 从源行的相同列获取学生ID
      const newStudentId = rowStudentMap[sourceRow]?.[cell.col] || null;
      return { ...assignment, studentId: newStudentId };
    });
    
    batchUpdateAssignments(newAssignments);
    msgApi.success(`已轮换${rows.length}行座位`);
    setSelectedSeats(new Set());
    setSelectionMode(false);
  }, [selectedSeats, classroom.cells, assignments, batchUpdateAssignments, msgApi, setSelectedSeats, setSelectionMode]);

  // 列轮换
  const handleColumnRotate = useCallback(() => {
    if (selectedSeats.size === 0) {
      msgApi.warning('请先选择座位');
      return;
    }

    const selectedCells = classroom.cells.filter(cell => selectedSeats.has(cell.id));
    const cols = [...new Set(selectedCells.map(c => c.col))].sort((a, b) => a - b);
    
    if (cols.length < 2) {
      msgApi.warning('请选择至少两列座位');
      return;
    }

    // 按列和行建立座位映射： col -> row -> seatId
    const colRowMap: Record<number, Record<number, string>> = {};
    cols.forEach(col => {
      colRowMap[col] = {};
      classroom.cells
        .filter(c => c.col === col && c.type === 'seat')
        .forEach(c => {
          colRowMap[col][c.row] = c.id;
        });
    });

    // 获取每列每行的学生ID： col -> row -> studentId
    const colStudentMap: Record<number, Record<number, string | null>> = {};
    cols.forEach(col => {
      colStudentMap[col] = {};
      Object.entries(colRowMap[col]).forEach(([rowStr, seatId]) => {
        const row = parseInt(rowStr);
        const assignment = assignments.find(a => a.seatId === seatId);
        colStudentMap[col][row] = assignment?.studentId || null;
      });
    });

    // 轮换：最后一列移到第一列，其他列顺延
    const rotatedCols = [cols[cols.length - 1], ...cols.slice(0, -1)];

    // 应用轮换
    const newAssignments = assignments.map(assignment => {
      const cell = classroom.cells.find(c => c.id === assignment.seatId);
      if (!cell || !cols.includes(cell.col)) return assignment;

      // 找到该座位在轮换后应该对应的列
      const currentColIndex = cols.indexOf(cell.col);
      const sourceCol = rotatedCols[currentColIndex];
      
      // 从源列的相同行获取学生ID
      const newStudentId = colStudentMap[sourceCol]?.[cell.row] || null;
      return { ...assignment, studentId: newStudentId };
    });
    
    batchUpdateAssignments(newAssignments);
    msgApi.success(`已轮换${cols.length}列座位`);
    setSelectedSeats(new Set());
    setSelectionMode(false);
  }, [selectedSeats, classroom.cells, assignments, batchUpdateAssignments, msgApi, setSelectedSeats, setSelectionMode]);

  // 所有行循环移动
  const handleAllRowsShift = useCallback((direction: 'up' | 'down') => {
    // 获取所有行号
    const allRows = [...new Set(classroom.cells.filter(c => c.type === 'seat').map(c => c.row))].sort((a, b) => a - b);
    
    if (allRows.length < 2) {
      msgApi.warning('至少需要两行才能循环移动');
      return;
    }

    // 按行和列建立座位映射
    const rowColMap: Record<number, Record<number, string>> = {};
    allRows.forEach(row => {
      rowColMap[row] = {};
      classroom.cells
        .filter(c => c.row === row && c.type === 'seat')
        .forEach(c => {
          rowColMap[row][c.col] = c.id;
        });
    });

    // 获取每行每列的学生ID
    const rowStudentMap: Record<number, Record<number, string | null>> = {};
    allRows.forEach(row => {
      rowStudentMap[row] = {};
      Object.entries(rowColMap[row]).forEach(([colStr, seatId]) => {
        const col = parseInt(colStr);
        const assignment = assignments.find(a => a.seatId === seatId);
        rowStudentMap[row][col] = assignment?.studentId || null;
      });
    });

    // 循环移动：向上=第一行移到最后，其他行上移；向下=最后一行移到第一行，其他行下移
    const rotatedRows = direction === 'up' 
      ? [...allRows.slice(1), allRows[0]]  // 向上：[2,3,4,1]
      : [allRows[allRows.length - 1], ...allRows.slice(0, -1)];  // 向下：[4,1,2,3]

    // 应用移动
    const newAssignments = assignments.map(assignment => {
      const cell = classroom.cells.find(c => c.id === assignment.seatId);
      if (!cell || !allRows.includes(cell.row)) return assignment;

      const currentRowIndex = allRows.indexOf(cell.row);
      const sourceRow = rotatedRows[currentRowIndex];
      const newStudentId = rowStudentMap[sourceRow]?.[cell.col] || null;
      return { ...assignment, studentId: newStudentId };
    });
    
    batchUpdateAssignments(newAssignments);
    msgApi.success(`已将所有行循环${direction === 'up' ? '上' : '下'}移`);
  }, [classroom.cells, assignments, batchUpdateAssignments, msgApi]);

  // 所有列循环移动
  const handleAllColumnsShift = useCallback((direction: 'left' | 'right') => {
    // 获取所有列号
    const allCols = [...new Set(classroom.cells.filter(c => c.type === 'seat').map(c => c.col))].sort((a, b) => a - b);
    
    if (allCols.length < 2) {
      msgApi.warning('至少需要两列才能循环移动');
      return;
    }

    // 按列和行建立座位映射
    const colRowMap: Record<number, Record<number, string>> = {};
    allCols.forEach(col => {
      colRowMap[col] = {};
      classroom.cells
        .filter(c => c.col === col && c.type === 'seat')
        .forEach(c => {
          colRowMap[col][c.row] = c.id;
        });
    });

    // 获取每列每行的学生ID
    const colStudentMap: Record<number, Record<number, string | null>> = {};
    allCols.forEach(col => {
      colStudentMap[col] = {};
      Object.entries(colRowMap[col]).forEach(([rowStr, seatId]) => {
        const row = parseInt(rowStr);
        const assignment = assignments.find(a => a.seatId === seatId);
        colStudentMap[col][row] = assignment?.studentId || null;
      });
    });

    // 循环移动：向左=第一列移到最后，其他列左移；向右=最后一列移到第一列，其他列右移
    const rotatedCols = direction === 'left'
      ? [...allCols.slice(1), allCols[0]]  // 向左：[2,3,4,1]
      : [allCols[allCols.length - 1], ...allCols.slice(0, -1)];  // 向右：[4,1,2,3]

    // 应用移动
    const newAssignments = assignments.map(assignment => {
      const cell = classroom.cells.find(c => c.id === assignment.seatId);
      if (!cell || !allCols.includes(cell.col)) return assignment;

      const currentColIndex = allCols.indexOf(cell.col);
      const sourceCol = rotatedCols[currentColIndex];
      const newStudentId = colStudentMap[sourceCol]?.[cell.row] || null;
      return { ...assignment, studentId: newStudentId };
    });
    
    batchUpdateAssignments(newAssignments);
    msgApi.success(`已将所有列循环${direction === 'left' ? '左' : '右'}移`);
  }, [classroom.cells, assignments, batchUpdateAssignments, msgApi]);

  // 交换两行
  const handleSwapTwoRows = useCallback(() => {
    if (selectedSeats.size === 0) {
      msgApi.warning('请先选择座位');
      return;
    }

    const selectedCells = classroom.cells.filter(cell => selectedSeats.has(cell.id));
    const rows = [...new Set(selectedCells.map(c => c.row))].sort((a, b) => a - b);
    
    if (rows.length !== 2) {
      msgApi.warning('请选择正好两行座位');
      return;
    }

    const [row1, row2] = rows;

    // 按行和列建立座位映射
    const rowColMap: Record<number, Record<number, string>> = {};
    [row1, row2].forEach(row => {
      rowColMap[row] = {};
      classroom.cells
        .filter(c => c.row === row && c.type === 'seat')
        .forEach(c => {
          rowColMap[row][c.col] = c.id;
        });
    });

    // 获取每行每列的学生ID
    const rowStudentMap: Record<number, Record<number, string | null>> = {};
    [row1, row2].forEach(row => {
      rowStudentMap[row] = {};
      Object.entries(rowColMap[row]).forEach(([colStr, seatId]) => {
        const col = parseInt(colStr);
        const assignment = assignments.find(a => a.seatId === seatId);
        rowStudentMap[row][col] = assignment?.studentId || null;
      });
    });

    // 交换：第1行和第2行相互交换
    const newAssignments = assignments.map(assignment => {
      const cell = classroom.cells.find(c => c.id === assignment.seatId);
      if (!cell || !rows.includes(cell.row)) return assignment;

      // 找到对应的另一行
      const targetRow = cell.row === row1 ? row2 : row1;
      
      // 检查目标行是否有对应的列
      if (rowStudentMap[targetRow] && cell.col in rowStudentMap[targetRow]) {
        const newStudentId = rowStudentMap[targetRow][cell.col];
        return { ...assignment, studentId: newStudentId };
      }
      
      // 如果目标行没有对应的列，保持原样
      return assignment;
    });
    
    batchUpdateAssignments(newAssignments);
    msgApi.success(`已交换第${row1}行和第${row2}行`);
    setSelectedSeats(new Set());
    setSelectionMode(false);
  }, [selectedSeats, classroom.cells, assignments, batchUpdateAssignments, msgApi, setSelectedSeats, setSelectionMode]);

  // 交换两列
  const handleSwapTwoColumns = useCallback(() => {
    if (selectedSeats.size === 0) {
      msgApi.warning('请先选择座位');
      return;
    }

    const selectedCells = classroom.cells.filter(cell => selectedSeats.has(cell.id));
    const cols = [...new Set(selectedCells.map(c => c.col))].sort((a, b) => a - b);
    
    if (cols.length !== 2) {
      msgApi.warning('请选择正好两列座位');
      return;
    }

    const [col1, col2] = cols;

    // 按列和行建立座位映射
    const colRowMap: Record<number, Record<number, string>> = {};
    [col1, col2].forEach(col => {
      colRowMap[col] = {};
      classroom.cells
        .filter(c => c.col === col && c.type === 'seat')
        .forEach(c => {
          colRowMap[col][c.row] = c.id;
        });
    });

    // 获取每列每行的学生ID
    const colStudentMap: Record<number, Record<number, string | null>> = {};
    [col1, col2].forEach(col => {
      colStudentMap[col] = {};
      Object.entries(colRowMap[col]).forEach(([rowStr, seatId]) => {
        const row = parseInt(rowStr);
        const assignment = assignments.find(a => a.seatId === seatId);
        colStudentMap[col][row] = assignment?.studentId || null;
      });
    });

    // 交换：第1列和第2列相互交换
    const newAssignments = assignments.map(assignment => {
      const cell = classroom.cells.find(c => c.id === assignment.seatId);
      if (!cell || !cols.includes(cell.col)) return assignment;

      // 找到对应的另一列
      const targetCol = cell.col === col1 ? col2 : col1;
      
      // 检查目标列是否有对应的行
      if (colStudentMap[targetCol] && cell.row in colStudentMap[targetCol]) {
        const newStudentId = colStudentMap[targetCol][cell.row];
        return { ...assignment, studentId: newStudentId };
      }
      
      // 如果目标列没有对应的行，保持原样
      return assignment;
    });
    
    batchUpdateAssignments(newAssignments);
    msgApi.success(`已交换第${col1}列和第${col2}列`);
    setSelectedSeats(new Set());
    setSelectionMode(false);
  }, [selectedSeats, classroom.cells, assignments, batchUpdateAssignments, msgApi, setSelectedSeats, setSelectionMode]);

  return {
    handleRowRotate,
    handleColumnRotate,
    handleAllRowsShift,
    handleAllColumnsShift,
    handleSwapTwoRows,
    handleSwapTwoColumns,
  };
};
