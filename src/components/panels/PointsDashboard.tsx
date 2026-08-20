import { useState, useMemo } from 'react';
import { Button, Space, Card, Statistic, Table, message, Select, Tabs, Input, Tag } from 'antd';
import { DownloadOutlined, StarOutlined, GiftOutlined, HistoryOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { useClassStore } from '../../store/useClassStore';
import { exportPointsLogsWorkbook, exportStudentPointsSummary } from '../../services/pointsExporter';
import BatchPointsModal from '../panels/BatchPointsModal';

/**
 * 积分管理仪表盘
 * 提供全班积分数据的概览、查询和管理功能
 */
const PointsDashboard = () => {
  const [msgApi, contextHolder] = message.useMessage();
  const students = useClassStore((state) => state.students);
  const pointsLogs = useClassStore((state) => state.pointsLogs);
  const rewards = useClassStore((state) => state.rewards);
  const rewardRedeems = useClassStore((state) => state.rewardRedeems);
  
  // 状态
  const [activeTab, setActiveTab] = useState<'summary' | 'logs' | 'redeems'>('summary');
  const [searchText, setSearchText] = useState('');
  const [filterStudentId, setFilterStudentId] = useState<string | undefined>(undefined);
  const [batchPointsOpen, setBatchPointsOpen] = useState(false);

  // 过滤后的流水记录
  const filteredLogs = useMemo(() => {
    let logs = [...pointsLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (filterStudentId) {
      logs = logs.filter(log => log.studentId === filterStudentId);
    }
    
    if (searchText) {
      logs = logs.filter(log => 
        log.reasonDetail.includes(searchText) || 
        log.operator.includes(searchText)
      );
    }
    
    return logs;
  }, [pointsLogs, filterStudentId, searchText]);

  // 过滤后的兑换记录
  const filteredRedeems = useMemo(() => {
    let redeems = [...rewardRedeems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (filterStudentId) {
      redeems = redeems.filter(r => r.studentId === filterStudentId);
    }
    
    return redeems;
  }, [rewardRedeems, filterStudentId]);

  // 学生积分汇总数据
  const studentsSummary = useMemo(() => {
    return students.map(student => {
      const logs = pointsLogs.filter(log => log.studentId === student.id);
      const totalIncome = logs.filter(l => l.delta > 0).reduce((sum, l) => sum + l.delta, 0);
      const totalExpense = logs.filter(l => l.delta < 0).reduce((sum, l) => sum + Math.abs(l.delta), 0);
      const logCount = logs.length;
      const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
      
      return {
        id: student.id,
        name: student.name,
        gender: student.gender,
        currentPoints: student.points,
        totalIncome,
        totalExpense,
        logCount,
        lastOperationTime: lastLog?.createdAt,
      };
    }).sort((a, b) => b.currentPoints - a.currentPoints); // 按当前积分降序排列
  }, [students, pointsLogs]);

  // 导出积分流水
  const handleExportLogs = async () => {
    try {
      await exportPointsLogsWorkbook(filteredLogs, students);
      msgApi.success('积分流水已导出');
    } catch (error) {
      console.error('导出失败:', error);
      msgApi.error('导出失败');
    }
  };

  // 导出积分汇总
  const handleExportSummary = async () => {
    try {
      await exportStudentPointsSummary(students, pointsLogs);
      msgApi.success('学生积分汇总已导出');
    } catch (error) {
      console.error('导出失败:', error);
      msgApi.error('导出失败');
    }
  };

  // 流水表格列定义
  const logsColumns = [
    {
      title: '学生',
      dataIndex: 'studentId',
      key: 'studentId',
      render: (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        return student ? (
          <Space>
            <span>{student.name}</span>
            <span style={{ color: '#999', fontSize: '12px' }}>
              ({student.gender === 'male' ? '男' : '女'})
            </span>
          </Space>
        ) : '未知';
      },
    },
    {
      title: '积分变化',
      dataIndex: 'delta',
      key: 'delta',
      render: (delta: number) => (
        <span style={{ color: delta > 0 ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
          {delta > 0 ? '+' : ''}{delta}
        </span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'reasonType',
      key: 'reasonType',
      render: (type: string) => {
        const map: Record<string, string> = {
          attendance: '出勤',
          discipline: '纪律',
          performance: '表现',
          homework: '作业',
          activity: '活动',
          manual: '调整',
          redeem: '兑换',
          other: '其他'
        };
        return <Tag>{map[type] || type}</Tag>;
      }
    },
    {
      title: '原因',
      dataIndex: 'reasonDetail',
      key: 'reasonDetail',
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
  ];

  // 学生积分汇总表格列定义
  const summaryColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left' as const,
      width: 120,
      render: (name: string, record: any) => (
        <Space>
          <span style={{ fontWeight: 'bold' }}>{name}</span>
          <span style={{ color: '#999', fontSize: '12px' }}>({record.gender === 'male' ? '男' : '女'})</span>
        </Space>
      ),
    },
    {
      title: '当前积分',
      dataIndex: 'currentPoints',
      key: 'currentPoints',
      width: 120,
      sorter: (a: any, b: any) => a.currentPoints - b.currentPoints,
      render: (points: number) => (
        <span style={{ color: '#1890ff', fontWeight: 'bold', fontSize: '16px' }}>
          <StarOutlined style={{ color: '#faad14' }} /> {points}
        </span>
      ),
    },
    {
      title: '累计获得',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      width: 100,
      sorter: (a: any, b: any) => a.totalIncome - b.totalIncome,
      render: (income: number) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>+{income}</span>
      ),
    },
    {
      title: '累计支出',
      dataIndex: 'totalExpense',
      key: 'totalExpense',
      width: 100,
      sorter: (a: any, b: any) => a.totalExpense - b.totalExpense,
      render: (expense: number) => (
        <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>-{expense}</span>
      ),
    },
    {
      title: '操作次数',
      dataIndex: 'logCount',
      key: 'logCount',
      width: 100,
      sorter: (a: any, b: any) => a.logCount - b.logCount,
      render: (count: number) => <Tag color="blue">{count} 次</Tag>,
    },
    {
      title: '最后操作时间',
      dataIndex: 'lastOperationTime',
      key: 'lastOperationTime',
      width: 180,
      render: (time: string | undefined) => 
        time ? new Date(time).toLocaleString('zh-CN') : <span style={{ color: '#ccc' }}>无记录</span>,
    },
  ];

  // 兑换记录表格列定义
  const redeemsColumns = [
    {
      title: '学生',
      dataIndex: 'studentId',
      key: 'studentId',
      render: (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        return student?.name || '未知';
      },
    },
    {
      title: '奖励',
      dataIndex: 'rewardId',
      key: 'rewardId',
      render: (rewardId: string) => {
        const reward = rewards.find(r => r.id === rewardId);
        return reward ? (
          <Space>
            <GiftOutlined />
            {reward.name}
          </Space>
        ) : '未知';
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          pending: { text: '待生效', color: '#faad14' },
          active: { text: '生效中', color: '#52c41a' },
          used: { text: '已使用', color: '#1890ff' },
          expired: { text: '已过期', color: '#999' },
          cancelled: { text: '已取消', color: '#ff4d4f' },
        };
        const info = statusMap[status] || { text: status, color: '#000' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '兑换时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '有效期至',
      dataIndex: 'effectiveTo',
      key: 'effectiveTo',
      render: (time: string) => new Date(time).toLocaleDateString('zh-CN'),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {contextHolder}
      
      {/* 顶部统计 */}
      <div style={{ marginBottom: '24px' }}>
        <Space size="large" direction="vertical" style={{ width: '100%' }}>
          <Card>
            <Space size="large" wrap split={<div className="w-[1px] h-10 bg-slate-200" />}>
              <Statistic 
                title="总积分池" 
                value={students.reduce((sum, s) => sum + s.points, 0)} 
                prefix={<StarOutlined style={{ color: '#faad14' }} />}
              />
              <Statistic 
                title="累计流水" 
                value={pointsLogs.length} 
                suffix="条" 
              />
              <Statistic 
                title="已兑换奖励" 
                value={rewardRedeems.length} 
                suffix="次" 
              />
              <Statistic 
                title="今日变动" 
                value={
                  pointsLogs.filter(l => 
                    new Date(l.createdAt).toDateString() === new Date().toDateString()
                  ).length
                }
                suffix="次"
                valueStyle={{ color: '#1890ff' }}
              />
            </Space>
          </Card>
        </Space>
      </div>

      {/* 主要内容区 */}
      <Card
        title="积分数据管理"
        extra={
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExportSummary}>
              导出汇总报表
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportLogs}>
              导出流水记录
            </Button>
            <Button type="primary" icon={<StarOutlined />} onClick={() => setBatchPointsOpen(true)}>
              批量加减分
            </Button>
          </Space>
        }
      >
        {/* 筛选工具栏 */}
        <div className="mb-4 flex gap-4 items-center flex-wrap">
          <Select
            style={{ width: 200 }}
            placeholder="筛选学生"
            allowClear
            showSearch
            optionFilterProp="label"
            value={filterStudentId}
            onChange={setFilterStudentId}
            options={students.map(s => ({
              label: `${s.name} (${s.gender === 'male' ? '男' : '女'})`,
              value: s.id,
            }))}
          />
          
          {activeTab === 'logs' && (
            <Input
              placeholder="搜索原因或操作人"
              prefix={<SearchOutlined style={{ color: '#ccc' }} />}
              style={{ width: 250 }}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
            />
          )}
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'summary' | 'logs' | 'redeems')}
          items={[
            {
              key: 'summary',
              label: (
                <span>
                  <TeamOutlined />
                  学生积分明细
                </span>
              ),
              children: (
                <Table 
                  dataSource={studentsSummary} 
                  columns={summaryColumns}
                  rowKey="id"
                  pagination={{ 
                    pageSize: 15,
                    showTotal: (total) => `共 ${total} 位学生`,
                    showSizeChanger: true
                  }}
                  scroll={{ x: 'max-content' }}
                />
              ),
            },
            {
              key: 'logs',
              label: (
                <span>
                  <HistoryOutlined />
                  积分流水明细
                </span>
              ),
              children: (
                <Table 
                  dataSource={filteredLogs} 
                  columns={logsColumns}
                  rowKey="id"
                  pagination={{ 
                    pageSize: 10,
                    showTotal: (total) => `共 ${total} 条记录`,
                    showSizeChanger: true
                  }}
                />
              ),
            },
            {
              key: 'redeems',
              label: (
                <span>
                  <GiftOutlined />
                  兑换记录
                </span>
              ),
              children: (
                <Table 
                  dataSource={filteredRedeems} 
                  columns={redeemsColumns}
                  rowKey="id"
                  pagination={{ 
                    pageSize: 10,
                    showTotal: (total) => `共 ${total} 条记录`,
                    showSizeChanger: true
                  }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 批量积分弹窗 */}
      <BatchPointsModal
        open={batchPointsOpen}
        onClose={() => setBatchPointsOpen(false)}
      />
    </div>
  );
};

export default PointsDashboard;
