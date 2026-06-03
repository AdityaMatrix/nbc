import {
  IndianRupee, Clock, TrendingUp, CheckCircle, FileText,
  Building2, Package, UserCheck, Check
} from "lucide-react";

export const DashboardStatsCards = ({
  effectiveRole, user, allRequests, formatCurrency, hasAccess,
  buyerMetricFilter, setBuyerMetricFilter, setActiveTab
}) => {
  const isUserRole = effectiveRole === "user" || effectiveRole === "process_engineering";

  if (effectiveRole === "capex_head") {
    const cards = [
      { accessId: "card_budget_utilized", label: "Total Budget Utilized", value: formatCurrency(allRequests.reduce((sum, r) => sum + (r.final_negotiated_price || 0), 0)), icon: IndianRupee, trend: `${allRequests.length} requests processed`, color: "from-emerald-500/30 to-teal-500/20", highlight: true },
      { accessId: "card_pending_approvals", label: "Pending Approvals", value: allRequests.filter(r => r.status === "Pending DH Approval" || r.status === "Pending Approval").length, icon: Clock, trend: "Requires action", color: "from-amber-500/30 to-orange-500/20", alert: true },
      { accessId: "card_cost_savings", label: "Cost Savings", value: formatCurrency(0), icon: TrendingUp, trend: "Through negotiations", color: "from-blue-500/30 to-indigo-500/20" },
      { accessId: "card_completion_rate", label: "Completion Rate", value: `${allRequests.length ? Math.round((allRequests.filter(r => r.workflow_status === "Completed").length / allRequests.length) * 100) : 0}%`, icon: CheckCircle, trend: `${allRequests.filter(r => r.workflow_status === "Completed").length} completed`, color: "from-violet-500/30 to-purple-500/20" },
    ].filter(m => hasAccess('dashboard', m.accessId));

    return cards.map((m, i) => (
      <div key={i} className={`relative overflow-hidden bg-gradient-to-br ${m.color} backdrop-blur-md rounded-xl p-4 border ${m.alert ? 'border-amber-400/40' : m.highlight ? 'border-emerald-400/30' : 'border-white/10'} hover:scale-[1.02] transition-all duration-300 group cursor-pointer`}>
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl ${m.alert ? 'bg-amber-500/30' : m.highlight ? 'bg-emerald-500/30' : 'bg-white/15'} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
            <m.icon className={`w-5 h-5 ${m.alert ? 'text-amber-300' : 'text-white/90'}`} />
          </div>
          <div>
            <p className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">{m.label}</p>
            <p className={`text-xl font-bold ${m.alert ? 'text-amber-300' : 'text-white'}`}>{m.value}</p>
          </div>
        </div>
        <p className="text-[10px] text-white/50 mt-2.5 font-medium">{m.trend}</p>
      </div>
    ));
  }

  if (isUserRole) {
    const myRequests = allRequests.filter(r => r.user_id === user?.id);
    const deptRequests = allRequests;
    const cards = [
      { accessId: "card_dept_requests", label: "Dept Requests", value: deptRequests.length, icon: Building2, trend: `${user?.department || 'Your'} department`, color: "from-blue-500/30 to-cyan-500/20" },
      { accessId: "card_my_requests", label: "My Requests", value: myRequests.length, icon: FileText, trend: "Submitted by me", color: "from-violet-500/30 to-purple-500/20" },
      { accessId: "card_pending_approvals", label: "Awaiting Approval", value: deptRequests.filter(r => r.status === "Pending DH Approval" || r.status === "Pending Approval").length, icon: Clock, trend: "Pending review", color: "from-amber-500/30 to-yellow-500/20" },
      { accessId: "card_completed", label: "Completed", value: deptRequests.filter(r => r.workflow_status === "Completed").length, icon: CheckCircle, trend: "Successfully done", color: "from-emerald-500/30 to-green-500/20" },
    ].filter(m => hasAccess('dashboard', m.accessId));

    return cards.map((m, i) => (
      <div key={i} className="relative overflow-hidden bg-gradient-to-br backdrop-blur-xl rounded-2xl p-4 border border-white/20 hover:border-white/40 hover:scale-[1.02] transition-all duration-300 group cursor-pointer" style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}>
        <div className={`absolute inset-0 bg-gradient-to-br ${m.color} rounded-2xl`} />
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
            <m.icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">{m.label}</p>
            <p className="text-2xl font-bold text-white">{m.value}</p>
          </div>
        </div>
        <p className="text-[10px] text-white/50 mt-2 font-medium relative">{m.trend}</p>
      </div>
    ));
  }

  if (effectiveRole === "department_head") {
    const deptRequests = allRequests;
    const completed = deptRequests.filter(r => r.workflow_status === "Completed").length;
    const inProgress = deptRequests.filter(r => r.dh_approval_status === "Approved" && r.workflow_status !== "Completed").length;
    const pendingApproval = deptRequests.filter(r => r.status === "Pending DH Approval").length;

    const cards = [
      { accessId: "card_dept_requests", label: "Dept Total Requests", value: deptRequests.length, icon: Building2, trend: `${user?.department || 'Your'} department`, color: "from-blue-500/30 to-indigo-500/20" },
      { accessId: "card_completed", label: "Completed", value: completed, icon: CheckCircle, trend: "Successfully finished", color: "from-emerald-500/30 to-teal-500/20" },
      { accessId: "card_in_progress", label: "In Progress", value: inProgress, icon: Package, trend: "Currently processing", color: "from-violet-500/30 to-purple-500/20" },
      { accessId: "card_pending_approvals", label: "Pending My Approval", value: pendingApproval, icon: Clock, trend: "Requires your action", color: "from-amber-500/30 to-orange-500/20", highlight: pendingApproval > 0 },
    ].filter(m => hasAccess('dashboard', m.accessId));

    return cards.map((m, i) => (
      <div key={i} className={`relative overflow-hidden bg-gradient-to-br ${m.color} backdrop-blur-xl rounded-2xl p-4 border ${m.highlight ? 'border-amber-400/40 shadow-lg shadow-amber-500/20' : 'border-white/20'} hover:scale-[1.02] transition-all duration-300 group cursor-pointer`}>
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl ${m.highlight ? 'bg-amber-500/30' : 'bg-white/20'} backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
            <m.icon className={`w-5 h-5 ${m.highlight ? 'text-amber-200' : 'text-white'}`} />
          </div>
          <div>
            <p className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">{m.label}</p>
            <p className={`text-2xl font-bold ${m.highlight ? 'text-amber-200' : 'text-white'}`}>{m.value}</p>
          </div>
        </div>
        <p className="text-[10px] text-white/50 mt-2 font-medium">{m.trend}</p>
      </div>
    ));
  }

  // Buyer role
  const myAssigned = allRequests.filter(r => r.assigned_buyer_id === user?.id);
  const completed = myAssigned.filter(r => r.workflow_status === "Completed");
  const inProgress = myAssigned.filter(r => {
    const dhApproved = r.dh_approval_status === "Approved";
    const notCompleted = r.workflow_status !== "Completed";
    return dhApproved && notCompleted;
  });

  let purchaseValue = 0;
  let totalInitialOffer = 0;
  let totalFinalOffer = 0;
  myAssigned.forEach(r => {
    if (r.suppliers && r.suppliers.length > 0) {
      const orderedSupplier = r.suppliers.find(s => s.is_ordered === true) || r.suppliers.find(s => s.selected === true) || r.suppliers[0];
      if (orderedSupplier) {
        const fp = parseFloat(orderedSupplier.final_price || 0);
        const ip = parseFloat(orderedSupplier.initial_price || 0);
        purchaseValue += fp;
        totalInitialOffer += ip;
        totalFinalOffer += fp;
      }
    }
  });
  const costSavings = totalInitialOffer > totalFinalOffer ? totalInitialOffer - totalFinalOffer : 0;
  const savingsPercent = totalInitialOffer > 0 ? ((costSavings / totalInitialOffer) * 100).toFixed(1) : 0;

  const cards = [
    { id: "assigned", accessId: "card_my_assigned", label: "My Assigned", value: myAssigned.length, icon: UserCheck, trend: "Assigned to me", color: "from-blue-500/30 to-cyan-500/20" },
    { id: "completed", accessId: "card_completed", label: "Completed", value: completed.length, icon: CheckCircle, trend: "Successfully finished", color: "from-emerald-500/30 to-teal-500/20" },
    { id: "inprogress", accessId: "card_in_progress", label: "In Progress", value: inProgress.length, icon: Package, trend: "DH approved, processing", color: "from-amber-500/30 to-orange-500/20" },
    { id: "purchase", accessId: "card_purchase_value", label: "Total Purchase Value", value: formatCurrency(purchaseValue), icon: IndianRupee, trend: "My purchase value", color: "from-violet-500/30 to-purple-500/20" },
    { id: "savings", accessId: "card_cost_savings", label: "Cost Savings", value: formatCurrency(costSavings), icon: TrendingUp, trend: costSavings > 0 ? `${savingsPercent}% saved` : "Initial - Final offer", color: "from-green-500/30 to-emerald-500/20", highlight: costSavings > 0 },
  ].filter(m => hasAccess('dashboard', m.accessId));

  return cards.map((m, i) => (
    <div
      key={i}
      className={`relative overflow-hidden bg-gradient-to-br ${m.color} backdrop-blur-xl rounded-2xl p-4 border ${
        buyerMetricFilter === m.id ? 'ring-2 ring-white/60 border-white/40 scale-105' :
        m.highlight ? 'border-emerald-400/40 shadow-lg shadow-emerald-500/20' : 'border-white/20'
      } hover:scale-[1.02] transition-all duration-300 group cursor-pointer`}
      onClick={() => {
        if (buyerMetricFilter === m.id) {
          setBuyerMetricFilter(null);
        } else {
          setBuyerMetricFilter(m.id);
          setActiveTab("assigned");
        }
      }}
    >
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
      <div className="relative flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl ${m.highlight ? 'bg-emerald-500/30' : 'bg-white/20'} backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
          <m.icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">{m.label}</p>
          <p className="text-2xl font-bold text-white">{m.value}</p>
        </div>
      </div>
      <p className="text-[10px] text-white/50 mt-2 font-medium">{m.trend}</p>
      {buyerMetricFilter === m.id && (
        <div className="absolute top-2 right-2 bg-white/20 rounded-full p-1">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  ));
};
