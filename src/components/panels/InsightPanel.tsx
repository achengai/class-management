import { useMemo } from 'react';
import { Progress, Tooltip, Tag, Statistic, Row, Col, Avatar, List } from 'antd';
import { InfoCircleOutlined, StarOutlined, TrophyOutlined } from '@ant-design/icons';
import { useClassStore } from '../../store/useClassStore';

type InsightMetric = {
  label: string;
  value: string;
  trend?: string;
  status?: 'success' | 'exception' | 'active' | 'normal';
};

const InsightPanel = () => {
  const assignments = useClassStore((state) => state.assignments);
  const classroom = useClassStore((state) => state.classroom);
  const students = useClassStore((state) => state.students);
  const rules = useClassStore((state) => state.rules);
  const pointsLogs = useClassStore((state) => state.pointsLogs);
  const rewardRedeems = useClassStore((state) => state.rewardRedeems);

  const data = useMemo(() => {
    // ... (原有逻辑保持不变)
    const seatMap = new Map(classroom.cells.map((cell) => [cell.id, cell]));
    const studentMap = new Map(students.map((student) => [student.id, student]));
    const goldenRows = Math.min(3, classroom.rows);
    const goldenSeats = classroom.cols * goldenRows;

    let visionViolations = 0;
    let heightViolations = 0;
    let goldenOccupancy = 0;
    let occupiedSeats = 0;

    assignments.forEach((assignment) => {
      if (!assignment.studentId) return;
      const seat = seatMap.get(assignment.seatId);
      const student = studentMap.get(assignment.studentId);
      if (!seat || !student) return;
      occupiedSeats += 1;
      if (seat.row <= goldenRows) {
        goldenOccupancy += 1;
      }
      if (student.vision <= rules.visionThreshold && seat.row > rules.frontRowsForVision) {
        visionViolations += 1;
      }
      if (student.height <= rules.heightThreshold && seat.row > rules.frontRowsForHeight) {
        heightViolations += 1;
      }
    });

    const visionNeed = students.filter((student) => student.vision <= rules.visionThreshold).length || 1;
    const heightNeed = students.filter((student) => student.height <= rules.heightThreshold).length || 1;

    // 积分统计
    const totalPoints = students.reduce((sum, s) => sum + s.points, 0);
    const avgPoints = students.length > 0 ? Math.round(totalPoints / students.length) : 0;
    const allRankedStudents = [...students].sort((a, b) => b.points - a.points);
    const topStudents = allRankedStudents.slice(0, 5);
    
    // 兑换统计
    const activeRedeemsCount = rewardRedeems.filter(r => r.status === 'active').length;

    return {
      metrics: [
        {
          label: '视力规则达成率',
          value: `${Math.round(((visionNeed - visionViolations) / visionNeed) * 100)}%`,
          status: visionViolations === 0 ? 'success' : 'exception',
          detail: `${visionNeed - visionViolations}/${visionNeed} 名近视生位于前排`,
          percent: Math.max(0, ((visionNeed - visionViolations) / visionNeed) * 100),
        },
        {
          label: '身高规则达成率',
          value: `${Math.round(((heightNeed - heightViolations) / heightNeed) * 100)}%`,
          status: heightViolations === 0 ? 'success' : 'active',
          detail: `${heightNeed - heightViolations}/${heightNeed} 名身高受限生位于前排`,
          percent: Math.max(0, ((heightNeed - heightViolations) / heightNeed) * 100),
        },
        {
          label: '黄金座位占用',
          value: `${goldenOccupancy}/${goldenSeats}`,
          status: 'normal',
          detail: `黄金区域定义为前 ${goldenRows} 排`,
          percent: Math.round((goldenOccupancy / goldenSeats) * 100),
        },
        {
          label: '座位使用率',
          value: `${Math.round((occupiedSeats / Math.max(1, classroom.cells.length)) * 100)}%`,
          status: 'success',
          detail: `${occupiedSeats} / ${classroom.cells.length} 个座位已分配`,
          percent: Math.round((occupiedSeats / Math.max(1, classroom.cells.length)) * 100),
        },
      ] satisfies Array<InsightMetric & { percent: number; detail: string }>,
      focusList: [
        visionViolations > 0
          ? `⚠️ 有 ${visionViolations} 名近视学生未在前 ${rules.frontRowsForVision} 排`
          : '✅ 近视学生前排规则已满足',
        heightViolations > 0
          ? `⚠️ 有 ${heightViolations} 名矮个学生未在前 ${rules.frontRowsForHeight} 排`
          : '✅ 身高规则已满足',
        goldenOccupancy / Math.max(1, students.length) < 0.4
          ? '建议轮换黄金区域，多给表现普通学生体验机会'
          : '黄金区域分布较均衡，可按计划轮换',
      ],
      pointsStats: {
        totalPoints,
        avgPoints,
        topStudents,
        allRankedStudents, // 新增：所有学生排名
        activeRedeemsCount,
      },
    };
  }, [assignments, classroom, students, rules, pointsLogs, rewardRedeems]);

  return (
    <div className="p-2">
      <div className="mb-4 text-xs text-slate-500 flex items-center gap-1">
        <InfoCircleOutlined />
        统计依据当前班级规则和排座结果实时刷新
      </div>

      <div className="space-y-4">
        {data.metrics.map((metric) => (
          <div key={metric.label}>
            <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
              <span>{metric.label}</span>
              <Tag color={metric.status === 'exception' ? 'red' : 'blue'}>{metric.value}</Tag>
            </div>
            <Progress
              percent={Number.isFinite(metric.percent) ? Math.max(0, Math.min(metric.percent, 100)) : 0}
              size="small"
              status={metric.status}
            />
            <p className="text-xs text-slate-400 mt-1">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-500 mb-2">重点提醒</p>
        <div className="space-y-2 text-xs text-slate-600">
          {data.focusList.map((item) => (
            <div key={item} className="rounded-md bg-slate-50 border border-slate-100 px-2 py-1.5">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-semibold text-slate-900">积分激励</p>
          <Tooltip title="基于当前积分数据统计">
            <TrophyOutlined className="text-amber-400" />
          </Tooltip>
        </div>

        <Row gutter={8} className="mb-4">
          <Col span={8}>
            <Statistic 
              title="总积分" 
              value={data.pointsStats.totalPoints} 
              valueStyle={{ fontSize: '16px', color: '#1890ff' }} 
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="人均" 
              value={data.pointsStats.avgPoints} 
              valueStyle={{ fontSize: '16px', color: '#1890ff' }} 
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="生效奖励" 
              value={data.pointsStats.activeRedeemsCount} 
              valueStyle={{ fontSize: '16px', color: '#52c41a' }} 
            />
          </Col>
        </Row>

        <p className="text-xs font-semibold text-slate-500 mb-2">积分排行榜</p>
        <div className="max-h-60 overflow-y-auto pr-1">
          <List
            size="small"
            dataSource={data.pointsStats.allRankedStudents}
            renderItem={(student, index) => (
              <List.Item className="py-1 px-0 border-b-0">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className={`w-4 text-center font-bold ${
                      index === 0 ? 'text-amber-500' : 
                      index === 1 ? 'text-slate-400' : 
                      index === 2 ? 'text-orange-700' : 'text-slate-400'
                    }`}>
                      {index + 1}
                    </span>
                    <Avatar size="small" style={{ backgroundColor: index < 3 ? '#fde3cf' : '#f0f0f0', color: '#333' }}>
                      {student.name[0]}
                    </Avatar>
                    <span className="text-sm text-slate-700">{student.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <StarOutlined />
                    <span className="font-bold">{student.points}</span>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default InsightPanel;

