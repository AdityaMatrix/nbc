import { Search, Download, SlidersHorizontal } from "lucide-react";

const PERIODS = ["Daily", "Monthly", "Quarterly"];

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

export function FiltersBar({
  selectedFY, setSelectedFY,
  timeGranularity, setTimeGranularity,
  plantFilter, setPlantFilter, uniquePlants,
  deptFilter, setDeptFilter, uniqueDepts,
  supplierFilter, setSupplierFilter, uniqueSuppliers,
  poSearch, setPoSearch,
  onExport,
}) {
  return (
    <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b" style={{ borderColor: "var(--hairline)" }}>
      <div className="px-4 md:px-6 py-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-slate-500 mr-1">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-widest hidden lg:inline">
            Filters
          </span>
        </div>

        <select
          value={selectedFY}
          onChange={(e) => setSelectedFY(e.target.value)}
          className="h-9 px-3 text-sm font-medium bg-slate-50 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          {["2024-25", "2025-26", "2026-27"].map((y) => (
            <option key={y} value={y}>FY {y}</option>
          ))}
        </select>

        <div className="flex gap-1 p-1 bg-slate-50 rounded-md border border-slate-200">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setTimeGranularity(p.toLowerCase())}
              className={
                "px-3 py-1 text-xs font-medium rounded transition-colors " +
                (timeGranularity === p.toLowerCase()
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700")
              }
            >
              {p}
            </button>
          ))}
        </div>

        <Select value={plantFilter} options={uniquePlants} onChange={setPlantFilter} allLabel="All Plants" />
        <Select value={deptFilter} options={uniqueDepts} onChange={setDeptFilter} allLabel="All Departments" />
        <Select value={supplierFilter} options={uniqueSuppliers} onChange={setSupplierFilter} allLabel="All Suppliers" />

        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={poSearch}
            onChange={(e) => setPoSearch(e.target.value)}
            placeholder="Search PO number…"
            className="w-full h-9 pl-9 pr-3 text-sm bg-slate-50 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <button
          onClick={onExport}
          className="h-9 px-4 inline-flex items-center gap-2 text-sm font-medium rounded-md shadow-sm hover:brightness-110 transition active:scale-95"
          style={{ backgroundColor: "var(--brand)", color: "var(--brand-foreground)" }}
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
    </header>
  );
}
