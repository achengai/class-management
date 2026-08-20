import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  List,
  Tag,
  Upload,
  message,
  Statistic,
  Card,
  Divider,
  Space,
  Input,
  Select,
  Button,
} from 'antd';
import { UploadOutlined, UserOutlined, PlusOutlined, SettingOutlined, StarOutlined, DownloadOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import { useClassStore } from '../../store/useClassStore';
import type { Student } from '../../types/models';
import AddStudentModal from './AddStudentModal';
import CustomFieldsManager from './CustomFieldsManager';
import BatchPointsModal from './BatchPointsModal';

const StudentPanel = () => {
  const students = useClassStore((state) => state.students);
  const importStudentsFromXlsx = useClassStore((state) => state.importStudentsFromXlsx);
  const addStudent = useClassStore((state) => state.addStudent);
  const updateStudent = useClassStore((state) => state.updateStudent);
  const assignments = useClassStore((state) => state.assignments);
  const swapSeats = useClassStore((state) => state.swapSeats);
  const loading = useClassStore((state) => state.loading);
  const summary = useClassStore((state) => state.summary);
  const filters = useClassStore((state) => state.filters);
  const setFilterKeyword = useClassStore((state) => state.setFilterKeyword);
  const setHighlightTag = useClassStore((state) => state.setHighlightTag);
  const spotlightStudentId = useClassStore((state) => state.spotlightStudentId);
  const setSpotlightStudent = useClassStore((state) => state.setSpotlightStudent);
  
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<typeof students[0] | null>(null);
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const [batchPointsOpen, setBatchPointsOpen] = useState(false);

  const handleDownloadTemplate = () => {
    // 定义表头
    const headers = [
      '姓名', '性别', '身高', '视力', '成绩', '标签(逗号分隔)', '学号', '备注'
    ];
    // 示例数据
    const data = [
      ['张三', '男', 175, 5.0, 95, '班长,数学课代表', '2024001', ''],
      ['李四', '女', 165, 4.8, 88, '', '2024002', ''],
    ];

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

    // 设置列宽
    const wscols = [
      { wch: 10 }, // 姓名
      { wch: 6 },  // 性别
      { wch: 8 },  // 身高
      { wch: 8 },  // 视力
      { wch: 8 },  // 成绩
      { wch: 20 }, // 标签
      { wch: 15 }, // 学号
      { wch: 20 }, // 备注
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, '学生名单模板');

    // 生成文件并下载
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, '学生名单导入模板.xlsx');
  };

  const stats = useMemo(() => {
    const nearSighted = students.filter((student) => student.vision <= 4.8).length;
    const lowHeight = students.filter((student) => student.height <= 155).length;
    return { nearSighted, lowHeight };
  }, [students]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((student) => student.tags.forEach((tag) => set.add(tag)));
    return Array.from(set).map((tag) => ({ label: tag, value: tag }));
  }, [students]);

  const filteredStudents = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    return students.filter((student) => {
      const matchKeyword =
        !keyword ||
        student.name.toLowerCase().includes(keyword) ||
        student.tags.some((tag) => tag.toLowerCase().includes(keyword));
      const matchTag = !filters.tag || student.tags.includes(filters.tag);
      return matchKeyword && matchTag;
    });
  }, [students, filters]);

  const uploadProps = {
    accept: '.xlsx,.xls',
    showUploadList: false,
    beforeUpload: async (file: RcFile) => {
      try {
        await importStudentsFromXlsx(file);
        message.success('导入成功，已更新学生列表');
      } catch (error) {
        message.error(error instanceof Error ? error.message : '导入失败');
      }
      return false;
    },
  };

  return (
    <div className="glass-panel h-full p-4 flex flex-col gap-4">
      <div style={{ marginBottom: '8px' }}>
        <h3 className="text-lg font-semibold text-slate-900 mb-1" style={{ fontSize: '18px', lineHeight: '1.4', whiteSpace: 'normal', wordBreak: 'keep-all' }}>
          {summary.className}
        </h3>
        <p className="text-xs text-slate-500" style={{ fontSize: '14px' }}>{summary.genderRatio}</p>
      </div>

      <div className="grid grid-cols-2 gap-3" style={{ marginBottom: '8px' }}>
        <Card size="small" bordered={false} style={{ minWidth: 0, overflow: 'visible' }}>
          <Statistic 
            title="近视优先" 
            value={stats.nearSighted} 
            suffix="/人"
            valueStyle={{ fontSize: '20px' }}
            style={{ whiteSpace: 'normal' }}
          />
        </Card>
        <Card size="small" bordered={false} style={{ minWidth: 0, overflow: 'visible' }}>
          <Statistic 
            title="身高受限" 
            value={stats.lowHeight} 
            suffix="/人"
            valueStyle={{ fontSize: '20px' }}
            style={{ whiteSpace: 'normal' }}
          />
        </Card>
      </div>

      <Space direction="vertical" style={{ width: '100%' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddModalOpen(true)}
          block
        >
          添加学生
        </Button>
        
        <Button
          icon={<StarOutlined />}
          onClick={() => setBatchPointsOpen(true)}
          block
        >
          批量积分
        </Button>
        
        <Button
          icon={<SettingOutlined />}
          onClick={() => setCustomFieldsOpen(true)}
          block
        >
          自定义字段
        </Button>
      </Space>

      <Input.Search
        allowClear
        placeholder="搜索姓名/标签"
        value={filters.keyword}
        onChange={(event) => setFilterKeyword(event.target.value)}
      />
      <Select
        allowClear
        placeholder="选择标签高亮"
        value={filters.tag}
        options={tagOptions}
        onChange={(value) => setHighlightTag(value)}
      />

      <div className="flex items-center justify-between mt-2 mb-1">
        <span className="text-xs text-slate-500">批量导入</span>
        <Button 
          type="link" 
          size="small" 
          icon={<DownloadOutlined />} 
          onClick={handleDownloadTemplate}
          style={{ padding: 0, height: 'auto' }}
        >
          下载模板
        </Button>
      </div>

      <Upload.Dragger {...uploadProps} disabled={loading}>
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="ant-upload-text">拖拽或点击导入 Excel</p>
        <p className="ant-upload-hint text-xs">字段示例：姓名 / 性别 / 身高 / 视力 / 成绩</p>
      </Upload.Dragger>

      <Divider className="my-2" />

      <div className="flex-1 overflow-y-auto pr-2">
        <List
          itemLayout="horizontal"
          dataSource={filteredStudents}
          renderItem={(student) => (
            <DraggableStudentItem
              key={student.id}
              student={student}
              isActive={student.id === spotlightStudentId}
              onClick={() => setSpotlightStudent(student.id === spotlightStudentId ? undefined : student.id)}
              onDoubleClick={() => setEditingStudent(student)}
            />
          )}
        />
      </div>

      {/* 添加学生对话框 */}
      <AddStudentModal
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        onConfirm={(student, _targetSeatId) => {
          addStudent(student);
          const availableSeats = summary.availableSeats;
          const totalStudents = students.length + 1;
          if (totalStudents > availableSeats) {
            message.warning(`学生已添加，但座位不足！当前座位：${availableSeats}，学生数：${totalStudents}。建议增加行列数或运行智能排座。`);
          } else {
            message.success('学生已添加并自动分配到空座位');
          }
          // 注意：新增学生时不支持座位选择，因为还没有ID
        }}
      />

      {/* 编辑学生对话框 */}
      <AddStudentModal
        open={!!editingStudent}
        editingStudent={editingStudent}
        onCancel={() => setEditingStudent(null)}
        onConfirm={(studentData, targetSeatId) => {
          if (editingStudent) {
            updateStudent(editingStudent.id, studentData);
            
            // 如果指定了座位，更新座位分配
            if (targetSeatId) {
              const currentAssignment = assignments.find(a => a.studentId === editingStudent.id);
              const currentSeatId = currentAssignment?.seatId;
              
              if (currentSeatId && currentSeatId !== targetSeatId) {
                // 使用swapSeats交换座位
                swapSeats(currentSeatId, targetSeatId);
                message.success('学生信息和座位已更新');
              } else if (!currentSeatId) {
                // 当前没有座位，直接分配
                swapSeats('', targetSeatId); // 可能需要特殊处理
                message.success('学生信息和座位已更新');
              } else {
                message.success('学生信息已更新');
              }
            } else {
              message.success('学生信息已更新');
            }
            
            setEditingStudent(null);
          }
        }}
      />
      
      <CustomFieldsManager
        open={customFieldsOpen}
        onClose={() => setCustomFieldsOpen(false)}
      />
      
      <BatchPointsModal
        open={batchPointsOpen}
        onClose={() => setBatchPointsOpen(false)}
      />
    </div>
  );
};

