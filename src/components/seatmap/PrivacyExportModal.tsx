import { useState } from 'react';
import { Radio, Select, message } from 'antd';
import type { Student } from '../../types/models';
import DraggableModal from '../common/DraggableModal';

type Mode = 'teacher' | 'group' | 'individual';

type Props = {
  open: boolean;
  students: Student[];
  onCancel: () => void;
  onConfirm: (payload: { mode: Mode; highlightStudentId?: string }) => void;
};

const PrivacyExportModal = ({ open, students, onCancel, onConfirm }: Props) => {
  const [mode, setMode] = useState<Mode>('teacher');
  const [studentId, setStudentId] = useState<string>();

  const handleOk = () => {
    if (mode === 'individual' && !studentId) {
      message.warning('请选择需要高亮的学生');
      return;
    }
    onConfirm({ 
      mode,
      highlightStudentId: mode === 'individual' ? studentId : undefined 
    });
  };

  return (
    <DraggableModal
      title="导出视角选择"
      open={open}
      onCancel={onCancel}
      afterClose={() => {
        setMode('teacher');
        setStudentId(undefined);
      }}
      onOk={handleOk}
      okText="确认导出"
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2 text-slate-700">请选择导出视角：</p>
          <Radio.Group 
            value={mode} 
            onChange={(event) => setMode(event.target.value)}
            className="w-full flex"
          >
            <Radio.Button value="teacher" className="flex-1 text-center">教师视角</Radio.Button>
            <Radio.Button value="group" className="flex-1 text-center">家长群版</Radio.Button>
            <Radio.Button value="individual" className="flex-1 text-center">学生个人版</Radio.Button>
          </Radio.Group>
        </div>

        {mode === 'individual' && (
          <div>
            <p className="text-sm font-medium mb-2 text-slate-700">选择要高亮的学生：</p>
            <Select
              showSearch
              placeholder="搜索或选择学生姓名..."
              options={students.map((student) => ({ label: student.name, value: student.id }))}
              value={studentId}
              onChange={setStudentId}
              style={{ width: '100%' }}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>
        )}

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p className="text-xs text-slate-500 leading-relaxed">
            {mode === 'teacher' && "💡 教师视角：导出完整的座位表信息，包括视力提醒、连座警告等所有标注。"}
            {mode === 'group' && "💡 家长群版：自动隐藏视力、成绩等敏感信息，仅保留姓名和座位位置，适合发在家长群。"}
            {mode === 'individual' && "💡 学生个人版：在隐私版的基础上，为选中的学生提供专属高亮提示，方便领书领座。"}
          </p>
        </div>
      </div>
    </DraggableModal>
  );
};

export default PrivacyExportModal;

