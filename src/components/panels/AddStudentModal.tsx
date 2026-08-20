import { useState, useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Space,
  Button,
  DatePicker,
  Checkbox,
  AutoComplete,
  ColorPicker,
} from 'antd';
import dayjs from 'dayjs';
import { PlusOutlined, EnvironmentOutlined, FileTextOutlined, MinusOutlined } from '@ant-design/icons';
import type { Student } from '../../types/models';
import { useClassStore } from '../../store/useClassStore';
import DraggableModal from '../common/DraggableModal';

type AddStudentModalProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (student: Omit<Student, 'id'>, targetSeatId?: string) => void;
  editingStudent?: Student | null;
  stagePosition?: 'top' | 'bottom' | 'left' | 'right' | null;
};

const AddStudentModal = ({ open, onCancel, onConfirm, editingStudent, stagePosition }: AddStudentModalProps) => {
  const [form] = Form.useForm();
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [inputTag, setInputTag] = useState('');
  const [selectedSeatId, setSelectedSeatId] = useState<string | undefined>(undefined);
  const [pointsChange, setPointsChange] = useState<number>(1);
  const [pointsDelta, setPointsDelta] = useState<number>(0);
  const [pointsReason, setPointsReason] = useState<string>('');
  
  const classroom = useClassStore((state) => state.classroom);
  const assignments = useClassStore((state) => state.assignments);
  const classList = useClassStore((state) => state.classList);
  const classId = useClassStore((state) => state.classId);
  const addPoints = useClassStore((state) => state.addPoints);
  
  // 获取当前班级的自定义字段配置
  const currentClass = classList.find(c => c.id === classId);
  const customFields = currentClass?.customFields || [];

  // 当打开编辑模式时，初始化表单和标签
  useEffect(() => {
    if (open && editingStudent) {
      setPointsDelta(0); // 重置积分变更
      setPointsReason(''); // 重置积分原因
      const formData: any = {
        name: editingStudent.name,
        studentNumber: editingStudent.studentNumber,
        className: editingStudent.className,
        gender: editingStudent.gender,
        height: editingStudent.height,
        vision: editingStudent.vision,
        score: editingStudent.score,
        remarks: editingStudent.remarks,
        customColor: editingStudent.customColor,
      };
      
      // 加载自定义字段的数据
      customFields.forEach(field => {
        if (editingStudent.flexibleData && editingStudent.flexibleData[field.key] !== undefined) {
          const value = editingStudent.flexibleData[field.key];
          // 日期字段需要转换为 dayjs 对象
          if (field.type === 'date' && typeof value === 'string') {
            formData[`custom_${field.key}`] = dayjs(value);
          }
          // 多选字段需要转换为数组
          else if (field.type === 'multiselect' && typeof value === 'string') {
            formData[`custom_${field.key}`] = value.split(',');
          }
          else {
            formData[`custom_${field.key}`] = value;
          }
        }
      });
      
      form.setFieldsValue(formData);
      setCustomTags(editingStudent.tags || []);
      
      // 查找当前学生的座位
      const currentAssignment = assignments.find(a => a.studentId === editingStudent.id);
      setSelectedSeatId(currentAssignment?.seatId);
    } else if (open && !editingStudent) {
      form.resetFields();
      setCustomTags([]);
      setPointsDelta(0);
      setPointsReason('');
      setSelectedSeatId(undefined);
    }
  }, [open, editingStudent?.id]); // 仅在模态框打开或编辑对象变化时初始化一次

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // 如果有积分变更，先提交积分流水
      if (editingStudent && pointsDelta !== 0) {
        addPoints(editingStudent.id, pointsDelta, 'manual', pointsReason || '手动调整', '教师');
      }

      // 收集自定义字段的数据
      const flexibleData: Record<string, string | number> = {};
      customFields.forEach(field => {
        let fieldValue = values[`custom_${field.key}`];
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          // 日期字段转换为字符串
          if (field.type === 'date' && fieldValue) {
            fieldValue = fieldValue.format('YYYY-MM-DD');
          }
          // 多选字段转换为逗号分隔的字符串
          if (field.type === 'multiselect' && Array.isArray(fieldValue)) {
            fieldValue = fieldValue.join(',');
          }
          flexibleData[field.key] = fieldValue;
        }
      });
      
      const studentData: Omit<Student, 'id'> = {
        name: values.name,
        studentNumber: values.studentNumber,
        className: Array.isArray(values.className) ? values.className[0] : values.className,
        gender: values.gender,
        height: values.height,
        vision: values.vision,
        score: values.score,
        tags: customTags,
        remarks: values.remarks,
        customColor: values.customColor ? (typeof values.customColor === 'string' ? values.customColor : values.customColor.toHexString()) : undefined,
        flexibleData,
        points: editingStudent ? (editingStudent.points + pointsDelta) : 0, // 使用计算后的积分
        wishes: [],
      };
      
      onConfirm(studentData, selectedSeatId);
      form.resetFields();
      setCustomTags([]);
      setPointsReason('');
      setSelectedSeatId(undefined);
      onCancel();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setCustomTags([]);
    setPointsReason('');
    onCancel();
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
      title={editingStudent ? '编辑学生' : '添加学生'}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="保存"
      cancelText="取消"
      width={900}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          gender: 'male',
          height: 160,
          vision: 5.0,
          score: 'B',
        }}
      >
        {/* 基本信息 */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">📋 基本信息</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="姓名"
              name="name"
              rules={[{ required: true, message: '请输入学生姓名' }]}
            >
              <Input placeholder="请输入姓名" />
            </Form.Item>

            <Form.Item
              label="学号"
              name="studentNumber"
            >
              <Input placeholder="请输入学号（可选）" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="班级"
              name="className"
            >
              <AutoComplete
                placeholder="请选择或输入班级，如：三年二班"
                allowClear
                options={classList.map(cls => ({
                  label: cls.fullName,
                  value: cls.fullName,
                }))}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>

            <Form.Item
              label="性别"
              name="gender"
              rules={[{ required: true, message: '请选择性别' }]}
            >
              <Select>
                <Select.Option value="male">男</Select.Option>
                <Select.Option value="female">女</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item
              label="身高(cm)"
              name="height"
              rules={[{ required: true, message: '请输入身高' }]}
            >
              <InputNumber min={100} max={250} className="w-full" />
            </Form.Item>

            <Form.Item
              label="视力"
              name="vision"
              rules={[{ required: true, message: '请输入视力' }]}
            >
              <InputNumber min={3.0} max={5.3} step={0.1} className="w-full" />
            </Form.Item>

            <Form.Item
              label="综合成绩"
              name="score"
              rules={[{ required: true, message: '请选择成绩等级' }]}
            >
              <Select className="w-full" placeholder="请选择成绩等级">
                <Select.OptGroup label="等级制">
                  <Select.Option value="A">🌟 A - 优秀</Select.Option>
                  <Select.Option value="B">👍 B - 良好</Select.Option>
                  <Select.Option value="C">✅ C - 中等</Select.Option>
                  <Select.Option value="D">📊 D - 及格</Select.Option>
                  <Select.Option value="E">⚠️ E - 不及格</Select.Option>
                </Select.OptGroup>
                <Select.OptGroup label="分数制（可自定义输入）">
                  <Select.Option value={90}>90-100</Select.Option>
                  <Select.Option value={80}>80-89</Select.Option>
                  <Select.Option value={70}>70-79</Select.Option>
                  <Select.Option value={60}>60-69</Select.Option>
                  <Select.Option value={50}>50以下</Select.Option>
                </Select.OptGroup>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            label="座位背景颜色"
            name="customColor"
          >
            <ColorPicker 
              showText 
              format="hex"
              presets={[
                {
                  label: '常用颜色',
                  colors: [
                    '#EFF6FF', // 浅蓝
                    '#FEF3F2', // 浅粉
                    '#FEF9C3', // 浅黄
                    '#ECFDF5', // 浅绿
                    '#FAF5FF', // 浅紫
                    '#FFF7ED', // 浅橙
                    '#F0F9FF', // 天蓝
                    '#FFF1F2', // 玫红
                  ],
                },
              ]}
            />
          </Form.Item>
          <p className="text-xs text-slate-400 -mt-2 mb-2">
            🎨 设置该学生座位的背景颜色，留空则使用默认颜色
          </p>
        </div>

        {/* 积分管理（仅编辑模式） */}
        {editingStudent && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">⭐ 积分管理</h4>
            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex flex-col items-center px-2 min-w-[80px]">
                <span className="text-xs text-slate-500">当前积分</span>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-blue-600">
                    {editingStudent.points + pointsDelta}
                  </span>
                  {pointsDelta !== 0 && (
                    <span className={`text-xs font-bold ${pointsDelta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ({pointsDelta > 0 ? '+' : ''}{pointsDelta})
                    </span>
                  )}
                </div>
              </div>
              
              <div className="w-[1px] h-10 bg-slate-200 mx-2"></div>
              
              <div className="flex-1 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-600">调整值：</span>
                <InputNumber 
                  value={pointsChange} 
                  onChange={(val) => setPointsChange(val || 1)} 
                  min={1} 
                  max={100}
                  style={{ width: 60 }}
                  size="small"
                />
                <Button 
                  icon={<PlusOutlined />} 
                  type="primary" 
                  ghost 
                  size="small"
                  onClick={() => setPointsDelta(prev => prev + pointsChange)}
                >
                  加分
                </Button>
                <Button 
                  icon={<MinusOutlined />} 
                  danger 
                  size="small"
                  onClick={() => setPointsDelta(prev => prev - pointsChange)}
                >
                  扣分
                </Button>
                
                <div className="w-full mt-2">
                  <Input 
                    placeholder="请输入积分变动原因（可选）" 
                    size="small"
                    value={pointsReason}
                    onChange={(e) => setPointsReason(e.target.value)}
                    prefix={<FileTextOutlined className="text-slate-400" />}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 学科习惯/标签 */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">🏷️ 学科习惯 / 标签</h4>
          <p className="text-xs text-slate-500 mb-2">
            可自定义标签，如：学霸、多动、纪律委员等
          </p>
          
          <Space wrap className="mb-3">
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
              添加标签
            </Button>
          </Space.Compact>

          {/* 快捷标签 */}
          <div className="mt-2">
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

        {/* 自定义字段 */}
        {customFields.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">✨ 自定义信息</h4>
            {customFields.map((field) => {
              const fieldName = `custom_${field.key}`;
              const rules = field.required ? [{ required: true, message: `请输入${field.name}` }] : [];
              
              return (
                <Form.Item
                  key={field.id}
                  label={field.name}
                  name={fieldName}
                  rules={rules}
                >
                  {field.type === 'text' && (
                    <Input placeholder={field.placeholder || `请输入${field.name}`} />
                  )}
                  {field.type === 'number' && (
                    <InputNumber 
                      placeholder={field.placeholder || `请输入${field.name}`}
                      style={{ width: '100%' }}
                    />
                  )}
                  {field.type === 'date' && (
                    <DatePicker 
                      placeholder={field.placeholder || `请选择${field.name}`}
                      style={{ width: '100%' }}
                    />
                  )}
                  {field.type === 'select' && (
                    <Select placeholder={field.placeholder || `请选择${field.name}`}>
                      {field.options?.map((option) => (
                        <Select.Option key={option} value={option}>
                          {option}
                        </Select.Option>
                      ))}
                    </Select>
                  )}
                  {field.type === 'multiselect' && (
                    <Checkbox.Group options={field.options || []} />
                  )}
                </Form.Item>
              );
            })}
          </div>
        )}

        {/* 备注 */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">📝 备注信息</h4>
          <Form.Item
            name="remarks"
            style={{ marginBottom: 0 }}
          >
            <Input.TextArea 
              rows={3}
              placeholder="输入备注信息，如：特殊需求、家长联系方式等"
              maxLength={200}
              showCount
            />
          </Form.Item>
        </div>

        {/* 座位设置 */}
        {editingStudent && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">
              <EnvironmentOutlined /> 座位设置
            </h4>
            <p className="text-xs text-slate-500 mb-2">
              为学生指定座位位置（可选）
            </p>
            <Select
              placeholder="选择座位"
              value={selectedSeatId}
              onChange={setSelectedSeatId}
              className="w-full"
              allowClear
              showSearch
              optionFilterProp="label"
            >
              {classroom.cells
                .filter((cell) => cell.type === 'seat')
                .sort((a, b) => (a.row - b.row === 0 ? a.col - b.col : a.row - b.row))
                .map((seat) => {
                  const assignment = assignments.find((a) => a.seatId === seat.id);
                  const isOccupied = assignment && assignment.studentId && assignment.studentId !== editingStudent.id;
                  const occupiedBy = isOccupied 
                    ? ` (已有学生)` 
                    : assignment?.studentId === editingStudent.id 
                    ? ' (当前)' 
                    : '';
                  
                  // 计算同步的显示编号
                  let displayRow = seat.row;
                  let displayCol = seat.col;
                  if (stagePosition === 'top') displayRow = seat.row - 1;
                  else if (stagePosition === 'left') displayCol = seat.col - 1;

                  return (
                    <Select.Option
                      key={seat.id}
                      value={seat.id}
                      label={`${displayRow}行${displayCol}列${occupiedBy}`}
                      disabled={isOccupied}
                    >
                      {displayRow}行 {displayCol}列{occupiedBy}
                    </Select.Option>
                  );
                })}
            </Select>
            <p className="text-xs text-slate-400 mt-1">
              💡 选择座位后保存，学生将被分配到指定位置
            </p>
          </div>
        )}
      </Form>
    </DraggableModal>
  );
};

export default AddStudentModal;
