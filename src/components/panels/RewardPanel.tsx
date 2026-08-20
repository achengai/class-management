import { useState } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Input, InputNumber, Select, message, Tabs, Badge } from 'antd';
import { GiftOutlined, StarOutlined, ShoppingOutlined, HistoryOutlined, PlusOutlined } from '@ant-design/icons';
import { useClassStore } from '../../store/useClassStore';
import type { Reward, Student } from '../../types/models';

const RewardPanel = () => {
  const [msgApi, contextHolder] = message.useMessage();
  const students = useClassStore((state) => state.students);
  const rewards = useClassStore((state) => state.rewards);
  const rewardRedeems = useClassStore((state) => state.rewardRedeems);
  const addReward = useClassStore((state) => state.addReward);
  const updateReward = useClassStore((state) => state.updateReward);
  const deleteReward = useClassStore((state) => state.deleteReward);
  const toggleRewardStatus = useClassStore((state) => state.toggleRewardStatus);
  const redeemReward = useClassStore((state) => state.redeemReward);
  const cancelRedeem = useClassStore((state) => state.cancelRedeem);

  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [form] = Form.useForm();
  const [selectedType, setSelectedType] = useState<string>('custom');

  // 奖励类型选项
  const rewardTypeOptions = [
    { label: '座位锁定', value: 'seat_lock', description: '锁定特定座位或区域' },
    { label: '同桌优先', value: 'deskmate_priority', description: '优先选择同桌' },
    { label: '区域偏好', value: 'zone_preference', description: '优先分配到指定区域' },
    { label: '自定义', value: 'custom', description: '其他自定义奖励' },
  ];

  // 奖励管理表格列
  const rewardColumns = [
    {
      title: '奖励名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Reward) => (
        <Space>
          <GiftOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 'bold' }}>{name}</span>
          {!record.isActive && <Tag color="red">已停用</Tag>}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: Reward['type']) => {
        const option = rewardTypeOptions.find(o => o.value === type);
        return <Tag color="blue">{option?.label || type}</Tag>;
      },
    },
    {
      title: '所需积分',
      dataIndex: 'costPoints',
      key: 'costPoints',
      render: (points: number) => (
        <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>
          <StarOutlined /> {points}
        </span>
      ),
    },
    {
      title: '兑换限制',
      dataIndex: 'limitPerStudent',
      key: 'limitPerStudent',
      render: (limit?: number) => limit ? `每人${limit}次` : '不限',
    },
    {
      title: '已兑换',
      key: 'redeemed',
      render: (_: any, record: Reward) => {
        const count = rewardRedeems.filter(r => r.rewardId === record.id).length;
        return <Badge count={count} showZero />;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Reward) => (
        <Space size="small">
          <Button
            size="small"
            type="link"
            onClick={() => {
              setEditingReward(record);
              setSelectedType(record.type);
              // 展开 payload 到表单字段
              form.setFieldsValue({
                ...record,
                ...record.payload,
              });
              setRewardModalOpen(true);
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
            type="link"
            onClick={() => toggleRewardStatus(record.id)}
          >
            {record.isActive ? '停用' : '启用'}
          </Button>
          <Button
            size="small"
            type="link"
            danger
            onClick={() => {
              Modal.confirm({
                title: '确认删除',
                content: `确定要删除奖励"${record.name}"吗？`,
                onOk: () => {
                  deleteReward(record.id);
                  msgApi.success('已删除');
                },
              });
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 学生兑换表格列
  const studentRedeemColumns = [
    {
      title: '学生',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, student: Student) => (
        <Space>
          <span>{name}</span>
          <Tag color={student.gender === 'male' ? 'blue' : 'magenta'}>
            {student.gender === 'male' ? '男' : '女'}
          </Tag>
        </Space>
      ),
    },
    {
      title: '当前积分',
      dataIndex: 'points',
      key: 'points',
      render: (points: number) => (
        <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
          <StarOutlined /> {points}
        </span>
      ),
      sorter: (a: Student, b: Student) => a.points - b.points,
    },
    {
      title: '已兑换',
      key: 'redeemed',
      render: (_: any, student: Student) => {
        const count = rewardRedeems.filter(r => r.studentId === student.id).length;
        return <Badge count={count} showZero />;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, student: Student) => {
        const activeRewards = rewards.filter(r => r.isActive);
        return (
          <Button
            size="small"
            type="primary"
            icon={<ShoppingOutlined />}
            disabled={activeRewards.length === 0}
            onClick={() => {
              // 直接使用第一个可用奖励进行兑换（简化版）
              if (student.points < activeRewards[0].costPoints) {
                msgApi.error(`积分不足！需要${activeRewards[0].costPoints}分`);
                return;
              }
              
              Modal.confirm({
                title: '确认兑换',
                content: `确定要花费 ${activeRewards[0].costPoints} 积分兑换"${activeRewards[0].name}"吗？`,
                onOk: () => {
                  redeemReward(student.id, activeRewards[0].id);
                  msgApi.success(`兑换成功！剩余积分：${student.points - activeRewards[0].costPoints}`);
                },
              });
            }}
          >
            兑换奖励
          </Button>
        );
      },
    },
  ];

  // 兑换记录表格列
  const redeemHistoryColumns = [
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
        return reward?.name || '未知';
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          pending: { text: '待生效', color: 'orange' },
          active: { text: '生效中', color: 'green' },
          used: { text: '已使用', color: 'blue' },
          expired: { text: '已过期', color: 'default' },
          cancelled: { text: '已取消', color: 'red' },
        };
        const info = statusMap[status] || { text: status, color: 'default' };
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
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        record.status === 'active' && (
          <Button
            size="small"
            type="link"
            danger
            onClick={() => {
              Modal.confirm({
                title: '确认取消',
                content: '确定要取消这个兑换吗？积分不会退回。',
                onOk: () => {
                  cancelRedeem(record.id);
                  msgApi.success('已取消兑换');
                },
              });
            }}
          >
            取消
          </Button>
        )
      ),
    },
  ];

  // 处理添加/编辑奖励
  const handleRewardOk = () => {
    form.validateFields().then((values) => {
      // 提取 payload 字段
      const { seatId, targetStudentId, zoneId, duration, ...baseValues } = values;
      const payload: Record<string, any> = { duration: duration || 30 };
      
      if (values.type === 'seat_lock') payload.seatId = seatId;
      if (values.type === 'deskmate_priority') payload.targetStudentId = targetStudentId;
      if (values.type === 'zone_preference') payload.zoneId = zoneId;

      const rewardData = {
        ...baseValues,
        payload,
      };

      if (editingReward) {
        updateReward(editingReward.id, rewardData);
        msgApi.success('奖励已更新');
      } else {
        addReward({ ...rewardData, isActive: true });
        msgApi.success('奖励已添加');
      }
      setRewardModalOpen(false);
      setEditingReward(null);
      form.resetFields();
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      {contextHolder}
      
      <Card
        title={
          <Space>
            <GiftOutlined />
            <span>奖励商城</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingReward(null);
              setSelectedType('custom');
              form.resetFields();
              setRewardModalOpen(true);
            }}
          >
            添加奖励
          </Button>
        }
      >
        <Tabs
          items={[
            {
              key: 'rewards',
              label: (
                <span>
                  <GiftOutlined />
                  奖励管理 ({rewards.length})
                </span>
              ),
              children: (
                <Table
                  dataSource={rewards}
                  columns={rewardColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: 'students',
              label: (
                <span>
                  <StarOutlined />
                  学生积分 ({students.length})
                </span>
              ),
              children: (
                <Table
                  dataSource={students}
                  columns={studentRedeemColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: 'history',
              label: (
                <span>
                  <HistoryOutlined />
                  兑换记录 ({rewardRedeems.length})
                </span>
              ),
              children: (
                <Table
                  dataSource={rewardRedeems}
                  columns={redeemHistoryColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 添加/编辑奖励对话框 */}
      <Modal
        title={editingReward ? '编辑奖励' : '添加奖励'}
        open={rewardModalOpen}
        onOk={handleRewardOk}
        onCancel={() => {
          setRewardModalOpen(false);
          setEditingReward(null);
          form.resetFields();
        }}
        width={600}
      >
        <Form 
          form={form} 
          layout="vertical"
          onValuesChange={(changedValues) => {
            if (changedValues.type) {
              setSelectedType(changedValues.type);
            }
          }}
        >
          <Form.Item
            label="奖励名称"
            name="name"
            rules={[{ required: true, message: '请输入奖励名称' }]}
          >
            <Input placeholder="如：座位优先选择权" />
          </Form.Item>

          <Form.Item
            label="奖励类型"
            name="type"
            rules={[{ required: true, message: '请选择奖励类型' }]}
          >
            <Select
              options={rewardTypeOptions}
              placeholder="选择类型"
            />
          </Form.Item>

          {/* 动态 Payload 配置 */}
          {selectedType === 'seat_lock' && (
            <Form.Item
              label="锁定座位ID"
              name="seatId"
              rules={[{ required: true, message: '请输入座位ID' }]}
              extra="例如：seat-1-1 表示第1行第1列"
            >
              <Input placeholder="seat-1-1" />
            </Form.Item>
          )}

          {selectedType === 'deskmate_priority' && (
            <Form.Item
              label="目标同桌ID"
              name="targetStudentId"
              extra="预设同桌的学生ID（选填，通常由学生兑换时指定）"
            >
              <Select
                showSearch
                allowClear
                placeholder="选择学生（可选）"
                optionFilterProp="label"
                options={students.map(s => ({ label: s.name, value: s.id }))}
              />
            </Form.Item>
          )}

          {selectedType === 'zone_preference' && (
            <Form.Item
              label="区域ID"
              name="zoneId"
              rules={[{ required: true, message: '请输入区域ID' }]}
            >
              <Input placeholder="如：front, back, left, right" />
            </Form.Item>
          )}

          <Form.Item
            label="所需积分"
            name="costPoints"
            rules={[{ required: true, message: '请输入所需积分' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="如：50"
            />
          </Form.Item>

          <Form.Item
            label="兑换限制"
            name="limitPerStudent"
            extra="留空表示不限制兑换次数"
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="如：1 表示每人限兑1次"
            />
          </Form.Item>
          
          <Form.Item
            label="有效期（天）"
            name="duration"
            initialValue={30}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="默认30天"
            />
          </Form.Item>

          <Form.Item
            label="奖励描述"
            name="description"
          >
            <Input.TextArea
              rows={3}
              placeholder="描述这个奖励的具体内容和作用"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RewardPanel;
