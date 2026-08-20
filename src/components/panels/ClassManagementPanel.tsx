import { useState } from 'react';
import { List, Button, Modal, Form, Input, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, EditOutlined } from '@ant-design/icons';
import { useClassStore } from '../../store/useClassStore';

const ClassManagementPanel = () => {
  const [msgApi, contextHolder] = message.useMessage();
  const classList = useClassStore((state) => state.classList);
  const currentClassId = useClassStore((state) => state.classId);
  const addNewClass = useClassStore((state) => state.addNewClass);
  const switchClass = useClassStore((state) => state.switchClass);
  const deleteClass = useClassStore((state) => state.deleteClass);
  const renameClass = useClassStore((state) => state.renameClass);
  
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<{ id: string } | null>(null);
  const [form] = Form.useForm();
  const [renameForm] = Form.useForm();

  const handleAddClass = async () => {
    try {
      const values = await form.validateFields();
      addNewClass(values.grade, values.className);
      msgApi.success('班级创建成功');
      form.resetFields();
      setAddModalOpen(false);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleSwitchClass = (classId: string) => {
    switchClass(classId);
    msgApi.success('已切换班级');
  };

  const handleDeleteClass = (classId: string) => {
    if (classList.length <= 1) {
      msgApi.warning('至少需要保留一个班级');
      return;
    }
    deleteClass(classId);
    msgApi.success('班级已删除');
  };

  const handleRenameClass = async () => {
    try {
      const values = await renameForm.validateFields();
      if (editingClass) {
        renameClass(editingClass.id, values.grade, values.className);
        msgApi.success('班级重命名成功');
        setRenameModalOpen(false);
        setEditingClass(null);
        renameForm.resetFields();
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const openRenameModal = (e: React.MouseEvent, classInfo: any) => {
    e.stopPropagation();
    setEditingClass({ id: classInfo.id });
    renameForm.setFieldsValue({
      grade: classInfo.grade,
      className: classInfo.className,
    });
    setRenameModalOpen(true);
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-4">
      {contextHolder}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">📚 班级管理</h3>
        <Button 
          type="primary" 
          size="small" 
          icon={<PlusOutlined />}
          onClick={() => setAddModalOpen(true)}
        >
          新建班级
        </Button>
      </div>

      <List
        size="small"
        dataSource={classList}
        renderItem={(classInfo) => (
          <List.Item
            key={classInfo.id}
            className={`cursor-pointer hover:bg-slate-50 rounded-lg px-3 py-2 transition-all ${
              currentClassId === classInfo.id ? 'bg-blue-50 border-2 border-blue-300' : 'border-2 border-transparent'
            }`}
            onClick={() => handleSwitchClass(classInfo.id)}
            actions={[
              <Button
                key="edit"
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={(e) => openRenameModal(e, classInfo)}
              />,
              classList.length > 1 && (
                <Popconfirm
                  key="delete"
                  title="确认删除班级？"
                  description="删除后将无法恢复该班级的所有数据"
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    handleDeleteClass(classInfo.id);
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              ),
            ].filter(Boolean)}
          >
            <List.Item.Meta
              title={
                <div className="flex items-center gap-2">
                  <span className="font-medium">{classInfo.fullName}</span>
                  {currentClassId === classInfo.id && (
                    <Tag color="blue" icon={<CheckCircleOutlined />}>
                      当前
                    </Tag>
                  )}
                </div>
              }
              description={
                <div className="text-xs text-slate-500">
                  <span>{classInfo.students.length} 名学生</span>
                  <span className="mx-2">·</span>
                  <span>{classInfo.classroom.rows} × {classInfo.classroom.cols} 座位</span>
                  <span className="mx-2">·</span>
                  <span className="text-slate-400">{new Date(classInfo.updatedAt).toLocaleDateString()}</span>
                </div>
              }
            />
          </List.Item>
        )}
      />

      <Modal
        title="新建班级"
        open={addModalOpen}
        onOk={handleAddClass}
        onCancel={() => {
          form.resetFields();
          setAddModalOpen(false);
        }}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            grade: '三年级',
            className: '一班',
          }}
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

      <Modal
        title="重命名班级"
        open={renameModalOpen}
        onOk={handleRenameClass}
        onCancel={() => {
          renameForm.resetFields();
          setRenameModalOpen(false);
          setEditingClass(null);
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

export default ClassManagementPanel;
