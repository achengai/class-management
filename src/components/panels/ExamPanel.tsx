import { useState, useMemo } from 'react';
import { Modal, Button, Form, Input, DatePicker, Select, Table, Statistic, Row, Col, Space, Popconfirm, InputNumber, message, Tag, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useClassStore } from '../../store/useClassStore';
import type { Exam } from '../../types/models';

const ExamPanel = () => {
  const [form] = Form.useForm();
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectDetails, setSubjectDetails] = useState<{ [key: string]: { notes?: string } }>({});

  const classId = useClassStore((state) => state.classId);
  const classList = useClassStore((state) => state.classList);
  const students = useClassStore((state) => state.students);
  const addExam = useClassStore((state) => state.addExam);
  const updateExam = useClassStore((state) => state.updateExam);
  const deleteExam = useClassStore((state) => state.deleteExam);
  const addExamScore = useClassStore((state) => state.addExamScore);
  const updateExamScore = useClassStore((state) => state.updateExamScore);
  const getExamScores = useClassStore((state) => state.getExamScores);

  const currentClass = classList.find((c) => c.id === classId);
  const exams = currentClass?.exams || [];
  const currentExam = exams.find((e) => e.id === selectedExamId);

  // 成绩数据
  const scoresData = useMemo(() => {
    if (!selectedExamId) return [];
    const scores = getExamScores(selectedExamId);
    return students.map((student) => {
      const studentScores = scores.filter((s) => s.studentId === student.id);
      const scoresBySubject: Record<string, number> = {};
      studentScores.forEach((s) => {
        scoresBySubject[s.subject] = s.score;
      });
      const total = studentScores.reduce((sum, s) => sum + s.score, 0);
      return {
        studentId: student.id,
        studentName: student.name,
        ...scoresBySubject,
        total,
      };
    });
  }, [selectedExamId, students, getExamScores]);

  // 统计数据
  const statistics = useMemo(() => {
    if (!selectedExamId || !currentExam) return null;
    
    // 过滤掉没有成绩的学生（total > 0）
    const validScores = scoresData.filter(s => s.total > 0);
    const totalScores = validScores.map((s) => s.total);
    
    if (totalScores.length === 0) {
      return { avgScore: 0, maxScore: 0, minScore: 0, passRate: 0 };
    }
    
    const avgScore = Math.round(totalScores.reduce((sum, s) => sum + s, 0) / totalScores.length);
    const maxScore = Math.max(...totalScores);
    const minScore = Math.min(...totalScores);
    
    // 及格线：所有科目总分的60%
    const totalPossibleScore = (currentExam.totalScore || 100) * currentExam.subjects.length;
    const passThreshold = totalPossibleScore * 0.6;
    const passCount = totalScores.filter((s) => s >= passThreshold).length;
    const passRate = Math.round((passCount / totalScores.length) * 100);
    
    return { avgScore, maxScore, minScore, passRate };
  }, [selectedExamId, currentExam, scoresData]);

  const handleAddExam = () => {
    setEditingExam(null);
    form.resetFields();
    setSelectedSubjects([]);
    setSubjectDetails({});
    setExamModalOpen(true);
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setSelectedSubjects(exam.subjects);
    setSubjectDetails(exam.subjectDetails || {});
    form.setFieldsValue({
      name: exam.name,
      date: dayjs(exam.date),
      subjects: exam.subjects,
      totalScore: exam.totalScore,
      description: exam.description,
    });
    setExamModalOpen(true);
  };

  const handleExamModalOk = async () => {
    try {
      const values = await form.validateFields();
      const examData = {
        name: values.name,
        date: values.date.toISOString(),
        subjects: values.subjects,
        subjectDetails,
        totalScore: values.totalScore,
        description: values.description,
      };

      if (editingExam) {
        updateExam(editingExam.id, examData);
        message.success('考试更新成功');
      } else {
        addExam(examData);
        message.success('考试添加成功');
      }
      setExamModalOpen(false);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleDeleteExam = (examId: string) => {
    deleteExam(examId);
    if (selectedExamId === examId) {
      setSelectedExamId(undefined);
    }
    message.success('考试删除成功');
  };

  const columns = [
    {
      title: '学生姓名',
      dataIndex: 'studentName',
      key: 'studentName',
      fixed: 'left' as const,
      width: 120,
    },
    ...(currentExam?.subjects || []).map((subject) => ({
      title: subject,
      dataIndex: subject,
      key: subject,
      width: 100,
      render: (score: number, record: any) => (
        <InputNumber
          min={0}
          max={currentExam?.totalScore || 100}
          value={score}
          onChange={(value) => handleScoreChange(record.studentId, subject, value || 0)}
          style={{ width: '100%' }}
        />
      ),
    })),
    {
      title: '总分',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      render: (total: number) => <span className="font-bold">{total}</span>,
    },
  ];

  const handleScoreChange = (studentId: string, subject: string, score: number) => {
    const scores = getExamScores(selectedExamId);
    const existingScore = scores.find((s) => s.studentId === studentId && s.subject === subject);

    if (existingScore) {
      updateExamScore(existingScore.id, { score });
    } else {
      addExamScore({
        examId: selectedExamId!,
        studentId,
        subject,
        score,
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 考试列表 */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">考试列表</h3>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddExam}>
            添加考试
          </Button>
        </div>

        {exams.length === 0 ? (
          <Empty
            description="暂无考试记录"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddExam}>
              添加第一个考试
            </Button>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
            <div
              key={exam.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedExamId === exam.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
              }`}
              onClick={() => setSelectedExamId(exam.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-800">{exam.name}</h4>
                <Space>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditExam(exam);
                    }}
                  />
                  <Popconfirm
                    title="确认删除"
                    description="删除考试将同时删除所有成绩记录，此操作不可撤销！"
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      handleDeleteExam(exam.id);
                    }}
                    okText="确认"
                    cancelText="取消"
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popconfirm>
                </Space>
              </div>
              <p className="text-sm text-slate-500 mb-2">{dayjs(exam.date).format('YYYY-MM-DD')}</p>
              <div className="flex flex-wrap gap-1">
                {exam.subjects.map((subject) => (
                  <Tag key={subject} color="blue">
                    {subject}
                  </Tag>
                ))}
              </div>
            </div>
            ))}
          </div>
        )}
      </div>

      {/* 成绩录入与统计 */}
      {selectedExamId && currentExam && (
        <>
          {/* 统计面板 */}
          {statistics && (
            <div className="glass-panel p-4">
              <h3 className="text-lg font-semibold mb-4">成绩统计</h3>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="平均分" value={statistics.avgScore} suffix="分" valueStyle={{ color: '#1890ff' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="最高分" value={statistics.maxScore} suffix="分" valueStyle={{ color: '#52c41a' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="最低分" value={statistics.minScore} suffix="分" valueStyle={{ color: '#faad14' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="及格率" value={statistics.passRate} suffix="%" valueStyle={{ color: '#722ed1' }} />
                </Col>
              </Row>
            </div>
          )}

          {/* 成绩表格 */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{currentExam.name} - 成绩录入</h3>
            </div>
            <Table
              dataSource={scoresData}
              columns={columns}
              rowKey="studentId"
              pagination={false}
              scroll={{ x: 'max-content' }}
              size="middle"
            />
          </div>
        </>
      )}

      {/* 添加/编辑考试模态框 */}
      <Modal
        title={editingExam ? '编辑考试' : '添加考试'}
        open={examModalOpen}
        onOk={handleExamModalOk}
        onCancel={() => setExamModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="考试名称" name="name" rules={[{ required: true, message: '请输入考试名称' }]}>
            <Input placeholder="如：期中考试、第一次月考" />
          </Form.Item>
          <Form.Item label="考试日期" name="date" rules={[{ required: true, message: '请选择考试日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="考试科目" name="subjects" rules={[{ required: true, message: '请选择考试科目' }]}>
            <Select 
              mode="tags" 
              placeholder="输入科目名称，如：语文、数学"
              onChange={(values: string[]) => {
                setSelectedSubjects(values);
                // 清理已移除科目的备注
                const newDetails: { [key: string]: { notes?: string } } = {};
                values.forEach((subject: string) => {
                  if (subjectDetails[subject]) {
                    newDetails[subject] = subjectDetails[subject];
                  }
                });
                setSubjectDetails(newDetails);
              }}
            >
              <Select.Option value="语文">语文</Select.Option>
              <Select.Option value="数学">数学</Select.Option>
              <Select.Option value="英语">英语</Select.Option>
              <Select.Option value="物理">物理</Select.Option>
              <Select.Option value="化学">化学</Select.Option>
              <Select.Option value="生物">生物</Select.Option>
            </Select>
          </Form.Item>
          
          {/* 科目备注 */}
          {selectedSubjects.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium mb-2 text-slate-700">科目备注（可选）</div>
              <div className="space-y-2">
                {selectedSubjects.map((subject) => (
                  <div key={subject} className="flex items-start gap-2">
                    <Tag color="blue" className="flex-shrink-0 mt-1">
                      {subject}
                    </Tag>
                    <Input
                      placeholder={`${subject}科目备注`}
                      value={subjectDetails[subject]?.notes || ''}
                      onChange={(e) => {
                        setSubjectDetails({
                          ...subjectDetails,
                          [subject]: { notes: e.target.value },
                        });
                      }}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <Form.Item label="满分" name="totalScore">
            <InputNumber min={1} max={1000} placeholder="默认100" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="说明" name="description">
            <Input.TextArea rows={3} placeholder="考试说明（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExamPanel;
