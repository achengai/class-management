import { useState } from 'react';
import { Modal, Form, Input, Select, Button, List, Space, Switch, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import { useClassStore } from '../../store/useClassStore';
import type { CustomFieldDefinition } from '../../types/models';

interface CustomFieldsManagerProps {
  open: boolean;
  onClose: () => void;
}

const CustomFieldsManager = ({ open, onClose }: CustomFieldsManagerProps) => {
  const [msgApi, contextHolder] = message.useMessage();
  const currentClassId = useClassStore((state) => state.classId);
  const currentClass = useClassStore((state) => 
    state.classList.find(c => c.id === currentClassId)
  );
  const addCustomField = useClassStore((state) => state.addCustomField);
  const updateCustomField = useClassStore((state) => state.updateCustomField);
  const deleteCustomField = useClassStore((state) => state.deleteCustomField);
  
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [form] = Form.useForm();
  const [optionsInput, setOptionsInput] = useState<string>('');

  const customFields = currentClass?.customFields || [];

  const handleAddField = () => {
    setEditingField(null);
    form.resetFields();
    setOptionsInput('');
    setFieldModalOpen(true);
  };

  const handleEditField = (field: CustomFieldDefinition) => {
    setEditingField(field);
    form.setFieldsValue({
      name: field.name,
      key: field.key,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder,
      defaultValue: field.defaultValue,
    });
    setOptionsInput(field.options?.join(', ') || '');
    setFieldModalOpen(true);
  };

  const handleSaveField = async () => {
    try {
      const values = await form.validateFields();
      
      const fieldData: Omit<CustomFieldDefinition, 'id' | 'order'> = {
        name: values.name,
        key: values.key || values.name.toLowerCase().replace(/\s+/g, '_'),
        type: values.type,
        required: values.required || false,
        placeholder: values.placeholder,
        defaultValue: values.defaultValue,
      };

      // 处理选择类型的选项
      if (values.type === 'select' || values.type === 'multiselect') {
        fieldData.options = optionsInput.split(',').map(s => s.trim()).filter(Boolean);
      }

      if (editingField) {
        updateCustomField(editingField.id, fieldData);
        msgApi.success('字段已更新');
      } else {
        addCustomField(fieldData);
        msgApi.success('字段已添加');
      }

      setFieldModalOpen(false);
      form.resetFields();
      setOptionsInput('');
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleDeleteField = (fieldId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除此字段后，所有学生该字段的数据也将被清除。确定要删除吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteCustomField(fieldId);
        msgApi.success('字段已删除');
      },
    });
  };

  const fieldTypeLabels: Record<string, string> = {
    text: '文本',
    number: '数字',
    date: '日期',
    select: '单选',
    multiselect: '多选',
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={
          <Space>
            <SettingOutlined />
            <span>学生自定义字段管理</span>
          </Space>
        }
        open={open}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        <div className="mb-4">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddField}
          >
            添加字段
          </Button>
        </div>

        <List
          dataSource={customFields}
          renderItem={(field) => (
            <List.Item
              actions={[
                <Button
                  key="edit"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEditField(field)}
                >
                  编辑
                </Button>,
                <Button
                  key="delete"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteField(field.id)}
                >
                  删除
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <span className="font-medium">{field.name}</span>
                    <Tag color="blue">{fieldTypeLabels[field.type]}</Tag>
                    {field.required && <Tag color="red">必填</Tag>}
                  </Space>
                }
                description={
                  <div className="text-xs text-gray-500">
                    <div>键名: {field.key}</div>
                    {field.placeholder && <div>提示: {field.placeholder}</div>}
                    {field.options && field.options.length > 0 && (
                      <div>选项: {field.options.join(', ')}</div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* 字段编辑对话框 */}
      <Modal
        title={editingField ? '编辑字段' : '添加字段'}
        open={fieldModalOpen}
        onOk={handleSaveField}
        onCancel={() => {
          setFieldModalOpen(false);
          form.resetFields();
          setOptionsInput('');
        }}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="字段名称"
            name="name"
            rules={[{ required: true, message: '请输入字段名称' }]}
          >
            <Input placeholder="如：家长电话、兴趣爱好" />
          </Form.Item>

          <Form.Item
            label="字段键（英文，用于存储）"
            name="key"
            tooltip="留空则自动生成"
          >
            <Input placeholder="如：parent_phone" />
          </Form.Item>

          <Form.Item
            label="字段类型"
            name="type"
            rules={[{ required: true, message: '请选择字段类型' }]}
          >
            <Select>
              <Select.Option value="text">文本</Select.Option>
              <Select.Option value="number">数字</Select.Option>
              <Select.Option value="date">日期</Select.Option>
              <Select.Option value="select">单选</Select.Option>
              <Select.Option value="multiselect">多选</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) =>
              (getFieldValue('type') === 'select' || getFieldValue('type') === 'multiselect') && (
                <Form.Item
                  label="选项（用逗号分隔）"
                  tooltip="多个选项用逗号分隔，如：A型,B型,AB型,O型"
                >
                  <Input
                    value={optionsInput}
                    onChange={(e) => setOptionsInput(e.target.value)}
                    placeholder="选项1, 选项2, 选项3"
                  />
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item label="提示文本" name="placeholder">
            <Input placeholder="输入框的提示文字" />
          </Form.Item>

          <Form.Item label="默认值" name="defaultValue">
            <Input />
          </Form.Item>

          <Form.Item label="是否必填" name="required" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default CustomFieldsManager;
