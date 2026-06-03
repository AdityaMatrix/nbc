import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users } from "lucide-react";

export const DashboardAnalytics = ({ effectiveRole, allRequests, formatCurrency, hasAccess }) => {
  if (effectiveRole !== "capex_head") return null;
  if (!hasAccess('dashboard', 'dept_spend_chart') && !hasAccess('dashboard', 'buyer_performance_chart')) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-6">
      {hasAccess('dashboard', 'dept_spend_chart') && (
        <Card className="lg:col-span-7 border border-slate-200 shadow-lg shadow-slate-200/50 bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))` }}>
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-base font-bold text-slate-800">Department Spend Analysis</span>
                  <p className="text-[11px] text-slate-500">FY 2025-26 Budget Allocation</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Spend</p>
                <p className="text-lg font-bold" style={{ color: 'var(--theme-primary)' }}>
                  {formatCurrency(allRequests.reduce((sum, r) => sum + (r.final_negotiated_price || 0), 0))}
                </p>
              </div>
            </div>
            {(() => {
              const deptSpend = allRequests.reduce((acc, r) => {
                const dept = r.department || 'Other';
                const value = r.final_negotiated_price || 0;
                acc[dept] = (acc[dept] || 0) + value;
                return acc;
              }, {});
              const totalSpend = Object.values(deptSpend).reduce((a, b) => a + b, 0);
              const deptData = Object.entries(deptSpend)
                .map(([name, value]) => ({ name, value, percent: totalSpend > 0 ? (value / totalSpend * 100) : 0 }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 6);
              const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];
              return (
                <div className="space-y-3.5">
                  {deptData.map((dept, idx) => (
                    <div key={idx} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-slate-700">{dept.name}</span>
                        <span className="text-xs font-bold text-slate-900">{formatCurrency(dept.value)}</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 group-hover:brightness-110"
                          style={{
                            width: `${dept.percent}%`,
                            background: `linear-gradient(90deg, ${colors[idx % colors.length]}, ${colors[(idx + 1) % colors.length]})`
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{dept.percent.toFixed(1)}% of total</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {hasAccess('dashboard', 'buyer_performance_chart') && (
        <Card className="lg:col-span-5 border-0 shadow-lg shadow-slate-200/50 bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800">Buyer Performance</span>
                  <p className="text-[10px] text-slate-500">Active assignments & completion</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {(() => {
                const buyerWorkload = allRequests.reduce((acc, r) => {
                  const buyer = r.assigned_buyer_name || 'Unassigned';
                  if (!acc[buyer]) acc[buyer] = { total: 0, completed: 0, value: 0 };
                  acc[buyer].total++;
                  acc[buyer].value += r.final_negotiated_price || 0;
                  if (r.workflow_status === 'Completed') acc[buyer].completed++;
                  return acc;
                }, {});
                return Object.entries(buyerWorkload)
                  .filter(([name]) => name !== 'Unassigned')
                  .slice(0, 5)
                  .map(([name, data], idx) => {
                    const percent = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                    return (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                          {name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{data.total} assigned</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{data.completed} done</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${percent >= 50 ? 'text-emerald-600' : percent >= 25 ? 'text-amber-600' : 'text-slate-600'}`}>{percent}%</p>
                          <p className="text-[9px] text-slate-500">completion</p>
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
