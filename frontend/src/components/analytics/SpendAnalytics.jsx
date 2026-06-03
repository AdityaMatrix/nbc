import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Treemap
} from "recharts";

const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6", "#F97316", "#6366F1"];

const formatShort = (v) => {
  if (!v) return "\u20B90";
  if (v >= 10000000) return `\u20B9${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `\u20B9${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `\u20B9${(v / 1000).toFixed(0)}K`;
  return `\u20B9${v}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-xl p-3 text-xs">
      <p className="font-semibold text-slate-800 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold">{formatShort(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

export const SpendAnalytics = ({ plantData, deptData, plantFilter, setPlantFilter, formatCurrency, selectedFY }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="spend-analytics">
      {/* Plant-wise Spend */}
      <Card className="shadow-sm border-slate-200" data-testid="chart-plant-spend">
        <CardHeader className="pb-2 px-5 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <Building2 className="w-4 h-4 text-violet-500" /> Plant-wise Spend
              </CardTitle>
              <CardDescription className="text-[11px]">Click a bar to drill down by plant</CardDescription>
            </div>
            <Badge className="text-[9px] bg-slate-100 text-slate-600">{selectedFY}</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {plantData.length > 0 ? (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={plantData} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={55} tickFormatter={formatShort} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="spend" name="Final" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={28} cursor="pointer"
                      onClick={(data) => setPlantFilter(data.name === plantFilter ? "all" : data.name)} />
                    <Bar dataKey="initial" name="Quoted" fill="#DDD6FE" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Mini summary */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                {plantData.slice(0, 3).map((p, i) => (
                  <div key={p.name} className={`p-2 rounded-lg cursor-pointer transition-all ${plantFilter === p.name ? 'bg-violet-100 border border-violet-200' : 'bg-slate-50 hover:bg-slate-100'}`}
                    onClick={() => setPlantFilter(p.name === plantFilter ? "all" : p.name)}>
                    <p className="text-[10px] text-slate-500 truncate">{p.name}</p>
                    <p className="text-sm font-bold text-slate-800">{formatShort(p.spend)}</p>
                    <p className="text-[9px] text-slate-400">{p.count} requests</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No data</div>
          )}
        </CardContent>
      </Card>

      {/* Department-wise Spend */}
      <Card className="shadow-sm border-slate-200" data-testid="chart-dept-spend">
        <CardHeader className="pb-2 px-5 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <BarChart3 className="w-4 h-4 text-blue-500" /> Department-wise Spend
              </CardTitle>
              <CardDescription className="text-[11px]">
                {plantFilter !== "all" ? `Filtered: ${plantFilter}` : "All plants"}
              </CardDescription>
            </div>
            {plantFilter !== "all" && (
              <Badge className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200">{plantFilter}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {deptData.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
              <div className="xl:col-span-7 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptData} layout="vertical" barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} tickFormatter={formatShort} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="spend" name="Final" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={16} />
                    <Bar dataKey="initial" name="Quoted" fill="#BFDBFE" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="xl:col-span-5 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deptData} dataKey="spend" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}
                      label={({ name, percent }) => `${name.length > 8 ? name.slice(0, 8) + '..' : name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#94A3B8', strokeWidth: 1 }}>
                      {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatShort(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No department data</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
