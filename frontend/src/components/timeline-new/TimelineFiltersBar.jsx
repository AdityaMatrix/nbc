import { Search, RotateCcw, Filter } from "lucide-react";

function Select({ value, options, onChange, allLabel }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 px-3 text-sm bg-slate-50 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-shadow"
    >
      <option value="all">{allLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export function TimelineFiltersBar({ filters, onChange, onReset, uniquePlants, fy, onFyChange }) {
  const STATUSES = ["Completed", "On Track", "In Progress", "At Risk", "Delayed", "Not Started"];
  const PRIORITIES = ["High", "Medium", "Low"];
  const FY_OPTIONS = ["2024-25", "2025-26", "2026-27"];

  return (
    <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b" style={{ borderColor: "var(--hairline)" }}>
      <div className="px-4 md:px-6 py-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search by PO number or project name…"
            className="w-full h-9 pl-9 pr-3 text-sm bg-slate-50 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <div className="flex items-center gap-2 text-slate-500 mr-1">
          <Filter className="w-4 h-4" />
        </div>

        {fy && onFyChange && (
          <Select value={fy} options={FY_OPTIONS} onChange={onFyChange} allLabel="All FY" />
        )}
        <Select value={filters.plant} options={uniquePlants || []} onChange={(v) => onChange({ plant: v })} allLabel="All Plants" />
        <Select value={filters.status} options={STATUSES} onChange={(v) => onChange({ status: v })} allLabel="All Status" />
        <Select value={filters.priority} options={PRIORITIES} onChange={(v) => onChange({ priority: v })} allLabel="All Priority" />

        <button
          onClick={onReset}
          className="h-9 px-4 inline-flex items-center gap-2 bg-slate-50 text-slate-700 text-sm font-medium rounded-md border border-slate-200 hover:bg-slate-100 transition active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>
    </header>
  );
}
