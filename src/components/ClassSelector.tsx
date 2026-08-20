import { useState } from 'react';
import { Select, Button, Modal, Form, Input, message } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ClassInfo } from '../types/models';

type ClassSelectorProps = {
  currentClassId: string;
  classes: ClassInfo[];
  onClassChange: (classId: string) => void;
  onClassCreate: (grade: string, className: string) => void;
  onClassDelete: (classId: string) => void;
  onClassRename?: (classId: string, grade: string, className: string) => void;
};

const ClassSelector = ({
  currentClassId,
  classes,
  onClassChange,
  onClassCreate,
  onClassDelete,
  onClassRename,
}: ClassSelectorProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [renameForm] = Form.useForm();

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      
      // 检查班级是否已存在
      const isDuplicate = classes.some(
        (c) => c.grade === values.grade && c.className === values.className
      );

      if (isDuplicate) {
        message.error(`班级 "${values.grade}${values.className}" 已存在，请勿重复创建`);
        return;
      }

      onClassCreate(values.grade, values.className);
      message.success('班级创建成功');
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleRename = async () => {
    try {
      const values = await renameForm.validateFields();
      if (onClassRename) {
        onClassRename(currentClassId, values.grade, values.className);
        message.success('班级重命名成功');
        setRenameModalOpen(false);
        renameForm.resetFields();
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const openRenameModal = () => {
    const currentClass = classes.find((c) => c.id === currentClassId);
    if (currentClass) {
      renameForm.setFieldsValue({
        grade: currentClass.grade,
        className: currentClass.className,
      });
      setRenameModalOpen(true);
    }
  };

  const handleDelete = (classId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该班级吗？删除后所有数据将无法恢复！',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        onClassDelete(classId);
        message.success('班级已删除');
      },
    });
  };

  return (
    <div className="flex items-center gap-2" style={{ overflow: 'visible', position: 'relative', zIndex: 100 }}>
      <Select
        value={currentClassId}
        onChange={onClassChange}
        style={{ width: 200, minWidth: 200 }}
        placeholder="选择班级"
        dropdownStyle={{ zIndex: 9999 }}
        getPopupContainer={(trigger) => trigger.parentElement || document.body}
      >
        {classes.map((cls) => (
          <Select.Option key={cls.id} value={cls.id}>
            {cls.fullName}
          </Select.Option>
        ))}
      </Select>

      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setIsModalOpen(true)}
        style={{ whiteSpace: 'nowrap', overflow: 'visible' }}
      >
        新建班级
      </Button>

      {onClassRename && classes.length > 0 && (
        <Button
          icon={<EditOutlined />}
          onClick={openRenameModal}
          style={{ whiteSpace: 'nowrap', overflow: 'visible' }}
        >
          重命名
        </Button>
      )}

      {classes.length > 1 && (
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(currentClassId)}
          style={{ whiteSpace: 'nowrap', overflow: 'visible' }}
        >
          删除当前班级
        </Button>
      )}

      <Modal
        title="创建新班级"
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            grade: '2024级',
            className: '1班',
          }}
        >
          <Form.Item
            label="年级"
            name="grade"
            rules={[{ required: true, message: '请输入年级' }]}
          >
            <Input placeholder="如：2024级、高一、初二" />
          </Form.Item>

          <Form.Item
            label="班级名称"
            name="className"
            rules={[{ required: true, message: '请输入班级名称' }]}
          >
            <Input placeholder="如：1班、3班" />
          </Form.Item>

          <p className="text-xs text-slate-400">
            💡 完整班级名将显示为：年级 + 班级名称
          </p>
        </Form>
      </Modal>
      <Modal
        title="重命名当前班级"
        open={renameModalOpen}
        onOk={handleRename}
        onCancel={() => {
          setRenameModalOpen(false);
          renameForm.resetFields();
        }}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={renameForm}
          layout="vertical"
        >
          <Form.Item
            label="年级"
            name="grade"
            rules={[{ required: true, message: '请输入年级' }]}
          >
            <Input placeholder="如：三年级、高一" />
          </Form.Item>
          <Form.Item
            label="班级名称"
            name="className"
            rules={[{ required: true, message: '请输入班级名称' }]}
          >
            <Input placeholder="如：一班、2班" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClassSelector;
