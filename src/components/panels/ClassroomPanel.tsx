import { useState } from 'react';
import {
  Card,
  Divider,
  InputNumber,
  Statistic,
  Button,
  Select,
  Switch,
  Modal,
  Input,
  Space,
  Tag,
  Tooltip,
  message,
} from 'antd';
import { MinusOutlined, PlusOutlined, EditOutlined, SaveOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useClassStore } from '../../store/useClassStore';

const ClassroomPanel = () => {
  const [msgApi, contextHolder] = message.useMessage();
  const classroom = useClassStore((state) => state.classroom);
  const setClassroomDimensions = useClassStore((state) => state.setClassroomDimensions);
  const setStagePosition = useClassStore((state) => state.setStagePosition);
  const summary = useClassStore((state) => state.summary);
  const seatSchemes = useClassStore((state) => state.seatSchemes);
  const saveSeatScheme = useClassStore((state) => state.saveSeatScheme);
  const applySeatScheme = useClassStore((state) => state.applySeatScheme);
  const deleteSeatScheme = useClassStore((state) => state.deleteSeatScheme);
  const renameSeatScheme = useClassStore((state) => state.renameSeatScheme);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [schemeName, setSchemeName] = useState('');
  const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // 检测讲台位置
  const stageCell = classroom.cells.find(cell => cell.type === 'stage');
  const hasStage = !!stageCell;
  let stagePosition: 'top' | 'bottom' | 'left' | 'right' | null = null;
  
  if (stageCell) {
    if (stageCell.row === 1) stagePosition = 'top';
    else if (stageCell.row === classroom.rows) stagePosition = 'bottom';
    else if (stageCell.col === 1) stagePosition = 'left';
    else if (stageCell.col === classroom.cols) stagePosition = 'right';
  }

  // 计算实际学生座位的行数和列数（排除讲台）
  const displayRows = hasStage && (stagePosition === 'top' || stagePosition === 'bottom') 
    ? classroom.rows - 1 
    : classroom.rows;
  const displayCols = hasStage && (stagePosition === 'left' || stagePosition === 'right') 
    ? classroom.cols - 1 
    : classroom.cols;

  const handleRowChange = (delta: number) => {
    const newRows = Math.max(1, classroom.rows + delta);
    setClassroomDimensions(newRows, classroom.cols);
  };

  const handleColChange = (delta: number) => {
    const newCols = Math.max(1, classroom.cols + delta);
    
    // 如果是按列分组模式，检查是否需要自动添加新组
    if (classroom.groupMode === 'column' && classroom.groupSizes && classroom.groupSizes.length > 0) {
      const defaultGroupSize = classroom.groupSize || 2;
      
      // 计算当前所有分组能容纳的总列数（不再受间距干扰）
      const currentCapacity = classroom.groupSizes.reduce((sum, size) => sum + size, 0);
      
      // 如果新列数超过当前容量，自动添加新组
      if (newCols > currentCapacity) {
        const newGroupSizes = [...classroom.groupSizes];
        
        // 计算需要添加几个组
        let remainingCols = newCols - currentCapacity;
        while (remainingCols > 0) {
          newGroupSizes.push(Math.min(defaultGroupSize, remainingCols));
          remainingCols -= defaultGroupSize;
        }
        
        const extraConfig = {
          groupSizes: newGroupSizes,
        };
        setClassroomDimensions(classroom.rows, newCols, extraConfig);
        return;
      }
    }
    
    setClassroomDimensions(classroom.rows, newCols);
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-4">
      {/* 标题 */}
      <h3 className="text-base font-semibold text-slate-900">🛠️ 排座工具</h3>
      
      {/* 统计信息 */}
      <div className="grid grid-cols-2 gap-3">
        <Card size="small" bordered={false}>
          <Statistic title="总座位" value={summary.availableSeats} />
        </Card>
        <Card size="small" bordered={false}>
          <Statistic title="网格" value={`${displayRows} × ${displayCols}`} />
        </Card>
      </div>

      {/* 座位表方案管理 */}
      <Card
        size="small"
        title={<span className="text-sm font-medium"><AppstoreOutlined /> 座位方案</span>}
        bordered
        className="shadow-sm"
        extra={
          <Button
            size="small"
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => {
              setSchemeName('');
              setSaveModalOpen(true);
            }}
          >
            保存当前
          </Button>
        }
      >
        {seatSchemes.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-3">
            暂无保存的方案，点击"保存当前"开始
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {seatSchemes.map((scheme) => (
              <div
                key={scheme.id}
                className="flex items-center gap-2 p-2 bg-slate-50 rounded border hover:bg-blue-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  {editingSchemeId === scheme.id ? (
                    <Input
                      size="small"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => {
                        if (editingName.trim()) {
                          renameSeatScheme(scheme.id, editingName.trim());
                        }
                        setEditingSchemeId(null);
                      }}
                      onPressEnter={() => {
                        if (editingName.trim()) {
                          renameSeatScheme(scheme.id, editingName.trim());
                        }
                        setEditingSchemeId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <>
                      <div className="text-xs font-medium text-slate-700 truncate">{scheme.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Tag color={{
                          'column': 'blue',
                          'custom': 'green',
                          'none': 'default',
                        }[scheme.classroom.groupMode || 'none']} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                          {{
                            'column': '按列分组',
                            'custom': '自由分组',
                            'none': '不分组',
                          }[scheme.classroom.groupMode || 'none']}
                        </Tag>
                        <span className="text-[10px] text-slate-400">
                          {scheme.classroom.rows}×{scheme.classroom.cols}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <Space size={2}>
                  <Tooltip title="切换到该方案">
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      onClick={() => {
                        Modal.confirm({
                          title: '切换座位方案',
                          content: `确定要切换到方案「${scheme.name}」吗？当前未保存的布局修改将会丢失。`,
                          okText: '确认切换',
                          cancelText: '取消',
                          onOk: () => {
                            applySeatScheme(scheme.id);
                            msgApi.success(`已切换到方案「${scheme.name}」`);
                          },
                        });
                      }}
                    >
                      切换
                    </Button>
                  </Tooltip>
                  <Tooltip title="重命名">
                    <Button
                      size="small"
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => {
                        setEditingSchemeId(scheme.id);
                        setEditingName(scheme.name);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="删除方案">
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        Modal.confirm({
                          title: '删除方案',
                          content: `确定要删除方案「${scheme.name}」吗？此操作不可撤销。`,
                          okText: '删除',
                          okButtonProps: { danger: true },
                          cancelText: '取消',
                          onOk: () => {
                            deleteSeatScheme(scheme.id);
                            msgApi.success('方案已删除');
                          },
                        });
                      }}
                    />
                  </Tooltip>
                </Space>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 保存方案弹窗 */}
      <Modal
        title="📁 保存座位方案"
        open={saveModalOpen}
        onOk={() => {
          if (!schemeName.trim()) {
            msgApi.warning('请输入方案名称');
            return;
          }
          saveSeatScheme(schemeName.trim());
          setSaveModalOpen(false);
          setSchemeName('');
          msgApi.success(`方案「${schemeName.trim()}」已保存`);
        }}
        onCancel={() => {
          setSaveModalOpen(false);
          setSchemeName('');
        }}
        okText="保存"
        cancelText="取消"
        width={400}
      >
        <div className="py-2">
          <div className="text-xs text-slate-500 mb-2">
            将当前的教室布局、分组设置和座位分配保存为一个方案。
          </div>
          <Input
            placeholder="请输入方案名称，如“日常排座”、“考试模式”"
            value={schemeName}
            onChange={(e) => setSchemeName(e.target.value)}
            onPressEnter={() => {
              if (schemeName.trim()) {
                saveSeatScheme(schemeName.trim());
                setSaveModalOpen(false);
                setSchemeName('');
                msgApi.success(`方案「${schemeName.trim()}」已保存`);
              }
            }}
            autoFocus
          />
          <div className="mt-3 text-xs text-slate-400">
            当前布局：{classroom.rows}×{classroom.cols}
            {classroom.groupMode && classroom.groupMode !== 'none' && (
              <Tag className="ml-1" color="blue" style={{ fontSize: 10 }}>
                {classroom.groupMode === 'column' ? '按列分组' : '自由分组'}
              </Tag>
            )}
          </div>
        </div>
      </Modal>

      {contextHolder}

      {/* 教室布局 */}
      <Card 
        size="small" 
        title={<span className="text-sm font-medium">📐 教室布局</span>}
        bordered
        className="shadow-sm"
      >
        <div className="space-y-4">
          {/* 行数 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">行数：</span>
            <div className="flex items-center gap-3">
              <Button 
                size="small" 
                icon={<MinusOutlined />} 
                onClick={() => handleRowChange(-1)}
                disabled={classroom.rows <= 1}
              />
              <span className="text-base font-semibold w-10 text-center">{displayRows}</span>
              <Button 
                size="small" 
                icon={<PlusOutlined />} 
                onClick={() => handleRowChange(1)}
              />
            </div>
          </div>

          {/* 列数 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">列数：</span>
            <div className="flex items-center gap-3">
              <Button 
                size="small" 
                icon={<MinusOutlined />} 
                onClick={() => handleColChange(-1)}
                disabled={classroom.cols <= 1}
              />
              <span className="text-base font-semibold w-10 text-center">{displayCols}</span>
              <Button 
                size="small" 
                icon={<PlusOutlined />} 
                onClick={() => handleColChange(1)}
              />
            </div>
          </div>

          <Divider className="my-2" />

          {/* 讲台位置 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-600">讲台位置：</span>
              <Select
                size="small"
                style={{ width: 120 }}
                value={stagePosition || 'none'}
                options={[
                  { label: '无', value: 'none' },
                  { label: '上方', value: 'top' },
                  { label: '下方', value: 'bottom' },
                  { label: '左侧', value: 'left' },
                  { label: '右侧', value: 'right' },
                ]}
                onChange={(value) => setStagePosition(value as 'none' | 'top' | 'bottom' | 'left' | 'right')}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              💡 设置讲台会自动增加一行/列，讲台始终居中
            </p>
          </div>

          <Divider className="my-2" />

          {/* 分组设置 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-600">分组模式：</span>
              <Select
                size="small"
                style={{ width: 120 }}
                value={classroom.groupMode || 'none'}
                options={[
                  { label: '不分组', value: 'none' },
                  { label: '按列分组', value: 'column' },
                  { label: '自由分组', value: 'custom' },
                ]}
                onChange={(value) => {
                  console.log('🔵 分组模式变更:', value);
                  const mode = value as 'none' | 'column' | 'custom';
                  
                  let extraConfig: any = {
                    groupMode: mode,
                  };
                  
                  if (mode === 'column') {
                    // 如果已经有按列分组的配置，则保留它，不重新初始化
                    if (classroom.groupSizes && classroom.groupSizes.length > 0) {
                      extraConfig = {
                        groupMode: mode,
                      };
                    } else {
                      const defaultGroupSize = classroom.groupSize || 2;
                      const groupGapValue = 0;
                      
                      // 计算应该有多少组
                      const estimatedGroupCount = Math.ceil(classroom.cols / defaultGroupSize);
                      
                      // 初始化groupSizes数组
                      const initialGroupSizes = Array(estimatedGroupCount).fill(defaultGroupSize);
                      
                      extraConfig = {
                        ...extraConfig,
                        groupSize: defaultGroupSize,
                        groupGap: groupGapValue,
                        groupSizes: initialGroupSizes,
                      };
                    }
                  } else {
                    // 切换到其他模式时不再清除配置，实现“记忆”功能
                    extraConfig = {
                      groupMode: mode,
                    };
                  }
                  
                  console.log('🔵 extraConfig:', extraConfig);
                  setClassroomDimensions(classroom.rows, classroom.cols, extraConfig);
                  console.log('🔵 setClassroomDimensions 已调用');
                }}
              />
            </div>
            {classroom.groupMode === 'column' && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">默认每组列数：</span>
                  <InputNumber
                    size="small"
                    min={1}
                    max={classroom.cols}
                    value={classroom.groupSize || 2}
                    style={{ width: 60 }}
                    onChange={(value) => {
                      const extraConfig = {
                        groupSize: value || 2,
                      };
                      setClassroomDimensions(classroom.rows, classroom.cols, extraConfig);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">分组间距：</span>
                  <InputNumber
                    size="small"
                    min={0}
                    max={10}
                    value={classroom.groupGap || 0}
                    style={{ width: 60 }}
                    onChange={(value) => {
                      const extraConfig = {
                        groupGap: value || 0,
                      };
                      setClassroomDimensions(classroom.rows, classroom.cols, extraConfig);
                    }}
                  />
                </div>
                
                {/* 每组自定义列数 */}
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-slate-600 font-medium">📊 自定义每组列数：</div>
                    {(() => {
                    const groupSizes = classroom.groupSizes || [];
                    const usedCols = groupSizes.reduce((sum, size) => sum + size, 0);
                      const remainingCols = classroom.cols - usedCols;
                      return (
                        <span className={`text-xs ${remainingCols < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                          已用 {usedCols}/{classroom.cols} 列
                        </span>
                      );
                    })()}
                  </div>
                  {(() => {
                    const groupSizes = classroom.groupSizes || [];
                    const defaultGroupSize = classroom.groupSize || 2;
                    
                    // 如果groupSizes为空，根据总列数计算应该有多少组
                    const estimatedGroupCount = groupSizes.length > 0 
                      ? groupSizes.length 
                      : Math.ceil(classroom.cols / defaultGroupSize);
                    const actualGroupCount = Math.max(estimatedGroupCount, 1);
                    
                    return (
                      <>
                        {Array.from({ length: actualGroupCount }).map((_, index) => (
                          <div key={index} className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-500 w-12">第{index + 1}组:</span>
                            <InputNumber
                              size="small"
                              min={1}
                              max={classroom.cols}
                              value={groupSizes[index] || defaultGroupSize}
                              style={{ width: 60 }}
                              onChange={(value) => {
                                const newGroupSizes = [...(classroom.groupSizes || Array(actualGroupCount).fill(defaultGroupSize))];
                                newGroupSizes[index] = value || defaultGroupSize;
                                const extraConfig = {
                                  groupSizes: newGroupSizes,
                                };
                                setClassroomDimensions(classroom.rows, classroom.cols, extraConfig);
                              }}
                            />
                            <span className="text-xs text-slate-400">列</span>
                            {actualGroupCount > 1 && (
                              <button
                                className="text-xs text-red-500 hover:text-red-700"
                                onClick={() => {
                                  // 如果groupSizes为空，先初始化
                                  const currentGroupSizes = classroom.groupSizes && classroom.groupSizes.length > 0
                                    ? classroom.groupSizes
                                    : Array(actualGroupCount).fill(defaultGroupSize);
                                  const newGroupSizes = currentGroupSizes.filter((_, i) => i !== index);
                                  const extraConfig = {
                                    groupSizes: newGroupSizes.length > 0 ? newGroupSizes : undefined,
                                  };
                                  setClassroomDimensions(classroom.rows, classroom.cols, extraConfig);
                                }}
                              >
                                删除
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                          onClick={() => {
                            // 如果groupSizes为空，先初始化为当前的actualGroupCount个组
                            const currentGroupSizes = classroom.groupSizes && classroom.groupSizes.length > 0
                              ? classroom.groupSizes
                              : Array(actualGroupCount).fill(defaultGroupSize);
                            const newGroupSizes = [...currentGroupSizes];
                            newGroupSizes.push(defaultGroupSize);
                            const extraConfig = {
                              groupSizes: newGroupSizes,
                            };
                            setClassroomDimensions(classroom.rows, classroom.cols, extraConfig);
                          }}
                        >
                          + 添加新组
                        </button>
                      </>
                    );
                  })()}
                </div>

                {/* 组内分小组设置 */}
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600 font-medium">组内分小组：</span>
                    <Switch 
                      size="small" 
                      checked={!!classroom.subGroupRows}
                      onChange={(checked) => {
                        setClassroomDimensions(classroom.rows, classroom.cols, { 
                          subGroupRows: checked ? 2 : undefined 
                        });
                      }}
                    />
                  </div>
                  {classroom.subGroupRows && (
                    <div className="flex items-center justify-between mb-1 pl-2">
                      <span className="text-xs text-slate-500">每几行一组：</span>
                      <InputNumber
                        size="small"
                        min={1}
                        max={classroom.rows}
                        value={classroom.subGroupRows}
                        style={{ width: 60 }}
                        onChange={(value) => {
                          setClassroomDimensions(classroom.rows, classroom.cols, { 
                            subGroupRows: value || undefined 
                          });
                        }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    💡 开启后将大组内的座位按行划分为小组
                  </p>
                </div>
              </div>
            )}
            
            {/* 自由分组管理 */}
            {(classroom.groupMode === 'custom' || classroom.groupMode === 'column') && (
              <div className="mt-2 space-y-2">
                <div className="border-t pt-2">
                  <div className="text-xs text-slate-600 mb-2 font-medium flex items-center justify-between">
                    <span>🎨 自由分组管理（可作为小组）：</span>
                    <button
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={() => {
                        // 触发自定义事件，通知SeatBoard进入创建分组模式
                        window.dispatchEvent(new Event('start-creating-group'));
                      }}
                    >
                      ＋ 创建分组
                    </button>
                  </div>
                  
                  {/* 分组列表 */}
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {(classroom.customGroups || []).map((group) => (
                      <div key={group.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded border">
                        <span className="text-xs font-medium text-slate-700 flex-1">
                          {group.name} ({group.seatIds.length}个座位)
                        </span>
                        <button
                          className="text-xs text-blue-500 hover:text-blue-700 mr-1"
                          title="编辑分组"
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('edit-group', { detail: group }));
                          }}
                        >
                          <EditOutlined />
                        </button>
                        <button
                          className="text-xs text-red-500 hover:text-red-700"
                          onClick={() => {
                            const newGroups = (classroom.customGroups || []).filter(g => g.id !== group.id);
                            setClassroomDimensions(classroom.rows, classroom.cols, { customGroups: newGroups });
                          }}
                        >
                          删除
                        </button>
                      </div>
                    ))}
                    {(!classroom.customGroups || classroom.customGroups.length === 0) && (
                      <div className="text-xs text-slate-400 text-center py-4">
                        暂无分组，点击"创建分组"开始
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-xs text-slate-400 mt-1">
              💡 分组后各组之间有间隔，便于管理
            </p>
          </div>

          {/* 讲台对齐设置 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-600">讲台对齐：</span>
              <Select
                size="small"
                style={{ width: 120 }}
                value={classroom.stageAlign || 'center'}
                options={[
                  { label: '左对齐', value: 'left' },
                  { label: '居中', value: 'center' },
                  { label: '右对齐', value: 'right' },
                ]}
                onChange={(value) => {
                  console.log('🔵 讲台对齐变更:', value);
                  const extraConfig = {
                    stageAlign: value as 'left' | 'center' | 'right',
                  };
                  setClassroomDimensions(classroom.rows, classroom.cols, extraConfig);
                }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              💡 调整讲台在分组模式下的显示位置
            </p>
          </div>

          {/* 讲台左右座位开关 */}
          {(stagePosition === 'top' || stagePosition === 'bottom') && (
            <div className="mt-3 border-t pt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-600">左右护法座位：</span>
                <Switch
                  size="small"
                  checked={classroom.showStageSideSeats || false}
                  onChange={(checked) => {
                    const extraConfig = {
                      showStageSideSeats: checked,
                    };
                    setClassroomDimensions(classroom.rows, classroom.cols, extraConfig);
                  }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                💡 开启后可在讲台左右两侧安排座位
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ClassroomPanel;

