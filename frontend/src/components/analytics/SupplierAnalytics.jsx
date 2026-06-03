import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, Search, ArrowUpDown, ExternalLink } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip
} from "recharts";

const DONUT_COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6", "#F97316", "#6366F1"];

const formatShort = (v) => {
  if (!v) return "\u20B90";
  if (v >= 10000000) return `\u20B9${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `\u20B9${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `\u20B9${(v / 1000).toFixed(0)}K`;
  return `\u20B9${v}`;
};

export const SupplierAnalytics = ({ supplierData, formatCurrency }) => {
  const [topN, setTopN] = useState("10");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("spend");

  const filtered = supplierData
    .filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "spend") return b.spend - a.spend;
      if (sortBy === "orders") return b.orders - a.orders;
      if (sortBy === "ontime") return (b.ontimePercent || 0) - (a.ontimePercent || 0);
      return b.spend - a.spend;
    });

  const topNValue = topN === "all" ? filtered.length : parseInt(topN);
  const displayed = filtered.slice(0, topNValue);
  const donutData = displayed.filter(s => s.spend > 0);

  return (
    <Card className="shadow-sm border-slate-200" data-testid="supplier-analytics">
      <CardHeader className="pb-2 px-5 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
              <Users className="w-4 h-4 text-emerald-500" /> Supplier Analytics
            </CardTitle>
            <CardDescription className="text-[11px]">Spend distribution and performance overview</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <Input placeholder="Search supplier..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 h-7 pl-7 text-[10px] border-slate-200" data-testid="supplier-search" />
            </div>
            <Select value={topN} onValueChange={setTopN}>
              <SelectTrigger className="w-24 h-7 text-[10px] border-slate-200" data-testid="top-n-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5" className="text-xs">Top 5</SelectItem>
                <SelectItem value="10" className="text-xs">Top 10</SelectItem>
                <SelectItem value="20" className="text-xs">Top 20</SelectItem>
                <SelectItem value="all" className="text-xs">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Table */}
          <div className="lg:col-span-8 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  <th className="text-left px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase">#</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase">Supplier</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase cursor-pointer hover:text-indigo-600"
                    onClick={() => setSortBy("spend")}>
                    Total Spend {sortBy === "spend" && <ArrowUpDown className="w-3 h-3 inline ml-0.5" />}
                  </th>
                  <th className="text-center px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase cursor-pointer hover:text-indigo-600"
                    onClick={() => setSortBy("orders")}>
                    POs {sortBy === "orders" && <ArrowUpDown className="w-3 h-3 inline ml-0.5" />}
                  </th>
                  <th className="text-center px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase cursor-pointer hover:text-indigo-600"
                    onClick={() => setSortBy("ontime")}>
                    On-Time {sortBy === "ontime" && <ArrowUpDown className="w-3 h-3 inline ml-0.5" />}
                  </th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase">Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.length > 0 ? displayed.map((s, i) => {
                  const savings = Math.max(0, s.initial - s.spend);
                  const savingsPct = s.initial > 0 ? ((savings / s.initial) * 100).toFixed(1) : 0;
                  return (
                    <tr key={s.name} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="w-5 h-5 rounded-md text-white text-[9px] font-bold flex items-center justify-center" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}>
                          {i + 1}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-slate-800">{s.name}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800">{formatShort(s.spend)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge className="text-[9px] bg-blue-50 text-blue-700 border-blue-200">{s.orders}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-xs font-medium ${(s.ontimePercent || 0) >= 80 ? 'text-emerald-600' : (s.ontimePercent || 0) >= 50 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {s.ontimePercent ? `${s.ontimePercent}%` : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {savings > 0 ? (
                          <span className="text-emerald-600 text-[10px] font-medium">{formatShort(savings)} ({savingsPct}%)</span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={6} className="text-center py-6 text-slate-400">No suppliers found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Donut Chart */}
          <div className="lg:col-span-4">
            {donutData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="spend" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                      {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatShort(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 -mt-2">
                  {donutData.slice(0, 5).map((s, i) => (
                    <span key={s.name} className="flex items-center gap-1 text-[9px] text-slate-600">
                      <span className="w-2 h-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      {s.name.length > 12 ? s.name.slice(0, 12) + '..' : s.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs">No data</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
