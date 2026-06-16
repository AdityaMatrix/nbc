import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatINR } from "@/lib/capexHelpers";

const COLORS = [
  "#0d9668", "#2aac7f", "#5dc09a",
  "#90d4b5", "#c3e8d0",
];

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white rounded-md shadow-lg px-3 py-2 text-xs border border-slate-200">
      <p className="font-medium">{p.name}</p>
      <p className="tabular" style={{ color: "var(--brand)" }}>{formatINR(p.spend)}</p>
    </div>
  );
}

export function DepartmentChart({ data }) {
  const total = data.reduce((s, d) => s + d.spend, 0);

  return (
    <div className="bg-white p-5 rounded-xl flex flex-col" style={{ boxShadow: "inset 0 0 0 1px var(--hairline)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Department-wise Spend</h3>
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Allocation</span>
      </div>
      {data.length === 0 ? (
        <div className="h-64 grid place-items-center text-sm text-slate-400">No department data</div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="h-56 w-full sm:w-1/2 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="spend"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="92%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Total</p>
                <p className="text-base font-semibold tabular">{formatINR(total)}</p>
              </div>
            </div>
          </div>
          <ul className="flex-1 w-full space-y-2">
            {data.map((d, i) => (
              <li key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  {d.name}
                </span>
                <span className="font-medium tabular">
                  {total ? ((d.spend / total) * 100).toFixed(0) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
