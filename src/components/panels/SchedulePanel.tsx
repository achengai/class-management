import { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined } from '@ant-design/icons';
import { useClassStore } from '../../store/useClassStore';
import type { Course, ClassPeriod } from '../../types/models';

const EMPTY_ARRAY: any[] = [];
const DEFAULT_SCHEDULE = { periods: [] };

const SchedulePanel = () => {
  const [msgApi, contextHolder] = message.useMessage();
  const currentClass = useClassStore((state) => state.classList.find(c => c.id === state.classId));
  const courses = currentClass?.courses || EMPTY_ARRAY;
  const schedule = currentClass?.schedule || DEFAULT_SCHEDULE;
  const updateSchedule = useClassStore((state) => state.updateSchedule);
  const addCourse = useClassStore((state) => state.addCourse);
  const updateCourse = useClassStore((state) => state.updateCourse);
  const deleteCourse = useClassStore((state) => state.deleteCourse);
  
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form] = Form.useForm();
  const [draggedCourseId, setDraggedCourseId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ day: number; period: number } | null>(null);

  const weekDays = ['周一', '周二', '周三', '周四', '周五'];
  const periods = Array.from({ length: 8 }, (_, i) => i + 1);

  // 获取指定位置的课程
  const getPeriod = (dayOfWeek: number, periodIndex: number): ClassPeriod | undefined => {
    return schedule?.periods.find(
      p => p.dayOfWeek === dayOfWeek && p.periodIndex === periodIndex
    );
  };

  // 设置课程
  const handleSetPeriod = (dayOfWeek: number, periodIndex: number, courseId: string) => {
    if (!schedule) return;
    
    const existingPeriod = getPeriod(dayOfWeek, periodIndex);
    
    let newPeriods = [...schedule.periods];
    
    if (existingPeriod) {
      // 更新现有节次
      newPeriods = newPeriods.map(p =>
        p.id === existingPeriod.id ? { ...p, courseId } : p
      );
    } else {
      // 添加新节次
      newPeriods.push({
        id: crypto.randomUUID(),
        dayOfWeek,
        periodIndex,
        courseId,
      });
    }
    
    updateSchedule({ ...schedule, periods: newPeriods });
  };

  // 清除课程
  const handleClearPeriod = (dayOfWeek: number, periodIndex: number) => {
    if (!schedule) return;
    
    const newPeriods = schedule.periods.filter(
      p => !(p.dayOfWeek === dayOfWeek && p.periodIndex === periodIndex)
    );
    
    updateSchedule({ ...schedule, periods: newPeriods });
  };

  // 打开课程编辑对话框
  const handleEditCourse = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      form.setFieldsValue({
        name: course.name,
        teacher: course.teacher,
        color: course.color,
      });
    } else {
      setEditingCourse(null);
      form.resetFields();
    }
    setCourseModalOpen(true);
  };

  // 保存课程
  const handleSaveCourse = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingCourse) {
        updateCourse(editingCourse.id, values);
        msgApi.success('课程已更新');
      } else {
        addCourse(values.name, values.teacher, values.color);
        msgApi.success('课程已添加');
      }
      
      setCourseModalOpen(false);
      form.resetFields();
      setEditingCourse(null);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 删除课程
  const handleDeleteCourse = (courseId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除课程后，课表中该课程的所有排课将被清除。确定要删除吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteCourse(courseId);
        msgApi.success('课程已删除');
      },
    });
  };

  // 拖动开始
  const handleDragStart = (courseId: string) => {
    setDraggedCourseId(courseId);
  };

  // 拖动结束
  const handleDragEnd = () => {
    setDraggedCourseId(null);
    setDropTarget(null);
  };

  // 拖动经过
  const handleDragOver = (e: React.DragEvent, day: number, period: number) => {
    e.preventDefault();
    setDropTarget({ day, period });
  };

  // 离开拖动区域
  const handleDragLeave = () => {
    setDropTarget(null);
  };

  // 放置
  const handleDrop = (e: React.DragEvent, day: number, period: number) => {
    e.preventDefault();
    if (draggedCourseId) {
      handleSetPeriod(day, period, draggedCourseId);
      msgApi.success('课程已设置');
    }
    setDraggedCourseId(null);
    setDropTarget(null);
  };

  // 构建课表数据
  const columns = [
    {
      title: '节次',
      dataIndex: 'period',
      key: 'period',
      width: 80,
      fixed: 'left' as const,
    },
    ...weekDays.map((day, index) => ({
      title: day,
      dataIndex: `day${index + 1}`,
      key: `day${index + 1}`,
      width: 150,
      render: (_: any, record: any) => {
        const period = getPeriod(index + 1, record.periodIndex);
        const isDropTarget = dropTarget?.day === index + 1 && dropTarget?.period === record.periodIndex;
        
        return (
          <div
            onDragOver={(e) => handleDragOver(e, index + 1, record.periodIndex)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index + 1, record.periodIndex)}
            style={{
              padding: '4px',
              backgroundColor: isDropTarget ? '#e6f7ff' : 'transparent',
              border: isDropTarget ? '2px dashed #1890ff' : '2px solid transparent',
              borderRadius: '4px',
              transition: 'all 0.2s',
            }}
          >
            <Select
              placeholder="选择课程"
              value={period?.courseId}
              onChange={(value) => {
                if (value) {
                  handleSetPeriod(index + 1, record.periodIndex, value);
                } else {
                  handleClearPeriod(index + 1, record.periodIndex);
                }
              }}
              allowClear
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) => {
                const course = courses.find(c => c.id === option?.value);
                if (!course) return false;
                const searchText = input.toLowerCase();
                return (
                  course.name.toLowerCase().includes(searchText) ||
                  (course.teacher || '').toLowerCase().includes(searchText)
                );
              }}
            >
              {courses.map(c => (
                <Select.Option key={c.id} value={c.id}>
                  <Tag color={c.color || 'blue'} style={{ marginRight: 4 }}>
                    {c.name}
                  </Tag>
                  {c.teacher && <span className="text-xs text-gray-500">({c.teacher})</span>}
                </Select.Option>
              ))}
            </Select>
          </div>
        );
      },
    })),
  ];

  const dataSource = periods.map(p => ({
    key: p,
    period: `第${p}节`,
    periodIndex: p,
  }));

  return (
    <Card
      title={
        <Space>
          <BookOutlined />
          <span>课程表管理</span>
        </Space>
      }
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleEditCourse()}
        >
          新增课程
        </Button>
      }
    >
      {contextHolder}
      
      {/* 课程列表 */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold mb-2">📚 课程列表（拖动到课表安排课程）</h4>
        <Space wrap>
          {courses.map(course => (
            <Tag
              key={course.id}
              color={course.color || 'blue'}
              style={{ 
                padding: '4px 8px', 
                cursor: 'move',
                userSelect: 'none',
              }}
              draggable
              onDragStart={() => handleDragStart(course.id)}
              onDragEnd={handleDragEnd}
            >
              <Space size={4}>
                <span>{course.name}</span>
                {course.teacher && (
                  <span className="text-xs opacity-75">({course.teacher})</span>
                )}
                <EditOutlined
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditCourse(course);
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <DeleteOutlined
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCourse(course.id);
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </Space>
            </Tag>
          ))}
        </Space>
      </div>

      {/* 课表 */}
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
        bordered
        scroll={{ x: 'max-content' }}
      />

      {/* 课程编辑对话框 */}
      <Modal
        title={editingCourse ? '编辑课程' : '新增课程'}
        open={courseModalOpen}
        onOk={handleSaveCourse}
        onCancel={() => {
          setCourseModalOpen(false);
          form.resetFields();
          setEditingCourse(null);
        }}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="课程名称"
            name="name"
            rules={[{ required: true, message: '请输入课程名称' }]}
          >
            <Input placeholder="如：语文、数学、英语" />
          </Form.Item>
          
          <Form.Item
            label="任课老师"
            name="teacher"
          >
            <Input placeholder="如：张老师" />
          </Form.Item>
          
          <Form.Item
            label="课程颜色"
            name="color"
          >
            <Select placeholder="选择颜色">
              <Select.Option value="blue">蓝色</Select.Option>
              <Select.Option value="green">绿色</Select.Option>
              <Select.Option value="orange">橙色</Select.Option>
              <Select.Option value="red">红色</Select.Option>
              <Select.Option value="purple">紫色</Select.Option>
              <Select.Option value="cyan">青色</Select.Option>
              <Select.Option value="magenta">品红</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SchedulePanel;
