import { useState } from 'react';
import { Form, InputNumber, Input, Select, Button, Space, Table, message } from 'antd';
import DraggableModal from '../common/DraggableModal';
import { useClassStore } from '../../store/useClassStore';
import type { PointsLog } from '../../types/models';

type Props = {
  open: boolean;
  onClose: () => void;
};

const BatchPointsModal = ({ open, onClose }: Props) => {
  const [form] = Form.useForm();
  const students = useClassStore((state) => state.students);
  const addPoints = useClassStore((state) => state.addPoints);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const reasonTypeOptions: { label: string; value: PointsLog['reasonType'] }[] = [
    { label: '出勤', value: 'attendance' },
    { label: '纪律', value: 'discipline' },
    { label: '课堂表现', value: 'performance' },
    { label: '作业', value: 'homework' },
    { label: '活动', value: 'activity' },
    { label: '手动调整', value: 'manual' },
    { label: '其他', value: 'other' },
  ];

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender: 'male' | 'female') => (gender === 'male' ? '男' : '女'),
    },
    {
      title: '当前积分',
      dataIndex: 'points',
      key: 'points',
      render: (points: number) => (
        <span style={{ color: '#1890ff', fontWeight: 'bold' }}>⭐ {points}</span>
      ),
    },
  ];

  const handleOk = () => {
    form.validateFields().then((values) => {
      const { delta, reasonType, reasonDetail, operator } = values;
      
      if (selectedStudents.length === 0) {
        message.warning('请至少选择一个学生');
        return;
      }

      // 批量操作
      selectedStudents.forEach((studentId) => {
        addPoints(studentId, delta, reasonType, reasonDetail, operator);
      });

      message.success(`已为 ${selectedStudents.length} 位学生${delta > 0 ? '加' : '扣'}${Math.abs(delta)}分`);
      
      // 重置
      form.resetFields();
      setSelectedStudents([]);
      onClose();
    });
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedStudents([]);
    onClose();
  };

  // 快捷模板
  const applyTemplate = (template: { delta: number; type: PointsLog['reasonType']; detail: string }) => {
    form.setFieldsValue({
      delta: template.delta,
      reasonType: template.type,
      reasonDetail: template.detail,
    });
    // 自动全选
    setSelectedStudents(students.map(s => s.id));
    message.success('已应用模板并全选学生');
  };

  return (
    <DraggableModal
      title="📊 批量加减积分"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      width={800}
      okText="确认"
      cancelText="取消"
    >
      <div style={{ marginBottom: '16px' }}>
        <Space>
          <span style={{ color: '#666' }}>快捷模板：</span>
          <Button size="small" onClick={() => applyTemplate({ delta: 5, type: 'attendance', detail: '全勤奖励' })}>
            📅 全勤奖 (+5)
          </Button>
          <Button size="small" onClick={() => applyTemplate({ delta: 3, type: 'homework', detail: '作业优秀' })}>
            📝 作业优秀 (+3)
          </Button>
          <Button size="small" onClick={() => applyTemplate({ delta: 2, type: 'performance', detail: '课堂积极发言' })}>
            🙋 积极发言 (+2)
          </Button>
          <Button size="small" danger onClick={() => applyTemplate({ delta: -2, type: 'discipline', detail: '上课讲话' })}>
            🤫 纪律扣分 (-2)
          </Button>
        </Space>
      </div>

      <Form form={form} layout="vertical" initialValues={{ delta: 10, operator: '班主任' }}>
        <Form.Item
          label="积分变化"
          name="delta"
          rules={[{ required: true, message: '请输入积分变化' }]}
          extra="输入正数为加分，负数为扣分"
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="如：10 表示加10分，-5 表示扣5分"
            min={-999}
            max={999}
          />
        </Form.Item>

        <Form.Item
          label="原因类型"
          name="reasonType"
          rules={[{ required: true, message: '请选择原因类型' }]}
        >
          <Select options={reasonTypeOptions} placeholder="选择原因类型" />
        </Form.Item>

        <Form.Item
          label="详细原因"
          name="reasonDetail"
          rules={[{ required: false }]}
        >
          <Input.TextArea
            rows={2}
            placeholder="如：全勤奖励、上课讲话、作业优秀等"
          />
        </Form.Item>

        <Form.Item
          label="操作人"
          name="operator"
          rules={[{ required: true, message: '请输入操作人' }]}
        >
          <Input placeholder="如：班主任、数学老师等" />
        </Form.Item>
      </Form>

      <div style={{ marginTop: '16px' }}>
        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>选择学生：</span>
          <Space>
            <Button
              size="small"
              onClick={() => setSelectedStudents(students.map(s => s.id))}
            >
              全选
            </Button>
            <Button
              size="small"
              onClick={() => setSelectedStudents([])}
            >
              清空
            </Button>
            <span style={{ fontSize: '12px', color: '#999' }}>
              已选择 {selectedStudents.length} / {students.length} 人
            </span>
          </Space>
        </div>
        
        <Table
          size="small"
          rowKey="id"
          dataSource={students}
          columns={columns}
          rowSelection={{
            selectedRowKeys: selectedStudents,
            onChange: (keys) => setSelectedStudents(keys as string[]),
          }}
          pagination={{ pageSize: 5, showSizeChanger: false }}
          scroll={{ y: 300 }}
        />
      </div>
    </DraggableModal>
  );
};

export default BatchPointsModal;
