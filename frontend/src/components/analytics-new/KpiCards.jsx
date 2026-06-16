import {
  IndianRupee, Briefcase, AlertTriangle,
  CheckCircle2, Users, Clock,
} from "lucide-react";
import { formatINR } from "@/lib/capexHelpers";

export function KpiCards({ kpis, prevKpis, formatCurrency }) {
  const fmt = formatCurrency || formatINR;

  // Compute YoY change
  const spendChange = prevKpis?.totalSpend
    ? (((kpis.totalSpend - prevKpis.totalSpend) / prevKpis.totalSpend) * 100).toFixed(1)
    : null;

  const cards = [
    {
      label: "Total Spend",
      value: fmt(kpis.totalSpend),
      sub: spendChange ? `${spendChange > 0 ? "+" : ""}${spendChange}% vs LY` : "current FY",
      tone: "brand",
      icon: IndianRupee,
    },
    {
      label: "Active Projects",
      value: String(kpis.activeProjects),
      sub: "in progress",
      tone: "default",
      icon: Briefcase,
    },
    {
      label: "Delayed Projects",
      value: String(kpis.delayedProjects),
      sub: "needs attention",
      tone: "danger",
      icon: AlertTriangle,
    },
    {
      label: "Completed",
      value: String(kpis.completedProjects),
      sub: "this fiscal year",
      tone: "default",
      icon: CheckCircle2,
    },
    {
      label: "Total Suppliers",
      value: String(kpis.totalSuppliers),
      sub: "active network",
      tone: "default",
      icon: Users,
    },
    {
      label: "Avg PO Processing",
      value: kpis.avgPoProcessing != null ? `${kpis.avgPoProcessing}d` : "—",
      sub: "avg cycle time",
      tone: "brand",
      icon: Clock,
    },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white p-4 rounded-xl ring-hairline flex flex-col gap-2 animate-fade-in"
          style={{ boxShadow: "inset 0 0 0 1px var(--hairline)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              {c.label}
            </span>
            <div
              className="w-7 h-7 rounded-md grid place-items-center"
              style={{
                backgroundColor:
                  c.tone === "danger" ? "rgba(220,38,38,0.1)"
                  : c.tone === "brand" ? "var(--brand-soft)"
                  : "rgba(0,0,0,0.04)",
                color:
                  c.tone === "danger" ? "var(--danger)"
                  : c.tone === "brand" ? "var(--brand)"
                  : "#94a3b8",
              }}
            >
              <c.icon className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-semibold tracking-tight tabular">{c.value}</span>
          <span
            className="text-[11px] font-medium"
            style={{
              color:
                c.tone === "danger" ? "var(--danger)"
                : c.tone === "brand" ? "var(--brand)"
                : "#94a3b8",
            }}
          >
            {c.sub}
          </span>
        </div>
      ))}
    </section>
  );
}
