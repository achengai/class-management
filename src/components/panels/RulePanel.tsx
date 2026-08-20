import { useMemo, useState } from 'react';
import { Card, Select, Button, List, Tag, DatePicker, Space, message, InputNumber, Radio, Collapse } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useClassStore } from '../../store/useClassStore';

const RulePanel = () => {
  const students = useClassStore((state) => state.students);
  const classroom = useClassStore((state) => state.classroom);
  const rules = useClassStore((state) => state.rules);
  const setRules = useClassStore((state) => state.setRules);
  const addMutexPair = useClassStore((state) => state.addMutexPair);
  const removeMutexPair = useClassStore((state) => state.removeMutexPair);
  const addBindingPair = useClassStore((state) => state.addBindingPair);
  const removeBindingPair = useClassStore((state) => state.removeBindingPair);
  const addTemporaryLock = useClassStore((state) => state.addTemporaryLock);
  const removeTemporaryLock = useClassStore((state) => state.removeTemporaryLock);
  const cleanupTemporaryLocks = useClassStore((state) => state.cleanupTemporaryLocks);

  const studentOptions = useMemo(
    () => students.map((student) => ({ label: student.name, value: student.id })),
    [students],
  );
  const seatOptions = useMemo(
    () =>
      classroom.cells
        .filter((cell) => cell.type === 'seat')
        .map((cell) => ({ label: cell.id.replace('seat-', ''), value: cell.id })),
    [classroom.cells],
  );
  const studentMap = useMemo(
    () => new Map(students.map((student) => [student.id, student.name])),
    [students],
  );

  const [mutexForm, setMutexForm] = useState<[string | undefined, string | undefined]>([
    undefined,
    undefined,
  ]);
  const [bindingForm, setBindingForm] = useState<[string | undefined, string | undefined]>([
    undefined,
    undefined,
  ]);
  const [lockForm, setLockForm] = useState<{
    studentId?: string;
    seatId?: string;
    expiresAt: Dayjs;
  }>({
    expiresAt: dayjs().add(7, 'day'),
  });

  const submitPair = (
    form: [string | undefined, string | undefined],
    setter: (value: [string | undefined, string | undefined]) => void,
    handler: (pair: [string, string]) => void,
  ) => {
    if (!form[0] || !form[1]) {
      message.warning('请选择两个学生');
      return;
    }
    if (form[0] === form[1]) {
      message.warning('不能选择同一位学生');
      return;
    }
    handler([form[0], form[1]]);
    setter([undefined, undefined]);
  };

  const submitLock = () => {
    if (!lockForm.studentId || !lockForm.seatId) {
      message.warning('请选择学生和座位');
      return;
    }
    addTemporaryLock({
      studentId: lockForm.studentId,
      seatId: lockForm.seatId,
      expiresAt: lockForm.expiresAt.toISOString(),
    });
    setLockForm({ expiresAt: dayjs().add(7, 'day') });
  };

  return (
    <Card title="高级规则" bordered={false} className="glass-panel">
      <Collapse 
        defaultActiveKey={['hardRules']} 
        ghost
        expandIconPosition="end"
      >
        <Collapse.Panel header="⚙️ 硬性规则" key="hardRules">
          
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-600">视力 ≤ {rules.visionThreshold} 前排</span>
            </div>
            <Space>
              <InputNumber
                size="small"
                step={0.1}
                min={3.0}
                max={5.3}
                value={rules.visionThreshold}
                onChange={(val) => setRules({ visionThreshold: val || 4.8 })}
                style={{ width: 70 }}
              />
              <span className="text-xs text-slate-500">需在前</span>
              <InputNumber
                size="small"
                min={1}
                max={classroom.rows}
                value={rules.frontRowsForVision}
                onChange={(val) => setRules({ frontRowsForVision: val || 2 })}
                style={{ width: 60 }}
              />
              <span className="text-xs text-slate-500">排</span>
            </Space>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-600">身高 ≤ {rules.heightThreshold}cm 前排</span>
            </div>
            <Space>
              <InputNumber
                size="small"
                step={1}
                min={100}
                max={200}
                value={rules.heightThreshold}
                onChange={(val) => setRules({ heightThreshold: val || 150 })}
                style={{ width: 70 }}
              />
              <span className="text-xs text-slate-500">需在前</span>
              <InputNumber
                size="small"
                min={1}
                max={classroom.rows}
                value={rules.frontRowsForHeight}
                onChange={(val) => setRules({ frontRowsForHeight: val || 2 })}
                style={{ width: 60 }}
              />
              <span className="text-xs text-slate-500">排</span>
            </Space>
          </div>

          <div className="mb-1">
            <span className="text-xs text-slate-600 block mb-1">性别策略</span>
            <Radio.Group
              size="small"
              value={rules.genderPolicy}
              onChange={(e) => setRules({ genderPolicy: e.target.value })}
              buttonStyle="solid"
            >
              <Radio.Button value="mix">男女混合</Radio.Button>
              <Radio.Button value="separate">男女分坐</Radio.Button>
              <Radio.Button value="any">不限</Radio.Button>
            </Radio.Group>
          </div>
        </Collapse.Panel>

        <Collapse.Panel header="互斥同桌" key="mutex">
          <Space direction="vertical" className="w-full">
            <Space.Compact block>
              <Select
                placeholder="学生A"
                style={{ flex: 1 }}
                options={studentOptions}
                value={mutexForm[0]}
                onChange={(value) => setMutexForm([value, mutexForm[1]])}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
              />
              <Select
                placeholder="学生B"
                style={{ flex: 1 }}
                options={studentOptions}
                value={mutexForm[1]}
                onChange={(value) => setMutexForm([mutexForm[0], value])}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
              />
              <Button type="primary" onClick={() => submitPair(mutexForm, setMutexForm, addMutexPair)}>
                添加
              </Button>
            </Space.Compact>
            <List
              size="small"
              dataSource={rules.mutexPairs}
              locale={{ emptyText: '暂无互斥规则' }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button type="link" size="small" onClick={() => removeMutexPair(item.id)} key="remove">
                      删除
                    </Button>,
                  ]}
                >
                  <Tag>{studentMap.get(item.students[0])}</Tag>
                  <span className="text-xs text-slate-500">与</span>
                  <Tag>{studentMap.get(item.students[1])}</Tag>
                </List.Item>
              )}
            />
          </Space>
        </Collapse.Panel>

        <Collapse.Panel header="绑定同桌" key="binding">
          <Space direction="vertical" className="w-full">
            <Space.Compact block>
              <Select
                placeholder="学生A"
                style={{ flex: 1 }}
                options={studentOptions}
                value={bindingForm[0]}
                onChange={(value) => setBindingForm([value, bindingForm[1]])}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
              />
              <Select
                placeholder="学生B"
                style={{ flex: 1 }}
                options={studentOptions}
                value={bindingForm[1]}
                onChange={(value) => setBindingForm([bindingForm[0], value])}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
              />
              <Button type="primary" onClick={() => submitPair(bindingForm, setBindingForm, addBindingPair)}>
                添加
              </Button>
            </Space.Compact>
            <List
              size="small"
              dataSource={rules.bindingPairs}
              locale={{ emptyText: '暂无绑定规则' }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button type="link" size="small" onClick={() => removeBindingPair(item.id)} key="remove">
                      删除
                    </Button>,
                  ]}
                >
                  <Tag color="blue">{studentMap.get(item.students[0])}</Tag>
                  <span className="text-xs text-slate-500">与</span>
                  <Tag color="blue">{studentMap.get(item.students[1])}</Tag>
                </List.Item>
              )}
            />
          </Space>
        </Collapse.Panel>

        <Collapse.Panel
          header="临时锁定"
          key="tempLock"
          extra={
            <Button
              type="link"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                cleanupTemporaryLocks();
              }}
            >
              清理过期
            </Button>
          }
        >
          <Space direction="vertical" className="w-full">
            <Space className="w-full" wrap>
              <Select
                placeholder="选择学生"
                style={{ minWidth: 140 }}
                options={studentOptions}
                value={lockForm.studentId}
                onChange={(value) => setLockForm((prev) => ({ ...prev, studentId: value }))}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
              />
              <Select
                placeholder="目标座位"
                style={{ minWidth: 120 }}
                options={seatOptions}
                value={lockForm.seatId}
                onChange={(value) => setLockForm((prev) => ({ ...prev, seatId: value }))}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
              />
              <DatePicker
                value={lockForm.expiresAt}
                onChange={(value) =>
                  setLockForm((prev) => ({ ...prev, expiresAt: value ?? dayjs().add(7, 'day') }))
                }
              />
              <Button type="primary" onClick={submitLock}>
                锁定
              </Button>
            </Space>
            <List
              size="small"
              dataSource={rules.temporaryLocks}
              locale={{ emptyText: '暂无临时锁定' }}
              renderItem={(lock) => {
                const isExpired = dayjs(lock.expiresAt).isBefore(dayjs());
                return (
                  <List.Item
                    actions={[
                      <Button type="link" size="small" onClick={() => removeTemporaryLock(lock.id)} key="remove">
                        解除
                      </Button>,
                    ]}
                  >
                    <Space size="small">
                      <Tag color={isExpired ? 'default' : 'green'}>{studentMap.get(lock.studentId)}</Tag>
                      <span className="text-xs text-slate-500">→ 座位 {lock.seatId.replace('seat-', '')}</span>
                      <span className="text-xs text-slate-400">
                        截止 {dayjs(lock.expiresAt).format('MM/DD')}
                      </span>
                    </Space>
                  </List.Item>
                );
              }}
            />
          </Space>
        </Collapse.Panel>
      </Collapse>
    </Card>
  );
};

export default RulePanel;
