import {
  Clock, XCircle, CheckCircle, FileText, Package,
  Search, Truck, Building2
} from "lucide-react";

export const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

export const statusConfig = {
  "Pending DH Approval": { color: "bg-amber-500/10 text-amber-700 border-amber-200", icon: Clock },
  "Rejected by DH": { color: "bg-rose-500/10 text-rose-700 border-rose-200", icon: XCircle },
  "Pending Approval": { color: "bg-amber-500/10 text-amber-700 border-amber-200", icon: Clock },
  "Approved": { color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: CheckCircle },
  "Rejected": { color: "bg-rose-500/10 text-rose-700 border-rose-200", icon: XCircle },
  "CEA Under Approval": { color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: FileText },
  "CEA Approved": { color: "bg-blue-600/10 text-blue-800 border-blue-300", icon: CheckCircle },
  "CEA Processing": { color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: FileText },
  "PR Under Approval": { color: "bg-indigo-500/10 text-indigo-700 border-indigo-200", icon: FileText },
  "PR Approved": { color: "bg-indigo-600/10 text-indigo-800 border-indigo-300", icon: CheckCircle },
  "PR Processing": { color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: FileText },
  "PO Under Approval": { color: "bg-violet-500/10 text-violet-700 border-violet-200", icon: FileText },
  "PO Approved": { color: "bg-violet-600/10 text-violet-800 border-violet-300", icon: CheckCircle },
  "Order Placed": { color: "bg-purple-500/10 text-purple-700 border-purple-200", icon: Package },
  "PO Processing": { color: "bg-indigo-500/10 text-indigo-700 border-indigo-200", icon: FileText },
  "DAP Under Approval": { color: "bg-amber-500/10 text-amber-700 border-amber-200", icon: FileText },
  "DAP Approved": { color: "bg-amber-600/10 text-amber-800 border-amber-300", icon: CheckCircle },
  "PDI": { color: "bg-cyan-500/10 text-cyan-700 border-cyan-200", icon: Search },
  "PDI Completed": { color: "bg-cyan-600/10 text-cyan-800 border-cyan-300", icon: CheckCircle },
  "Yet to Dispatch": { color: "bg-orange-500/10 text-orange-700 border-orange-200", icon: Truck },
  "Under Negotiation": { color: "bg-violet-500/10 text-violet-700 border-violet-200", icon: FileText },
  "In Transit": { color: "bg-cyan-500/10 text-cyan-700 border-cyan-200", icon: Truck },
  "Dispatched": { color: "bg-orange-500/10 text-orange-700 border-orange-200", icon: Truck },
  "Delivery Schedule": { color: "bg-orange-400/10 text-orange-600 border-orange-200", icon: Truck },
  "Delivered": { color: "bg-teal-500/10 text-teal-700 border-teal-200", icon: Package },
  "Installation in Progress": { color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: Building2 },
  "Installed": { color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: Building2 },
  "Completed": { color: "bg-slate-800 text-white border-slate-700", icon: CheckCircle },
  "Sample Ready for Dispatch": { color: "bg-cyan-500/10 text-cyan-700 border-cyan-200", icon: Package },
  "Sample Request": { color: "bg-purple-500/10 text-purple-700 border-purple-200", icon: Package },
};

// Pending Task Helpers
export const getNumbers = (r) => ({
  cea: r.cea_number || r.items?.[0]?.cea_number || '',
  pr: r.pr_number || r.items?.[0]?.pr_number || '',
  po: r.po_number || r.items?.[0]?.po_number || '',
});

export const getStatuses = (r) => ({
  cea: r.cea_status || r.items?.[0]?.cea_status || '',
  pr: r.pr_approval_status || r.items?.[0]?.pr_status || '',
  po: r.po_approval_status || r.items?.[0]?.po_status || '',
});

export const hasAllNumbers = (r) => { const n = getNumbers(r); return !!(n.cea && n.pr && n.po); };
export const isFieldApproved = (r, field) => getStatuses(r)[field] === 'Approved';
export const hasNumber = (r, field) => !!getNumbers(r)[field];
export const isCeaPending = (r) => r.cea_required !== false && hasNumber(r, 'cea') && !isFieldApproved(r, 'cea');
export const isPrPending = (r) => hasNumber(r, 'pr') && !isFieldApproved(r, 'pr');
export const isPoPending = (r) => hasNumber(r, 'po') && !isFieldApproved(r, 'po');
export const isAllApproved = (r) => { const s = getStatuses(r); return s.cea === 'Approved' && s.pr === 'Approved' && s.po === 'Approved'; };
export const isPendingTask = (r) => hasAllNumbers(r) && !isAllApproved(r);

export const formatCurrency = (value) => {
  if (!value) return "\u20B90";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

export const getDisplayDescription = (request) => {
  if (request._itemDescription) return request._itemDescription;
  if (request.requirement_items && request.requirement_items.length > 0) {
    return request.requirement_items.map(item => item.description).filter(d => d).join("; ");
  }
  if (request.justification) return request.justification;
  return request.requirement_description || "";
};
