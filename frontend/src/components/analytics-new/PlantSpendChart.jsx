import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { useState } from "react";
import { formatCompact, formatINR } from "@/lib/capexHelpers";

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white rounded-md shadow-lg px-3 py-2 text-xs border border-slate-200">
      <p className="font-medium">{p.name}</p>
      <p className="tabular" style={{ color: "var(--brand)" }}>{formatINR(p.spend)}</p>
      <p className="text-slate-500">{p.count} request{p.count !== 1 ? "s" : ""}</p>
    </div>
  );
}

const BRAND = "#0d9668";
const BRAND_DIM = "rgba(13, 150, 104, 0.35)";

export function PlantSpendChart({ data }) {
  const [active, setActive] = useState(null);

  return (
    <div className="bg-white p-5 rounded-xl flex flex-col" style={{ boxShadow: "inset 0 0 0 1px var(--hairline)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Plant-wise Spend</h3>
          <p className="text-xs text-slate-500">Click a bar to highlight</p>
        </div>
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">INR</span>
      </div>
      <div className="h-64">
        {data.length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-slate-400">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
              />
              <YAxis
                tickFormatter={(v) => formatCompact(v)}
                tickLine={false}
                axisLine={false}
                width={52}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
              />
              <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<ChartTooltip />} />
              <Bar
                dataKey="spend"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
                onClick={(d) => setActive((cur) => (cur === d.name ? null : d.name))}
              >
                {data.map((d) => (
                  <Cell
                    key={d.name}
                    cursor="pointer"
                    fill={active === null || active === d.name ? BRAND : BRAND_DIM}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
