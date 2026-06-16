// Shared helpers for the Lovable-redesigned Analytics & Timeline pages.

const Cr = 1_00_00_000;
const L = 1_00_000;

export function formatINR(amount) {
  if (!amount) return "₹0";
  if (amount >= Cr) return `₹${(amount / Cr).toFixed(2)} Cr`;
  if (amount >= L) return `₹${(amount / L).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatCompact(amount) {
  if (!amount) return "₹0";
  if (amount >= Cr) return `₹${(amount / Cr).toFixed(1)}Cr`;
  if (amount >= L) return `₹${(amount / L).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

export const STATUS_COLORS = {
  Completed: "#0d9668",
  "On Track": "#0d9668",
  "In Progress": "#3b82f6",
  "At Risk": "#d97706",
  Delayed: "#dc2626",
  "Not Started": "#94a3b8",
};

export const STAGE_COLORS = {
  CEA: "#7c3aed",
  PR: "#3b82f6",
  PO: "#0891b2",
  Manufacturing: "#0d9668",
  Dispatch: "#16a34a",
  Installation: "#65a30d",
  Commissioning: "#d97706",
  Closure: "#64748b",
};

export const STAGES = [
  "CEA", "PR", "PO", "Manufacturing",
  "Dispatch", "Installation", "Commissioning", "Closure",
];

export const TIMELINE_STATUSES = [
  "Completed", "On Track", "In Progress", "At Risk", "Delayed", "Not Started",
];

export const PRIORITIES_LIST = ["High", "Medium", "Low"];

// --- Date helpers for Gantt view ---
export function parseISO(iso) {
  return new Date(iso + "T00:00:00").getTime();
}

export function daysBetween(a, b) {
  return Math.round((parseISO(b) - parseISO(a)) / 86_400_000);
}

export function addDays(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function projectsDateRange(projects) {
  if (projects.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    return { start: today, end: addDays(today, 30), totalDays: 30 };
  }
  let min = projects[0]._startDate;
  let max = projects[0]._plannedEnd;
  for (const p of projects) {
    if (parseISO(p._startDate) < parseISO(min)) min = p._startDate;
    if (parseISO(p._plannedEnd) > parseISO(max)) max = p._plannedEnd;
  }
  const startD = new Date(parseISO(min));
  startD.setDate(1);
  const endD = new Date(parseISO(max));
  endD.setMonth(endD.getMonth() + 1, 1);
  const start = startD.toISOString().slice(0, 10);
  const end = endD.toISOString().slice(0, 10);
  return { start, end, totalDays: daysBetween(start, end) };
}

export function monthTicks(range) {
  const ticks = [];
  const cur = new Date(parseISO(range.start));
  const end = parseISO(range.end);
  while (cur.getTime() <= end) {
    const iso = cur.toISOString().slice(0, 10);
    ticks.push({
      iso,
      label: cur.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      offsetDays: daysBetween(range.start, iso),
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return ticks;
}