// 内部可拖拽组件
const DraggableStudentItem = ({ student, isActive, onClick, onDoubleClick }: { 
  student: Student; 
  isActive: boolean; 
  onClick: () => void;
  onDoubleClick: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `student-list-${student.id}`,
    data: {
      type: 'sidebar-student',
      student,
    }
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <List.Item
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        style={{ cursor: 'grab' }}
        className={`transition-colors border-l-4 ${
          isActive 
            ? 'bg-blue-50 border-blue-500' 
            : 'hover:bg-slate-50 border-transparent'
        }`}
      >
        <List.Item.Meta
          avatar={<UserOutlined />}
          title={
            <Space size="small">
              <span>{student.name}</span>
              <Tag color={student.gender === 'male' ? 'blue' : 'magenta'}>
                {student.gender === 'male' ? '男' : '女'}
              </Tag>
            </Space>
          }
          description={
            <div style={{ overflow: 'visible' }}>
              <p className="text-xs text-slate-500" style={{ fontSize: '13px', lineHeight: '1.5', whiteSpace: 'normal', wordBreak: 'keep-all' }}>
                {student.height}cm · 视力 {student.vision} · 成绩 {student.score}
              </p>
              <p className="text-xs" style={{ color: '#1890ff', marginTop: '4px', fontSize: '13px', lineHeight: '1.5' }}>
                <StarOutlined /> 积分: <span style={{ fontWeight: 'bold' }}>{student.points}</span>
              </p>
              {student.tags.length > 0 && (
                <Space wrap size="small" className="mt-1" style={{ marginTop: '6px' }}>
                  {student.tags.map((tag: string) => (
                    <Tag key={tag} color="blue" className="text-xs" style={{ fontSize: '12px' }}>
                      {tag}
                    </Tag>
                  ))}
                </Space>
              )}
            </div>
          }
        />
      </List.Item>
    </div>
  );
};

export default StudentPanel;

