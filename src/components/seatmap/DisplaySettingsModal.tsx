import { Form, Slider, Switch } from 'antd';
import DraggableModal from '../common/DraggableModal';
import { useState, useEffect } from 'react';

export interface DisplaySettings {
  nameFontSize: number; // 姓名字体大小 (12-24)
  detailsFontSize: number; // 详细信息字体大小 (8-14)
  showStudentNumber: boolean; // 显示学号
  showGenderHeight: boolean; // 显示性别身高
  showVision: boolean; // 显示视力
  seatLabelSize: number; // 座位编号字体大小 (8-12)
}

type Props = {
  open: boolean;
  settings: DisplaySettings;
  onCancel: () => void;
  onConfirm: (settings: DisplaySettings) => void;
};

const DisplaySettingsModal = ({ open, settings, onCancel, onConfirm }: Props) => {
  const [form] = Form.useForm();
  const [previewSettings, setPreviewSettings] = useState<DisplaySettings>(settings);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(settings);
      setPreviewSettings(settings);
    }
  }, [open, settings, form]);

  const handleValuesChange = (_: any, allValues: DisplaySettings) => {
    setPreviewSettings(allValues);
  };

  const handleOk = () => {
    form.validateFields().then((values) => {
      onConfirm(values as DisplaySettings);
    });
  };

  const handleReset = () => {
    const defaultSettings: DisplaySettings = {
      nameFontSize: 16,
      detailsFontSize: 10,
      showStudentNumber: true,
      showGenderHeight: true,
      showVision: true,
      seatLabelSize: 9,
    };
    form.setFieldsValue(defaultSettings);
    setPreviewSettings(defaultSettings);
  };

  return (
    <DraggableModal
      title="显示设置"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      width={600}
      okText="保存"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={settings}
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold mb-3 text-slate-700">字体大小</h3>
            
            <Form.Item
              name="nameFontSize"
              label={`学生姓名字体大小 (${previewSettings.nameFontSize}px)`}
            >
              <Slider min={12} max={24} />
            </Form.Item>

            <Form.Item
              name="detailsFontSize"
              label={`详细信息字体大小 (${previewSettings.detailsFontSize}px)`}
            >
              <Slider min={8} max={14} />
            </Form.Item>

            <Form.Item
              name="seatLabelSize"
              label={`座位编号字体大小 (${previewSettings.seatLabelSize}px)`}
            >
              <Slider min={8} max={12} />
            </Form.Item>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold mb-3 text-slate-700">显示内容</h3>
            
            <Form.Item
              name="showStudentNumber"
              label="显示学号"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="showGenderHeight"
              label="显示性别和身高"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="showVision"
              label="显示视力"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              恢复默认设置
            </button>
          </div>
        </div>
      </Form>
    </DraggableModal>
  );
};

export default DisplaySettingsModal;
