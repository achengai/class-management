import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Tag, Space, Button, List, message, Tabs, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useClassStore } from '../../store/useClassStore';
import type { Student } from '../../types/models';
import DraggableModal from '../common/DraggableModal';

type Props = {
  open: boolean;
  onClose: () => void;
  selectedStudents: Student[];
};

const BatchEditStudentModal = ({ open, onClose, selectedStudents }: Props) => {
  const [form] = Form.useForm();
  const updateStudent = useClassStore((state) => state.updateStudent);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [inputTag, setInputTag] = useState('');

  useEffect(() => {
    if (open) {
      form.resetFields();
      setCustomTags([]);
    }
  }, [open, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // 批量更新学生
      selectedStudents.forEach((student) => {
        const updates: Partial<Student> = {};
        
        // 只更新填写的字段
        if (values.height !== undefined && values.height !== null) {
          updates.height = values.height;
        }
        if (values.vision !== undefined && values.vision !== null) {
          updates.vision = values.vision;
        }
        if (values.score !== undefined && values.score !== null) {
          updates.score = values.score;
        }
        if (customTags.length > 0) {
          // 将组长角色添加到groupLeaderRoles字段（用于座位图显示）
          const existingRoles = student.groupLeaderRoles || [];
          const allRoles = [...new Set([...existingRoles, ...customTags])];
          updates.groupLeaderRoles = allRoles;
          
          // 同时也添加到tags字段（用于筛选和标记）
          const existingTags = student.tags || [];
          const allTags = [...new Set([...existingTags, ...customTags])];
          updates.tags = allTags;
        }
        if (values.remarks) {
          // 追加备注
          updates.remarks = student.remarks 
            ? `${student.remarks}\n${values.remarks}` 
            : values.remarks;
        }
        
        if (Object.keys(updates).length > 0) {
          updateStudent(student.id, updates);
        }
      });
      
      message.success(`已成功批量编辑 ${selectedStudents.length} 位学生`);
      form.resetFields();
      setCustomTags([]);
      onClose();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setCustomTags([]);
    onClose();
  };

  const handleAddTag = () => {
    if (inputTag && !customTags.includes(inputTag)) {
      setCustomTags([...customTags, inputTag]);
      setInputTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setCustomTags(customTags.filter((t) => t !== tag));
  };

  return (
    <DraggableModal
      title={`批量编辑 (${selectedStudents.length} 位学生)`}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="批量保存"
      cancelText="取消"
      width={700}
    >
      <Tabs
        defaultActiveKey="info"
        items={[
          {
            key: 'students',
            label: '选中学生',
            children: (
              <List
                size="small"
                bordered
                style={{ maxHeight: '200px', overflow: 'auto' }}
                dataSource={selectedStudents}
                renderItem={(student) => (
                  <List.Item>
                    <Space>
                      <Tag color={student.gender === 'male' ? 'blue' : 'pink'}>
                        {student.gender === 'male' ? '男' : '女'}
                      </Tag>
                      <span>{student.name}</span>
                    </Space>
                  </List.Item>
                )}
              />
            ),
          },
          {
            key: 'info',
            label: '批量编辑',
            children: (
              <Form form={form} layout="vertical">
                <p className="text-xs text-slate-500 mb-4">
                  💡 提示：只填写需要批量修改的字段，留空的字段不会改变
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <Form.Item label="身高(cm)" name="height">
                    <InputNumber min={100} max={250} className="w-full" placeholder="批量设置身高" />
                  </Form.Item>

                  <Form.Item label="视力" name="vision">
                    <InputNumber min={3.0} max={5.3} step={0.1} className="w-full" placeholder="批量设置视力" />
                  </Form.Item>
                </div>

                <Form.Item label="综合成绩" name="score">
                  <Select className="w-full" placeholder="批量设置成绩等级" allowClear>
                    <Select.OptGroup label="等级制">
                      <Select.Option value="A">🌟 A - 优秀</Select.Option>
                      <Select.Option value="B">👍 B - 良好</Select.Option>
                      <Select.Option value="C">✅ C - 中等</Select.Option>
                      <Select.Option value="D">📊 D - 及格</Select.Option>
                      <Select.Option value="E">⚠️ E - 不及格</Select.Option>
                    </Select.OptGroup>
                    <Select.OptGroup label="分数制">
                      <Select.Option value={90}>90-100</Select.Option>
                      <Select.Option value={80}>80-89</Select.Option>
                      <Select.Option value={70}>70-79</Select.Option>
                      <Select.Option value={60}>60-69</Select.Option>
                      <Select.Option value={50}>50以下</Select.Option>
                    </Select.OptGroup>
                  </Select>
                </Form.Item>

                <Form.Item label="设置组长角色">
                  <div className="space-y-3">
                    {/* 已选中的组长角色 */}
                    {customTags.length > 0 && (
                      <div className="bg-green-50 p-2 rounded border border-green-200">
                        <p className="text-xs text-green-700 mb-2">
                          ✓ <strong>已选中的组长角色：</strong>
                        </p>
                        <Space wrap>
                          {customTags.map((tag) => (
                            <Tag
                              key={tag}
                              color="green"
                              closable
                              onClose={() => handleRemoveTag(tag)}
                              style={{ fontWeight: 'bold' }}
                            >
                              {tag}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                    
                    <div className="bg-blue-50 p-2 rounded mb-2">
                      <p className="text-xs text-blue-600">
                        💡 <strong>批量设置组长：</strong>选中的所有学生将被添加对应的组长标签
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-2">✨ 点击快速添加组长标签（可多选）：</p>
                      <Space wrap>
                        {[
                          { label: '语文组长', color: 'blue' },
                          { label: '数学组长', color: 'green' },
                          { label: '英语组长', color: 'orange' },
                          { label: '班长', color: 'red' },
                          { label: '副班长', color: 'purple' },
                          { label: '学习委员', color: 'cyan' },
                          { label: '体育委员', color: 'magenta' },
                          { label: '文艺委员', color: 'pink' },
                          { label: '劳动委员', color: 'lime' },
                          { label: '小组长', color: 'gold' },
                        ].map(({ label, color }) => (
                          <Tag
                            key={label}
                            color={customTags.includes(label) ? color : 'default'}
                            style={{ 
                              cursor: 'pointer',
                              fontWeight: customTags.includes(label) ? 'bold' : 'normal',
                              border: customTags.includes(label) ? '2px solid' : '1px solid',
                            }}
                            onClick={() => {
                              if (!customTags.includes(label)) {
                                setCustomTags([...customTags, label]);
                              } else {
                                setCustomTags(customTags.filter(t => t !== label));
                              }
                            }}
                          >
                            {customTags.includes(label) ? '✓ ' : '+ '}{label}
                          </Tag>
                        ))}
                      </Space>
                    </div>

                    {/* 自定义输入组长角色 */}
                    <div>
                      <p className="text-xs text-slate-400 mb-2">🔧 或输入自定义组长角色：</p>
                      <Space.Compact style={{ width: '100%' }}>
                        <Input
                          placeholder="输入自定义组长角色名称（例如：物理组长、生活委员）"
                          value={inputTag}
                          onChange={(e) => setInputTag(e.target.value)}
                          onPressEnter={() => {
                            if (inputTag && !customTags.includes(inputTag)) {
                              setCustomTags([...customTags, inputTag]);
                              setInputTag('');
                            }
                          }}
                        />
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            if (inputTag && !customTags.includes(inputTag)) {
                              setCustomTags([...customTags, inputTag]);
                              setInputTag('');
                            }
                          }}
                        >
                          添加
                        </Button>
                      </Space.Compact>
                      <p className="text-xs text-slate-400 mt-1">
                        💡 提示：可以输入任意组长角色名称，如学科组长、班委等
                      </p>
                    </div>
                  </div>
                </Form.Item>

                <Form.Item label="添加标签">
                  <div className="space-y-2">
                    <Space wrap className="mb-2">
                      {customTags.map((tag) => (
                        <Tag
                          key={tag}
                          closable
                          onClose={() => handleRemoveTag(tag)}
                          color="blue"
                        >
                          {tag}
                        </Tag>
                      ))}
                    </Space>

                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        placeholder="输入新标签"
                        value={inputTag}
                        onChange={(e) => setInputTag(e.target.value)}
                        onPressEnter={handleAddTag}
                      />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddTag}
                      >
                        添加
                      </Button>
                    </Space.Compact>

                    {/* 快捷标签 */}
                    <div>
                      <p className="text-xs text-slate-400 mb-1">快捷选择：</p>
                      <Space wrap>
                        {['学霸', '努力', '多动', '近视', '爱讲话', '课代表', '纪律委员'].map((tag) => (
                          <Tag
                            key={tag}
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              if (!customTags.includes(tag)) {
                                setCustomTags([...customTags, tag]);
                              }
                            }}
                          >
                            + {tag}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  </div>
                </Form.Item>

                <Form.Item label="追加备注" name="remarks">
                  <Input.TextArea 
                    rows={3}
                    placeholder="输入备注信息，将追加到现有备注后"
                    maxLength={200}
                    showCount
                  />
                </Form.Item>
              </Form>
            ),
          },
        ]}
      />
    </DraggableModal>
  );
};

export default BatchEditStudentModal;
