import { LayoutGrid, Flame, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";

export function TimelineKpiCards({ kpis }) {
  const cards = [
    { label: "Total", value: kpis.total, tone: "default", icon: LayoutGrid },
    { label: "Delayed", value: kpis.delayed, tone: "danger", icon: Flame },
    { label: "At Risk", value: kpis.atRisk, tone: "warn", icon: AlertTriangle },
    { label: "In Progress", value: kpis.inProgress, tone: "info", icon: Loader2 },
    { label: "Completed", value: kpis.completed, tone: "brand", icon: CheckCircle2 },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white p-4 rounded-xl flex items-center gap-3 animate-fade-in"
          style={{ boxShadow: "inset 0 0 0 1px var(--hairline)" }}
        >
          <div
            className="w-9 h-9 rounded-lg grid place-items-center shrink-0"
            style={{
              backgroundColor:
                c.tone === "danger" ? "rgba(220,38,38,0.1)"
                : c.tone === "warn" ? "rgba(217,119,6,0.1)"
                : c.tone === "brand" ? "var(--brand-soft)"
                : c.tone === "info" ? "rgba(59,130,246,0.12)"
                : "rgba(0,0,0,0.04)",
              color:
                c.tone === "danger" ? "var(--danger)"
                : c.tone === "warn" ? "var(--warn)"
                : c.tone === "brand" ? "var(--brand)"
                : c.tone === "info" ? "#3b82f6"
                : "#94a3b8",
            }}
          >
            <c.icon className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              {c.label}
            </span>
            <span className="text-2xl font-semibold tracking-tight tabular leading-none">
              {c.value}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}
