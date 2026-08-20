import { useEffect, useState, useRef } from 'react';
import { Layout, Typography, Button, Space, Tag, message, Spin, Tabs, Drawer, Modal, Slider, Popover, Tooltip } from 'antd';
import {
  ThunderboltOutlined,
  CloudDownloadOutlined,
  AreaChartOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  TableOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  GiftOutlined,
  TrophyOutlined,
  DownloadOutlined,
  UploadOutlined,
  ReadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import SeatBoard from './components/seatmap/SeatBoard';
import StudentPanel from './components/panels/StudentPanel';
import ClassroomPanel from './components/panels/ClassroomPanel';
import InsightPanel from './components/panels/InsightPanel';
import RulePanel from './components/panels/RulePanel';
import ConflictDrawer from './components/panels/ConflictDrawer';
import ClassSelector from './components/ClassSelector';
import SchedulePanel from './components/panels/SchedulePanel';
import HistoryPanel from './components/panels/HistoryPanel';
import StudentListPanel from './components/panels/StudentListPanel';
import PointsDashboard from './components/panels/PointsDashboard';
import RewardPanel from './components/panels/RewardPanel';
import PointsRankModal from './components/panels/PointsRankModal';
import ExamPanel from './components/panels/ExamPanel';
import { SystemResetModal } from './components/common/SystemResetModal';
import { useClassStore } from './store/useClassStore';
import { exportSeatPlanWorkbook } from './services/exporter';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { downloadBackup, readBackupFile } from './utils/backupHelper';

const { Header, Content, Sider } = Layout;

export default function App() {
  const [messageApi, contextHolder] = message.useMessage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const summary = useClassStore((state) => state.summary);
  const classList = useClassStore((state) => state.classList);
  const classId = useClassStore((state) => state.classId);
  const switchClass = useClassStore((state) => state.switchClass);
  const addNewClass = useClassStore((state) => state.addNewClass);
  const deleteClass = useClassStore((state) => state.deleteClass);
  const renameClass = useClassStore((state) => state.renameClass);
  const runAutoArrange = useClassStore((state) => state.runAutoArrange);
  const students = useClassStore((state) => state.students);
  const assignments = useClassStore((state) => state.assignments);
  const classroom = useClassStore((state) => state.classroom);
  const initialize = useClassStore((state) => state.initialize);
  const initialized = useClassStore((state) => state.initialized);
  const loading = useClassStore((state) => state.loading);
  const undo = useClassStore((state) => state.undo);
  const redo = useClassStore((state) => state.redo);
  const exportData = useClassStore((state) => state.exportData);
  const importData = useClassStore((state) => state.importData);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const [rankModalOpen, setRankModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'seatmap' | 'list' | 'schedule' | 'rewards' | 'points' | 'exams'>('seatmap');

  const selectionMode = useClassStore((state) => state.selectionMode);
  const selectedSeats = useClassStore((state) => state.selectedSeats);
  const moveBatchSeats = useClassStore((state) => state.moveBatchSeats);
  const swapSeats = useClassStore((state) => state.swapSeats);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // 增加距离以区别于点击定位
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overSeatId = over.id as string;

    // 检查是否是从列表拖入
    if (activeId.startsWith('student-list-')) {
      const studentId = activeId.replace('student-list-', '');
      const sourceAssignment = assignments.find(a => a.studentId === studentId);

      if (sourceAssignment) {
        // 学生已经在座位上，执行交换逻辑
        swapSeats(sourceAssignment.seatId, overSeatId);
        messageApi.success('已移动学生位置');
      } else {
        // 学生未入座，执行分配逻辑
        const newAssignments = assignments.map(a => {
          if (a.seatId === overSeatId) {
            return { ...a, studentId: studentId };
          }
          return a;
        });
        useClassStore.getState().batchUpdateAssignments(newAssignments);
        messageApi.success('已将学生拖入座位');
      }
      return;
    }

    // 地图内拖动
    if (selectionMode && selectedSeats.includes(activeId) && selectedSeats.length > 1) {
      moveBatchSeats(activeId, overSeatId, selectedSeats);
      messageApi.success(`已移动 ${selectedSeats.length} 个座位`);
    } else {
      swapSeats(activeId, overSeatId);
    }
  };

  // 全局缩放状态（默认75%）
  const [zoomScale, setZoomScale] = useState(0.75);
  const [manualZoomValue, setManualZoomValue] = useState(75);
  const [autoZoomEnabled] = useState(true); // Enable auto-zoom by default
  const lastAutoZoomValue = useRef<number>(75);

  // 判断当前视图是否允许缩放（仅座位图和学生一览）
  const isZoomAllowed = activeView === 'seatmap' || activeView === 'list';

  // 视图切换时重置缩放（如果切换到不支持缩放的视图）
  useEffect(() => {
    if (!isZoomAllowed) {
      // 切换到不支持缩放的视图时，临时重置为100%，但保留用户偏好
      if (manualZoomValue !== 100) {
        setManualZoomValue(100);
      }
    } else {
      // 切换回支持缩放的视图时，恢复用户偏好
      if (manualZoomValue !== lastAutoZoomValue.current) {
        setManualZoomValue(lastAutoZoomValue.current);
      }
    }
  }, [activeView, isZoomAllowed, manualZoomValue]);

  // 页面初次加载和视图切换时自动检测是否需要缩放（仅当开启自适应时）
  useEffect(() => {
    // 只有开启自适应缩放时才自动检测
    if (!isZoomAllowed || !autoZoomEnabled) return;

    const handleResize = () => {
      const baseWidth = 1366; // 基准宽度，基于常见笔记本分辨率
      // const baseHeight = 768; // 基准高度，暂时不作为强制约束，优先保证宽度适配

      const container = document.getElementById('app-container');
      if (!container) return;

      const currentWidth = window.innerWidth;
      
      // 计算比例
      // 逻辑：始终保证内容能放下（基于1366宽度），但最大缩放比例限制为 75%
      const ratio = currentWidth / baseWidth;
      const newScale = Math.max(30, Math.min(75, Math.floor(ratio * 100)));

      if (newScale !== lastAutoZoomValue.current) {
        lastAutoZoomValue.current = newScale;
        setManualZoomValue(newScale);
      }
    };

    // 立即执行一次
    handleResize();

    // 监听窗口大小变化
    let resizeTimer: any;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 200); // 稍微减少延迟，提升响应速度
    };
    window.addEventListener('resize', onResize);
    
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, [activeView, isZoomAllowed, autoZoomEnabled]);


  // 移除原来的复杂检测逻辑，合并到上面的 useEffect 中
  /*
  useEffect(() => {
    if (!autoZoomEnabled || !isZoomAllowed) return;
    
    const checkAndAutoZoom = () => {
       // ... logic removed ...
    };
    // ...
  }, ...); 
  */

  // 应用页面缩放（使用transform避免布局问题）
  useEffect(() => {
    setZoomScale(manualZoomValue / 100);
    const root = document.getElementById('app-container');
    if (root) {
      root.style.transform = `scale(${manualZoomValue / 100})`;
      root.style.transformOrigin = 'top left';
      // 调整容器宽高以适应缩放
      root.style.width = `${100 / (manualZoomValue / 100)}%`;
      root.style.height = `${100 / (manualZoomValue / 100)}%`;
    }
  }, [manualZoomValue]);

  // 组件卸载时恢复页面缩放
  useEffect(() => {
    return () => {
      const root = document.getElementById('app-container');
      if (root) {
        root.style.transform = 'scale(1)';
        root.style.width = '100%';
        root.style.height = '100%';
      }
    };
  }, []);

  // Ctrl+滚轮缩放功能（仅在允许的视图下）
  useEffect(() => {
    let zoomTimeout: any;
    
    const handleWheel = (e: WheelEvent) => {
      // 只在按住Ctrl键且允许缩放的视图下触发
      if (e.ctrlKey && isZoomAllowed) {
        e.preventDefault();
        
        // 根据滚轮方向调整缩放
        // deltaY > 0 表示向下滚动（缩小），< 0 表示向上滚动（放大）
        const delta = e.deltaY > 0 ? -5 : 5;
        const newValue = Math.max(30, Math.min(100, manualZoomValue + delta));
        
        // 只在值变化时更新
        if (newValue !== manualZoomValue) {
          // 更新缩放值和记录
          lastAutoZoomValue.current = newValue;
          setManualZoomValue(newValue);
          
          // 清除之前的提示延迟
          clearTimeout(zoomTimeout);
          
          // 延迟显示缩放提示（防止频繁提示）
          zoomTimeout = setTimeout(() => {
            // 不显示消息，只在缩放按钮上实时显示百分比
          }, 500);
        }
      }
    };

    // 添加事件监听，使用passive: false以允许preventDefault
    window.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
      clearTimeout(zoomTimeout);
    };
  }, [manualZoomValue, isZoomAllowed]);

  // 键盘快捷键
  useKeyboardShortcuts({ onUndo: undo, onRedo: redo });

  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async () => {
    try {
      await exportSeatPlanWorkbook(students, assignments, classroom);
      messageApi.success('导出成功，已生成 SeatPlan.xlsx');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '导出失败');
    }
  };

  const handleExportBackup = () => {
    try {
      const data = exportData();
      downloadBackup(data);
      messageApi.success('备份导出成功！');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '导出备份失败');
    }
  };

  const handleImportBackup = async (file: File) => {
    try {
      const data = await readBackupFile(file);
      
      Modal.confirm({
        title: '确认导入备份',
        content: (
          <div>
            <p>即将导入备份数据，这将覆盖当前所有数据。</p>
            <p className="text-slate-500 text-sm mt-2">
              备份时间：{data.exportedAt ? new Date(data.exportedAt).toLocaleString() : '未知'}
            </p>
            <p className="text-slate-500 text-sm">
              班级数量：{data.classList?.length || 0}
            </p>
            <p className="text-red-500 text-sm mt-2 font-bold">
              ⚠️ 此操作不可撤销，请确认当前数据已备份！
            </p>
          </div>
        ),
        okText: '确认导入',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: () => {
          try {
            importData(data);
            messageApi.success('备份导入成功！页面即将刷新...');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } catch (error) {
            messageApi.error(error instanceof Error ? error.message : '导入备份失败');
          }
        },
      });
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '读取备份文件失败');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportBackup(file);
      // 清空input，允许重复选择同一个文件
      e.target.value = '';
    }
  };

  return (
    <div id="app-container" style={{ 
      transformOrigin: 'top left',
      width: '100%',
      height: '100%',
      overflow: 'visible',
    }}>
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      {contextHolder}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <Sider
        width={320}
        style={{ background: 'transparent', padding: '16px 16px 16px 16px', minWidth: '320px' }}
      >
        <StudentPanel />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '16px 24px 20px 24px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            height: 'auto',
            minHeight: '110px',
            flexWrap: 'wrap',
            gap: '16px',
            overflow: 'visible',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px', 
            minWidth: '300px', 
            flex: '1 1 auto',
            overflow: 'visible',
            position: 'relative',
            zIndex: 20,
          }}>
            <Typography.Title level={4} style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'visible', lineHeight: '1.5' }}>
              智能班级座位管理
            </Typography.Title>
            <Space size="middle" wrap style={{ overflow: 'visible', position: 'relative', zIndex: 12 }}>
              <ClassSelector
                currentClassId={classId}
                classes={classList}
                onClassChange={switchClass}
                onClassCreate={addNewClass}
                onClassDelete={deleteClass}
                onClassRename={renameClass}
              />
              <Tag color="blue">学生 {summary.totalStudents} 人</Tag>
              <Tag color="green">座位 {summary.availableSeats} 个</Tag>
            </Space>
          </div>
          <Space wrap style={{ flexShrink: 0, overflow: 'visible', position: 'relative', zIndex: 11, alignItems: 'flex-start', paddingTop: '4px' }}>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={runAutoArrange}
            >
              智能排座
            </Button>
            <Button icon={<ExclamationCircleOutlined />} onClick={() => setConflictOpen(true)}>
              冲突诊断
            </Button>
            <Button icon={<AreaChartOutlined />} onClick={() => setInsightOpen(true)}>
              公平性报告
            </Button>
            <Button icon={<TrophyOutlined />} onClick={() => setRankModalOpen(true)}>
              积分排行榜
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportBackup}>
              导出备份
            </Button>
            <Button icon={<UploadOutlined />} onClick={triggerFileInput}>
              导入备份
            </Button>
            <Button icon={<CloudDownloadOutlined />} onClick={handleExport}>
              导出方案
            </Button>
            <Button icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)}>
              操作历史
            </Button>
            <Button 
              icon={<SettingOutlined />} 
              onClick={() => setResetModalOpen(true)}
              danger
            >
              系统重置
            </Button>
            
            {/* 全局缩放控制（仅在座位图和学生一览视图下显示） */}
            {isZoomAllowed && (
            <Popover
              content={
                <div className="w-64 p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">缩放比例</span>
                    <span className="text-xs text-slate-500">{Math.round(zoomScale * 100)}%</span>
                  </div>
                  <Slider
                    min={30}
                    max={100}
                    value={manualZoomValue}
                    onChange={(value) => {
                      lastAutoZoomValue.current = value;
                      setManualZoomValue(value);
                    }}
                    marks={{
                      30: '30%',
                      50: '50%',
                      75: '75%',
                      100: '100%',
                    }}
                  />
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex gap-2">
                      <Button
                        size="small"
                        icon={<ZoomOutOutlined />}
                        onClick={() => {
                          const newValue = Math.max(30, manualZoomValue - 10);
                          lastAutoZoomValue.current = newValue;
                          setManualZoomValue(newValue);
                        }}
                      >
                        缩小
                      </Button>
                      <Button
                        size="small"
                        icon={<ZoomInOutlined />}
                        onClick={() => {
                          const newValue = Math.min(100, manualZoomValue + 10);
                          lastAutoZoomValue.current = newValue;
                          setManualZoomValue(newValue);
                        }}
                      >
                        放大
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          lastAutoZoomValue.current = 75;
                          setManualZoomValue(75);
                        }}
                      >
                        重置(75%)
                      </Button>
                    </div>
                    <div className="text-xs text-slate-400 text-center mt-1">
                      💡 按住 Ctrl + 滚轮 可快速缩放
                    </div>
                  </div>
                </div>
              }
              title="页面缩放"
              trigger="click"
              placement="bottomRight"
            >
              <Tooltip title="页面缩放">
                <Button 
                  size="small"
                >
                  {Math.round(zoomScale * 100)}%
                </Button>
              </Tooltip>
            </Popover>
            )}
          </Space>
        </Header>
        <Content style={{ padding: 0, background: '#f4f6fb', marginTop: '0' }}>
          <Spin spinning={!initialized && loading}>
            {/* 视图切换标签 */}
            <div className="bg-white px-4 border-b" style={{ overflow: 'visible', paddingTop: '8px', position: 'relative', zIndex: 1 }}>
              <Tabs
                activeKey={activeView}
                onChange={(key) => setActiveView(key as 'seatmap' | 'list' | 'schedule' | 'rewards' | 'points' | 'exams')}
                style={{ minHeight: '46px' }}
                items={[
                  {
                    key: 'seatmap',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <AppstoreOutlined style={{ fontSize: '16px' }} />
                        <span>座位图</span>
                      </span>
                    ),
                  },
                  {
                    key: 'list',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <TableOutlined style={{ fontSize: '16px' }} />
                        <span>学生一览</span>
                      </span>
                    ),
                  },
                  {
                    key: 'schedule',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <CalendarOutlined style={{ fontSize: '16px' }} />
                        <span>课程表</span>
                      </span>
                    ),
                  },
                  {
                    key: 'rewards',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <GiftOutlined style={{ fontSize: '16px' }} />
                        <span>奖励商城</span>
                      </span>
                    ),
                  },
                  {
                    key: 'points',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <TrophyOutlined style={{ fontSize: '16px' }} />
                        <span>积分管理</span>
                      </span>
                    ),
                  },
                  {
                    key: 'exams',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <ReadOutlined style={{ fontSize: '16px' }} />
                        <span>考试成绩</span>
                      </span>
                    ),
                  },
                ]}
              />
            </div>

            {/* 内容区域 */}
            {activeView === 'seatmap' ? (
              <div className="p-4">
                <div className="grid gap-4 2xl:grid-cols-[2.2fr_0.8fr]">
                  <SeatBoard />
                  <div className="flex flex-col gap-4">
                    <ClassroomPanel />
                    <RulePanel />
                  </div>
                </div>
              </div>
            ) : activeView === 'list' ? (
              <div style={{ height: 'calc(100vh - 180px)' }}>
                <StudentListPanel />
              </div>
            ) : activeView === 'rewards' ? (
              <div style={{ height: 'calc(100vh - 180px)', overflow: 'auto' }}>
                <RewardPanel />
              </div>
            ) : activeView === 'points' ? (
              <div style={{ height: 'calc(100vh - 180px)', overflow: 'auto' }}>
                <PointsDashboard />
              </div>
            ) : activeView === 'exams' ? (
              <div style={{ height: 'calc(100vh - 180px)', overflow: 'auto' }}>
                <ExamPanel />
              </div>
            ) : (
              <div className="p-4">
                <SchedulePanel />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>
      <ConflictDrawer open={conflictOpen} onClose={() => setConflictOpen(false)} />
      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
      
      <Drawer
        title="规则与公平洞察"
        placement="right"
        width={400}
        onClose={() => setInsightOpen(false)}
        open={insightOpen}
      >
        <InsightPanel />
      </Drawer>

      <PointsRankModal open={rankModalOpen} onClose={() => setRankModalOpen(false)} />
      <SystemResetModal open={resetModalOpen} onClose={() => setResetModalOpen(false)} />
    </Layout>
    </DndContext>
    </div>
  );
}

