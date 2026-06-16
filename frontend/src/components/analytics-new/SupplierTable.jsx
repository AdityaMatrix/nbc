import { useMemo, useState } from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { formatINR } from "@/lib/capexHelpers";

const COLUMNS = [
  { key: "name", label: "Supplier", align: "left" },
  { key: "spend", label: "Total Spend", align: "right" },
  { key: "orders", label: "POs", align: "right" },
  { key: "ontimePercent", label: "On-Time %", align: "center" },
  { key: "savings", label: "Savings", align: "right" },
];

const STATUS_STYLES = {
  Strategic: { bg: "var(--brand-soft)", color: "var(--brand)" },
  Core: { bg: "rgba(0,0,0,0.04)", color: "#64748b" },
  "Under Review": { bg: "rgba(217,119,6,0.1)", color: "var(--warn)" },
};

function getSupplierStatus(onTimePct) {
  if (onTimePct >= 95) return "Strategic";
  if (onTimePct >= 82) return "Core";
  return "Under Review";
}

export function SupplierTable({ rows }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("spend");
  const [dir, setDir] = useState("desc");

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((r) => r.name.toLowerCase().includes(q));
    const mult = dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * mult;
      const aVal = sortKey === "savings" ? Math.max(0, a.initial - a.spend) : (a[sortKey] ?? 0);
      const bVal = sortKey === "savings" ? Math.max(0, b.initial - b.spend) : (b[sortKey] ?? 0);
      return (aVal - bVal) * mult;
    });
  }, [rows, query, sortKey, dir]);

  function toggleSort(key) {
    if (key === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setDir(key === "name" ? "asc" : "desc"); }
  }

  return (
    <section className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: "inset 0 0 0 1px var(--hairline)" }}>
      <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--hairline)" }}>
        <div>
          <h3 className="text-sm font-semibold">Supplier Analytics</h3>
          <p className="text-xs text-slate-500">Spend distribution & performance overview</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search supplier…"
            className="h-9 w-56 pl-9 pr-3 text-sm bg-slate-50 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[640px]">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              <th className="px-5 py-3 w-10">#</th>
              {COLUMNS.map((c) => {
                const isActive = c.key === sortKey;
                const Icon = !isActive ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={c.key}
                    className={
                      "px-5 py-3 " +
                      (c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left")
                    }
                  >
                    <button
                      onClick={() => toggleSort(c.key)}
                      className={
                        "inline-flex items-center gap-1 hover:text-slate-700 transition-colors " +
                        (isActive ? "text-slate-700 " : "") +
                        (c.align === "right" ? "flex-row-reverse" : "")
                      }
                    >
                      {c.label}
                      <Icon className="w-3 h-3" />
                    </button>
                  </th>
                );
              })}
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm" style={{ "--tw-divide-opacity": 1, borderColor: "var(--hairline)" }}>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                  No suppliers found
                </td>
              </tr>
            ) : (
              sorted.map((r, i) => {
                const savings = Math.max(0, (r.initial || 0) - r.spend);
                const onTimePct = r.ontimePercent ?? (r.totalDeliveries > 0 ? Math.round((r.ontimeCount / r.totalDeliveries) * 100) : null);
                const status = onTimePct != null ? getSupplierStatus(onTimePct) : "Core";
                const statusStyle = STATUS_STYLES[status];
                return (
                  <tr key={r.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-slate-400 tabular">{i + 1}</td>
                    <td className="px-5 py-3 font-medium">{r.name}</td>
                    <td className="px-5 py-3 text-right tabular">{formatINR(r.spend)}</td>
                    <td className="px-5 py-3 text-right tabular text-slate-500">{r.orders}</td>
                    <td className="px-5 py-3">
                      {onTimePct != null ? (
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className="tabular text-xs"
                            style={{ color: onTimePct >= 95 ? "var(--brand)" : onTimePct >= 82 ? "#334155" : "var(--warn)" }}
                          >
                            {onTimePct}%
                          </span>
                          <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${onTimePct}%`,
                                backgroundColor: onTimePct >= 82 ? "var(--brand)" : "var(--warn)",
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-center block text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right tabular font-medium" style={{ color: "var(--brand)" }}>
                      {formatINR(savings)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="px-2 py-1 rounded-full text-[11px] font-medium"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
