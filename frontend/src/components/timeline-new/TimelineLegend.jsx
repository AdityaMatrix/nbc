import { STATUS_COLORS } from "@/lib/capexHelpers";

const LEGEND = [
  { label: "Completed / On Track", status: "Completed" },
  { label: "In Progress", status: "In Progress" },
  { label: "At Risk", status: "At Risk" },
  { label: "Delayed", status: "Delayed" },
  { label: "Not Started", status: "Not Started" },
];

export function TimelineLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
      <span className="font-semibold uppercase tracking-wider text-[11px]">Legend</span>
      {LEGEND.map((l) => (
        <span key={l.label} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: STATUS_COLORS[l.status] }}
          />
          {l.label}
        </span>
      ))}
    </div>
  );
}

export function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || "#94a3b8";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{
        backgroundColor: `${color}1a`,
        color: color,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const styles = {
    High: { bg: "rgba(220,38,38,0.1)", color: "var(--danger)" },
    Medium: { bg: "rgba(217,119,6,0.1)", color: "var(--warn)" },
    Low: { bg: "rgba(0,0,0,0.04)", color: "#64748b" },
  };
  const s = styles[priority] || styles.Medium;
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: s.bg, color: s.color }}>
      {priority}
    </span>
  );
}
