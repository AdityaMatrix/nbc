import { Card, CardContent } from "@/components/ui/card";
import {
  IndianRupee, Briefcase, AlertTriangle, CheckCircle, Users, Clock,
  TrendingUp, TrendingDown, Minus
} from "lucide-react";

const TrendIndicator = ({ current, previous }) => {
  if (!previous || previous === 0) return <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Minus className="w-3 h-3" /> N/A</span>;
  const pctChange = ((current - previous) / previous * 100).toFixed(1);
  const isUp = current > previous;
  const isFlat = Math.abs(pctChange) < 0.5;
  if (isFlat) return <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Minus className="w-3 h-3" /> 0%</span>;
  return (
    <span className={`text-[10px] flex items-center gap-0.5 font-medium ${isUp ? 'text-red-500' : 'text-emerald-500'}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}{pctChange}%
    </span>
  );
};

const TrendIndicatorPositive = ({ current, previous }) => {
  if (!previous || previous === 0) return <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Minus className="w-3 h-3" /> N/A</span>;
  const pctChange = ((current - previous) / previous * 100).toFixed(1);
  const isUp = current > previous;
  const isFlat = Math.abs(pctChange) < 0.5;
  if (isFlat) return <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Minus className="w-3 h-3" /> 0%</span>;
  return (
    <span className={`text-[10px] flex items-center gap-0.5 font-medium ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}{pctChange}%
    </span>
  );
};

export const AnalyticsKPIs = ({ kpis, prevKpis, formatCurrency }) => {
  const cards = [
    {
      label: "Total Spend", value: formatCurrency(kpis.totalSpend),
      icon: IndianRupee, gradient: "from-violet-500 to-indigo-600",
      bg: "bg-violet-50", border: "border-violet-100",
      trend: <TrendIndicator current={kpis.totalSpend} previous={prevKpis.totalSpend} />,
    },
    {
      label: "Active Projects", value: kpis.activeProjects,
      icon: Briefcase, gradient: "from-blue-500 to-cyan-600",
      bg: "bg-blue-50", border: "border-blue-100",
      trend: <TrendIndicatorPositive current={kpis.activeProjects} previous={prevKpis.activeProjects} />,
    },
    {
      label: "Delayed Projects", value: kpis.delayedProjects,
      icon: AlertTriangle, gradient: "from-red-500 to-rose-600",
      bg: "bg-red-50", border: "border-red-100",
      trend: <TrendIndicator current={kpis.delayedProjects} previous={prevKpis.delayedProjects} />,
      alert: kpis.delayedProjects > 0
    },
    {
      label: "Completed Projects", value: kpis.completedProjects,
      icon: CheckCircle, gradient: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50", border: "border-emerald-100",
      trend: <TrendIndicatorPositive current={kpis.completedProjects} previous={prevKpis.completedProjects} />,
    },
    {
      label: "Total Suppliers", value: kpis.totalSuppliers,
      icon: Users, gradient: "from-amber-500 to-orange-600",
      bg: "bg-amber-50", border: "border-amber-100",
      trend: <TrendIndicatorPositive current={kpis.totalSuppliers} previous={prevKpis.totalSuppliers} />,
    },
    {
      label: "Avg PO Processing", value: kpis.avgPoProcessing ? `${kpis.avgPoProcessing}d` : "-",
      icon: Clock, gradient: "from-slate-500 to-slate-700",
      bg: "bg-slate-50", border: "border-slate-200",
      trend: kpis.avgPoProcessing && prevKpis.avgPoProcessing ?
        <TrendIndicator current={kpis.avgPoProcessing} previous={prevKpis.avgPoProcessing} /> : null,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="analytics-kpis">
      {cards.map((c, i) => (
        <Card key={i} className={`${c.bg} ${c.border} border shadow-sm hover:shadow-md transition-all duration-200 ${c.alert ? 'ring-1 ring-red-200' : ''}`}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-start justify-between mb-2">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center shadow-md`}>
                <c.icon className="w-4 h-4 text-white" />
              </div>
              {c.trend && <div className="mt-1">{c.trend}</div>}
            </div>
            <p className="text-xl font-bold text-slate-800">{c.value}</p>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">{c.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
