import { useMemo } from 'react';
import { Drawer, List, Tag, Button, Space, Empty } from 'antd';
import { WarningFilled, AimOutlined } from '@ant-design/icons';
import { useClassStore } from '../../store/useClassStore';

type Props = {
  open: boolean;
  onClose: () => void;
};

const ConflictDrawer = ({ open, onClose }: Props) => {
  const assignments = useClassStore((state) => state.assignments);
  const students = useClassStore((state) => state.students);
  const classroom = useClassStore((state) => state.classroom);
  const rules = useClassStore((state) => state.rules);
  const setSpotlightStudent = useClassStore((state) => state.setSpotlightStudent);
  const runAutoArrange = useClassStore((state) => state.runAutoArrange);

  const conflicts = useMemo(() => {
    const seatMap = new Map(classroom.cells.map((cell) => [cell.id, cell]));
    const studentMap = new Map(students.map((student) => [student.id, student]));
    const issues: Array<{
      type: 'vision' | 'height' | 'mutex' | 'binding';
      studentName: string;
      seatLabel: string;
      detail: string;
      studentId: string;
    }> = [];

    assignments.forEach((assignment) => {
      if (!assignment.studentId) return;
      const seat = seatMap.get(assignment.seatId);
      const student = studentMap.get(assignment.studentId);
      if (!seat || !student) return;
      if (student.vision <= rules.visionThreshold && seat.row > rules.frontRowsForVision) {
        issues.push({
          type: 'vision',
          studentName: student.name,
          seatLabel: seat.id.replace('seat-', ''),
          detail: `视力 ${student.vision} 应位于前 ${rules.frontRowsForVision} 排`,
          studentId: student.id,
        });
      }
      if (student.height <= rules.heightThreshold && seat.row > rules.frontRowsForHeight) {
        issues.push({
          type: 'height',
          studentName: student.name,
          seatLabel: seat.id.replace('seat-', ''),
          detail: `身高 ${student.height}cm 应位于前 ${rules.frontRowsForHeight} 排`,
          studentId: student.id,
        });
      }
      
      // 互斥对检查
      if (rules.mutexPairs && rules.mutexPairs.length > 0) {
        const adjacentSeats = [
          classroom.cells.find(c => c.type === 'seat' && c.row === seat.row && c.col === seat.col - 1),
          classroom.cells.find(c => c.type === 'seat' && c.row === seat.row && c.col === seat.col + 1),
          classroom.cells.find(c => c.type === 'seat' && c.row === seat.row - 1 && c.col === seat.col),
          classroom.cells.find(c => c.type === 'seat' && c.row === seat.row + 1 && c.col === seat.col),
        ].filter(Boolean);
        
        for (const adjSeat of adjacentSeats) {
          const adjAssignment = assignments.find(a => a.seatId === adjSeat!.id);
          if (!adjAssignment?.studentId) continue;
          
          const adjStudent = studentMap.get(adjAssignment.studentId);
          if (!adjStudent) continue;
          
          const hasMutex = rules.mutexPairs.some(pair =>
            (pair.students[0] === student.id && pair.students[1] === adjStudent.id) ||
            (pair.students[1] === student.id && pair.students[0] === adjStudent.id)
          );
          
          if (hasMutex) {
            issues.push({
              type: 'mutex',
              studentName: student.name,
              seatLabel: seat.id.replace('seat-', ''),
              detail: `与${adjStudent.name}互斥，不能相邻`,
              studentId: student.id,
            });
          }
        }
      }
      
      // 绑定对检查
      if (rules.bindingPairs && rules.bindingPairs.length > 0) {
        const bindingPair = rules.bindingPairs.find(pair =>
          pair.students[0] === student.id || pair.students[1] === student.id
        );
        
        if (bindingPair) {
          const boundStudentId = bindingPair.students[0] === student.id
            ? bindingPair.students[1]
            : bindingPair.students[0];
          
          const boundStudent = studentMap.get(boundStudentId);
          if (boundStudent) {
            const boundAssignment = assignments.find(a => a.studentId === boundStudentId);
            if (!boundAssignment) {
              issues.push({
                type: 'binding',
                studentName: student.name,
                seatLabel: seat.id.replace('seat-', ''),
                detail: `需与${boundStudent.name}同桌，但对方未分配座位`,
                studentId: student.id,
              });
            } else {
              const boundSeat = seatMap.get(boundAssignment.seatId);
              if (boundSeat) {
                const isSameDeskmate =
                  seat.row === boundSeat.row &&
                  Math.abs(seat.col - boundSeat.col) === 1;
                
                if (!isSameDeskmate) {
                  issues.push({
                    type: 'binding',
                    studentName: student.name,
                    seatLabel: seat.id.replace('seat-', ''),
                    detail: `需与${boundStudent.name}同桌，但不在相邻座位`,
                    studentId: student.id,
                  });
                }
              }
            }
          }
        }
      }
    });

    return issues;
  }, [assignments, classroom.cells, rules, students]);

  return (
    <Drawer
      title="规则冲突诊断"
      placement="right"
      width={360}
      open={open}
      onClose={() => {
        setSpotlightStudent(undefined);
        onClose();
      }}
      extra={
        <Button type="primary" onClick={runAutoArrange}>
          智能纠错
        </Button>
      }
    >
      {conflicts.length === 0 ? (
        <Empty description="当前没有规则冲突" />
      ) : (
        <List
          itemLayout="vertical"
          dataSource={conflicts}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key="locate"
                  type="link"
                  size="small"
                  icon={<AimOutlined />}
                  onClick={() => {
                    setSpotlightStudent(item.studentId);
                    document.getElementById('seat-grid-root')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  高亮定位
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<WarningFilled style={{ color: '#f97316' }} />}
                title={
                  <Space>
                    <span>{item.studentName}</span>
                    <Tag color={
                      item.type === 'vision' ? 'red' : 
                      item.type === 'height' ? 'orange' :
                      item.type === 'mutex' ? 'volcano' :
                      'blue'
                    }>
                      {item.type === 'vision' ? '视力规则' : 
                       item.type === 'height' ? '身高规则' :
                       item.type === 'mutex' ? '互斥规则' :
                       '绑定规则'}
                    </Tag>
                  </Space>
                }
                description={`座位 ${item.seatLabel} · ${item.detail}`}
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
};

export default ConflictDrawer;

