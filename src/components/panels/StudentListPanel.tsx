import { useState } from 'react';
import { Table, Input, Button, Space, Tag, Drawer, Avatar, Statistic, Card, message } from 'antd';
import { 
  SearchOutlined, 
  UserAddOutlined, 
  ImportOutlined, 
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  ManOutlined,
  WomanOutlined,
  StarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useClassStore } from '../../store/useClassStore';
import type { Student } from '../../types/models';
import AddStudentModal from './AddStudentModal';
import BatchPointsModal from './BatchPointsModal';
import BatchEditStudentModal from './BatchEditStudentModal';

const StudentListPanel = () => {
  const [msgApi, contextHolder] = message.useMessage();
  const students = useClassStore((state) => state.students);
  const deleteStudent = useClassStore((state) => state.deleteStudent);
  const summary = useClassStore((state) => state.summary);
  
  const [searchText, setSearchText] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [batchPointsOpen, setBatchPointsOpen] = useState(false);
  const [batchSelectMode, setBatchSelectMode] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [lastClickedIndex, setLastClickedIndex] = useState<number>(-1);
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [isDoubleClicking, setIsDoubleClicking] = useState(false);

  // 筛选学生
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchText.toLowerCase()) ||
    student.id.toLowerCase().includes(searchText.toLowerCase()) ||
    (student.studentNumber && student.studentNumber.toLowerCase().includes(searchText.toLowerCase()))
  );

  // 性别统计
  const genderStats = {
    male: students.filter(s => s.gender === 'male').length,
    female: students.filter(s => s.gender === 'female').length,
  };

  // 成绩统计
  const scoreStats = {
    excellent: students.filter(s => s.score === 'A' || (typeof s.score === 'number' && s.score >= 90)).length,
    good: students.filter(s => s.score === 'B' || (typeof s.score === 'number' && s.score >= 80 && s.score < 90)).length,
    average: students.filter(s => ['C', 'D'].includes(s.score as string) || (typeof s.score === 'number' && s.score >= 60 && s.score < 80)).length,
    poor: students.filter(s => s.score === 'E' || (typeof s.score === 'number' && s.score < 60)).length,
  };

  // 查看详情
  const handleViewDetail = (student: Student) => {
    setSelectedStudent(student);
    setDetailDrawerOpen(true);
  };

  // 编辑学生
  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setEditModalOpen(true);
  };

  // 删除学生
  const handleDelete = (studentId: string, studentName: string) => {
    if (window.confirm(`确定要删除学生 ${studentName} 吗？`)) {
      deleteStudent(studentId);
      msgApi.success('学生已删除');
    }
  };

  // 表格列定义
  const columns: ColumnsType<Student> = [
    {
      title: '序号',
      key: 'index',
      width: 50,
      align: 'center',
      render: (_: any, __: Student, index: number) => index + 1,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 90,
      fixed: 'left',
      render: (name: string, record: Student) => (
        <Button 
          type="link" 
          onClick={() => handleViewDetail(record)}
          style={{ padding: 0 }}
        >
          {name}
        </Button>
      ),
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 70,
      align: 'center',
      render: (gender: string) => (
        gender === 'male' ? 
          <Tag icon={<ManOutlined />} color="blue">男</Tag> : 
          <Tag icon={<WomanOutlined />} color="pink">女</Tag>
      ),
    },
    {
      title: '学号',
      dataIndex: 'studentNumber',
      key: 'studentNumber',
      width: 100,
      render: (studentNumber: string) => studentNumber || '-',
    },
    {
      title: '身高(cm)',
      dataIndex: 'height',
      key: 'height',
      width: 85,
      align: 'center',
      sorter: (a, b) => a.height - b.height,
    },
    {
      title: '视力',
      dataIndex: 'vision',
      key: 'vision',
      width: 70,
      align: 'center',
      render: (vision: number) => {
        const color = vision >= 5.0 ? 'green' : vision >= 4.5 ? 'orange' : 'red';
        return <Tag color={color}>{vision.toFixed(1)}</Tag>;
      },
    },
    {
      title: '综合成绩',
      dataIndex: 'score',
      key: 'score',
      width: 90,
      align: 'center',
      sorter: (a: Student, b: Student) => {
        // 等级映射
        const gradeMap: Record<string, number> = { 'A': 95, 'B': 85, 'C': 75, 'D': 65, 'E': 50 };
        const aScore = typeof a.score === 'string' ? (gradeMap[a.score] || 0) : a.score;
        const bScore = typeof b.score === 'string' ? (gradeMap[b.score] || 0) : b.score;
        return aScore - bScore;
      },
      render: (score: string | number) => {
        let color = 'default';
        let displayText = score;
        
        if (typeof score === 'string') {
          // 等级制
          if (score === 'A') color = 'success';
          else if (score === 'B') color = 'processing';
          else if (score === 'C') color = 'warning';
          else if (score === 'D') color = 'default';
          else if (score === 'E') color = 'error';
        } else {
          // 分数制
          if (score >= 90) color = 'success';
          else if (score >= 80) color = 'processing';
          else if (score >= 60) color = 'warning';
          else color = 'error';
        }
        
        return <Tag color={color}>{displayText}</Tag>;
      },
    },
    {
      title: '学科成绩',
      key: 'subjects',
      width: 150,
      render: (_: any, record: Student) => (
        <Space size={2} wrap>
          {record.chineseScore && <Tag color="blue" style={{ fontSize: '12px', padding: '0 6px' }}>语 {record.chineseScore}</Tag>}
          {record.mathScore && <Tag color="green" style={{ fontSize: '12px', padding: '0 6px' }}>数 {record.mathScore}</Tag>}
          {record.englishScore && <Tag color="orange" style={{ fontSize: '12px', padding: '0 6px' }}>英 {record.englishScore}</Tag>}
        </Space>
      ),
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      width: 85,
      sorter: (a: Student, b: Student) => a.points - b.points,
      render: (points: number) => (
        <Space size={4}>
          <StarOutlined style={{ color: '#faad14' }} />
          <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{points}</span>
        </Space>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 140,
      render: (tags: string[]) => (
        <Space size={2} wrap>
          {tags.map(tag => (
            <Tag key={tag} color="cyan" style={{ margin: '2px' }}>
              {tag}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 100,
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      fixed: 'right',
      align: 'center',
      render: (_: any, record: Student) => (
        <Space size="small">
          <Button 
            type="text" 
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            type="text" 
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id, record.name)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="flex h-full">
      {contextHolder}
      
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* 顶部操作栏 */}
        <div className="bg-white border-b p-4">
          <div className="flex justify-between items-center">
            <Space>
              <Button 
                type="primary" 
                icon={<UserAddOutlined />}
                onClick={() => {
                  setEditingStudent(null);
                  setEditModalOpen(true);
                }}
              >
                添加学生
              </Button>
              <Button icon={<ImportOutlined />}>
                导入数据
              </Button>
              <Button icon={<ExportOutlined />}>
                导出Excel
              </Button>
              <Button 
                icon={<StarOutlined />}
                onClick={() => setBatchPointsOpen(true)}
              >
                批量积分
              </Button>
              <Button 
                type={batchSelectMode ? 'primary' : 'default'}
                onClick={() => {
                  setBatchSelectMode(!batchSelectMode);
                  if (batchSelectMode) {
                    setSelectedRowKeys([]);
                  }
                }}
              >
                {batchSelectMode ? '退出批量选择' : '批量选择'}
              </Button>
            </Space>
            
            <Input
              placeholder="搜索学生姓名或学号..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
          </div>
        </div>

        {/* 班级信息统计 */}
        <div className="bg-white border-b p-4">
          <div className="grid grid-cols-6 gap-4">
            <Card size="small" bordered={false} style={{ backgroundColor: '#f0f5ff' }}>
              <Statistic 
                title="班级名称" 
                value={summary.className}
                valueStyle={{ fontSize: '18px', color: '#1890ff', fontWeight: 'bold' }}
              />
            </Card>
            <Card size="small" bordered={false}>
              <Statistic 
                title="总人数" 
                value={summary.totalStudents}
                suffix="人"
                valueStyle={{ color: '#1890ff', fontSize: '20px' }}
              />
            </Card>
            <Card size="small" bordered={false}>
              <Statistic 
                title="座位数" 
                value={summary.availableSeats}
                suffix="个"
                valueStyle={{ color: '#52c41a', fontSize: '20px' }}
              />
            </Card>
            <Card size="small" bordered={false}>
              <Statistic 
                title="男生" 
                value={genderStats.male}
                suffix="人"
                valueStyle={{ color: '#1890ff', fontSize: '20px' }}
              />
            </Card>
            <Card size="small" bordered={false}>
              <Statistic 
                title="女生" 
                value={genderStats.female}
                suffix="人"
                valueStyle={{ color: '#eb2f96', fontSize: '20px' }}
              />
            </Card>
            <Card size="small" bordered={false}>
              <div style={{ padding: '8px 0' }}>
                <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: '15px', marginBottom: '10px', fontWeight: 500 }}>成绩分布</div>
                <Space size={6} wrap>
                  <Tag color="success" style={{ fontSize: '13px' }}>优秀 {scoreStats.excellent}</Tag>
                  <Tag color="processing" style={{ fontSize: '13px' }}>良好 {scoreStats.good}</Tag>
                  <Tag color="warning" style={{ fontSize: '13px' }}>及格 {scoreStats.average}</Tag>
                  <Tag color="error" style={{ fontSize: '13px' }}>不及格 {scoreStats.poor}</Tag>
                </Space>
              </div>
            </Card>
          </div>
        </div>

        {/* 学生列表表格 */}
        <div className="flex-1 overflow-hidden p-4">
          {batchSelectMode && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-blue-700">
                    {selectedRowKeys.length > 0 
                      ? `已选择 ${selectedRowKeys.length} 位学生` 
                      : '批量选择模式'
                    }
                  </span>
                  {selectedRowKeys.length > 0 && (
                    <>
                      <Button 
                        type="primary" 
                        size="middle"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setBatchEditOpen(true);
                        }}
                        style={{ 
                          fontWeight: 'bold',
                          fontSize: '14px',
                          height: '36px',
                          paddingLeft: '20px',
                          paddingRight: '20px'
                        }}
                      >
                        批量编辑 ({selectedRowKeys.length}人)
                      </Button>
                      <Button 
                        size="middle"
                        onClick={() => setSelectedRowKeys([])}
                      >
                        清空选择
                      </Button>
                    </>
                  )}
                </div>
                <div className="text-xs text-slate-600 text-right">
                  <div>📝 点击<strong>"批量编辑"</strong>按钮打开编辑框</div>
                  <div className="mt-1">💡 或<strong>双击/右键</strong>选中学生快速编辑</div>
                  <div className="mt-1">✨ <strong>单击</strong>=加选/取消 | <strong>Shift+点击</strong>=连选</div>
                </div>
              </div>
            </div>
          )}
          <Table
            columns={columns}
            dataSource={filteredStudents}
            rowKey="id"
            size="middle"
            scroll={{ x: 1160, y: 'calc(100vh - 380px)' }}
            pagination={{
              total: filteredStudents.length,
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 名学生`,
            }}
            rowSelection={batchSelectMode ? {
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys as string[]),
              preserveSelectedRowKeys: true,
            } : undefined}
            onRow={(record) => ({
              onClick: (e) => {
                if (!batchSelectMode) return;
                
                // 如果正在双击，忽略此onClick
                if (isDoubleClicking) {
                  return;
                }
                
                const currentIndex = filteredStudents.findIndex(s => s.id === record.id);
                
                if (e.shiftKey && lastClickedIndex >= 0) {
                  // Shift 连选
                  const start = Math.min(lastClickedIndex, currentIndex);
                  const end = Math.max(lastClickedIndex, currentIndex);
                  const rangeKeys = filteredStudents
                    .slice(start, end + 1)
                    .map(s => s.id);
                  setSelectedRowKeys([...new Set([...selectedRowKeys, ...rangeKeys])]);
                } else {
                  // 批量选择模式下，单击即可快速加选/取消选择（类似Ctrl+点击）
                  // 如果已选中则取消，如果未选中则添加
                  if (selectedRowKeys.includes(record.id)) {
                    setSelectedRowKeys(selectedRowKeys.filter(k => k !== record.id));
                  } else {
                    setSelectedRowKeys([...selectedRowKeys, record.id]);
                  }
                }
                
                setLastClickedIndex(currentIndex);
              },
              onDoubleClick: (e) => {
                e.stopPropagation();
                if (batchSelectMode) {
                  // 标记正在双击，防止onClick干扰
                  setIsDoubleClicking(true);
                  
                  // 确保双击的行在选中列表中
                  if (!selectedRowKeys.includes(record.id)) {
                    setSelectedRowKeys([record.id]);
                  }
                  
                  // 延迟打开批量编辑，确保状态更新
                  setTimeout(() => {
                    setBatchEditOpen(true);
                    // 重置双击标记
                    setTimeout(() => setIsDoubleClicking(false), 300);
                  }, 50);
                }
              },
              onContextMenu: (e) => {
                console.log('右键点击检测:', {
                  batchSelectMode,
                  recordId: record.id,
                  recordName: record.name,
                  selectedCount: selectedRowKeys.length,
                  isSelected: selectedRowKeys.includes(record.id)
                });
                
                if (!batchSelectMode) {
                  console.log('未开启批量选择模式，允许默认右键菜单');
                  return;
                }
                
                // 阻止默认右键菜单
                e.preventDefault();
                e.stopPropagation();
                
                console.log('✅ 右键菜单已阻止，准备打开批量编辑');
                
                // 确保有选中的学生
                let finalSelectedKeys = [...selectedRowKeys];
                
                // 如果右键点击的不是已选中的行，则将其添加到选择中
                if (!selectedRowKeys.includes(record.id)) {
                  console.log('➕ 添加未选中的学生:', record.name);
                  finalSelectedKeys = [...selectedRowKeys, record.id];
                  setSelectedRowKeys(finalSelectedKeys);
                }
                
                // 显示提示消息
                msgApi.info(`准备编辑 ${finalSelectedKeys.length} 位学生`);
                
                // 延迟打开批量编辑，确保状态更新后再执行
                setTimeout(() => {
                  console.log('🎯 打开批量编辑框，共', finalSelectedKeys.length, '位学生');
                  setBatchEditOpen(true);
                }, 100);
              },
              style: batchSelectMode ? { cursor: 'pointer' } : undefined,
            })}
          />
        </div>
      </div>

      {/* 批量积分弹窗 */}
      <BatchPointsModal
        open={batchPointsOpen}
        onClose={() => setBatchPointsOpen(false)}
      />

      {/* 批量编辑弹窗 */}
      <BatchEditStudentModal
        open={batchEditOpen}
        onClose={() => {
          setBatchEditOpen(false);
        }}
        selectedStudents={students.filter(s => selectedRowKeys.includes(s.id))}
      />

      {/* 学生详情抽屉 */}
      <Drawer
        title="学生详情"
        placement="right"
        width={400}
        onClose={() => setDetailDrawerOpen(false)}
        open={detailDrawerOpen}
      >
        {selectedStudent && (
          <div className="space-y-4">
            <div className="text-center">
              <Avatar size={80} style={{ backgroundColor: selectedStudent.gender === 'male' ? '#1890ff' : '#eb2f96' }}>
                {selectedStudent.name.slice(0, 1)}
              </Avatar>
              <h3 className="mt-2 text-xl font-bold">{selectedStudent.name}</h3>
              <Tag color={selectedStudent.gender === 'male' ? 'blue' : 'pink'}>
                {selectedStudent.gender === 'male' ? '男' : '女'}
              </Tag>
            </div>

            <Card size="small" title="基本信息">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">学号:</span>
                  <span>{selectedStudent.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">班级:</span>
                  <span>{selectedStudent.className || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">身高:</span>
                  <span>{selectedStudent.height} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">视力:</span>
                  <span>{selectedStudent.vision.toFixed(1)}</span>
                </div>
              </div>
            </Card>

            <Card size="small" title="学业情况">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">综合成绩:</span>
                  <Tag color={
                    typeof selectedStudent.score === 'string' 
                      ? (selectedStudent.score === 'A' ? 'success' : selectedStudent.score === 'B' ? 'processing' : selectedStudent.score === 'E' ? 'error' : 'warning')
                      : (selectedStudent.score >= 90 ? 'success' : selectedStudent.score >= 60 ? 'processing' : 'error')
                  }>
                    {selectedStudent.score}{typeof selectedStudent.score === 'number' ? '分' : ''}
                  </Tag>
                </div>
                {selectedStudent.chineseScore && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">语文:</span>
                    <span>{selectedStudent.chineseScore}</span>
                  </div>
                )}
                {selectedStudent.mathScore && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">数学:</span>
                    <span>{selectedStudent.mathScore}</span>
                  </div>
                )}
                {selectedStudent.englishScore && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">英语:</span>
                    <span>{selectedStudent.englishScore}</span>
                  </div>
                )}
              </div>
            </Card>

            {selectedStudent.tags && selectedStudent.tags.length > 0 && (
              <Card size="small" title="学生标签">
                <Space wrap>
                  {selectedStudent.tags.map(tag => (
                    <Tag key={tag} color="blue">{tag}</Tag>
                  ))}
                </Space>
              </Card>
            )}

            {selectedStudent.remarks && (
              <Card size="small" title="备注信息">
                <p className="text-sm text-gray-600">{selectedStudent.remarks}</p>
              </Card>
            )}

            {/* 自定义字段显示 */}
            {selectedStudent.flexibleData && Object.keys(selectedStudent.flexibleData).length > 0 && (
              <Card size="small" title="其他信息">
                <div className="space-y-2 text-sm">
                  {Object.entries(selectedStudent.flexibleData).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-500">{key}:</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </Drawer>

      {/* 编辑学生模态框 */}
      <AddStudentModal
        open={editModalOpen}
        editingStudent={editingStudent}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingStudent(null);
        }}
        onConfirm={() => {
          setEditModalOpen(false);
          setEditingStudent(null);
        }}
      />
    </div>
  );
};

export default StudentListPanel;
