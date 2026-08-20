import { useMemo } from 'react';
import { Modal, Statistic, Row, Col, Avatar, List } from 'antd';
import { StarOutlined, TrophyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useClassStore } from '../../store/useClassStore';

type Props = {
  open: boolean;
  onClose: () => void;
};

const PointsRankModal = ({ open, onClose }: Props) => {
  const students = useClassStore((state) => state.students);
  const rewardRedeems = useClassStore((state) => state.rewardRedeems);

  const data = useMemo(() => {
    // 积分统计
    const totalPoints = students.reduce((sum, s) => sum + s.points, 0);
    const avgPoints = students.length > 0 ? Math.round(totalPoints / students.length) : 0;
    const allRankedStudents = [...students].sort((a, b) => b.points - a.points);
    
    // 兑换统计
    const activeRedeemsCount = rewardRedeems.filter(r => r.status === 'active').length;

    return {
      totalPoints,
      avgPoints,
      allRankedStudents,
      activeRedeemsCount,
    };
  }, [students, rewardRedeems]);

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <TrophyOutlined className="text-amber-400" />
          <span>积分排行榜</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
    >
      <div className="mb-6">
        <div className="mb-4 flex items-center gap-1 text-xs text-slate-500">
          <InfoCircleOutlined />
          统计全班学生的积分数据与排名
        </div>

        <Row gutter={16} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
          <Col span={8}>
            <Statistic 
              title="总积分" 
              value={data.totalPoints} 
              valueStyle={{ fontSize: '20px', color: '#1890ff', fontWeight: 'bold' }} 
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="人均积分" 
              value={data.avgPoints} 
              valueStyle={{ fontSize: '20px', color: '#1890ff', fontWeight: 'bold' }} 
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="生效奖励" 
              value={data.activeRedeemsCount} 
              valueStyle={{ fontSize: '20px', color: '#52c41a', fontWeight: 'bold' }} 
            />
          </Col>
        </Row>
      </div>

      <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        <List
          dataSource={data.allRankedStudents}
          renderItem={(student, index) => (
            <List.Item className="py-3 px-2 border-b border-slate-100 hover:bg-slate-50 transition-colors rounded-lg mb-1">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                    index === 0 ? 'bg-amber-100 text-amber-600' : 
                    index === 1 ? 'bg-slate-200 text-slate-600' : 
                    index === 2 ? 'bg-orange-100 text-orange-600' : 'text-slate-400 bg-slate-50'
                  }`}>
                    {index + 1}
                  </div>
                  <Avatar 
                    style={{ 
                      backgroundColor: student.gender === 'male' ? '#1890ff' : '#eb2f96',
                      fontSize: '14px'
                    }}
                  >
                    {student.name[0]}
                  </Avatar>
                  <div>
                    <div className="font-medium text-slate-800">{student.name}</div>
                    <div className="text-xs text-slate-400">
                      {student.gender === 'male' ? '男' : '女'} · {student.studentNumber || '无学号'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <StarOutlined className="text-amber-400" />
                  <span className="font-bold text-lg text-slate-700">{student.points}</span>
                </div>
              </div>
            </List.Item>
          )}
        />
      </div>
    </Modal>
  );
};

export default PointsRankModal;
