const SeatLegend = () => (
  <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
    <span className="flex items-center gap-1">
      <span className="h-3 w-3 rounded-sm bg-white border border-slate-300" /> 正常座位
    </span>
    <span className="flex items-center gap-1 text-red-500">
      <span className="h-3 w-3 rounded-sm bg-red-100 border border-red-400" /> 规则冲突
    </span>
    <span className="flex items-center gap-1 text-brand-500">
      <span className="h-3 w-3 rounded-sm border border-brand-500" /> 拖拽中 / 目标
    </span>
  </div>
);

export default SeatLegend;

