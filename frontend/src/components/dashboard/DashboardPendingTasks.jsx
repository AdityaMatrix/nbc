import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock, XCircle, CheckCircle, FileText, Package,
  FileCheck, TestTube2, ClipboardCheck, Check
} from "lucide-react";

import { isCeaPending, isPrPending, isPoPending } from "./dashboardConfig";

export const DashboardPendingTasks = ({
  user, allRequests, pendingTaskFilter, setPendingTaskFilter,
  setActiveTab
}) => {
  const myRequests = allRequests.filter(r => r.assigned_buyer_id === user?.id);
  const pendingCEAs = myRequests.filter(r => isCeaPending(r));
  const pendingPRs = myRequests.filter(r => isPrPending(r));
  const pendingPOs = myRequests.filter(r => isPoPending(r));
  const pendingDAPs = myRequests.filter(r => (r.workflow_status || '').includes('DAP'));
  const sampleRequested = myRequests.filter(r => r.sample_required === true && !r.sample_received);
  const pendingPDIs = myRequests.filter(r => (r.workflow_status || '').includes('PDI'));

  const tasks = [
    { id: "pr", label: "PRs Pending", value: pendingPRs.length, icon: FileText, color: "from-blue-500 to-indigo-500", bgColor: "bg-blue-50", borderColor: "border-blue-200", activeColor: "ring-2 ring-blue-400" },
    { id: "po", label: "POs Pending", value: pendingPOs.length, icon: Package, color: "from-violet-500 to-purple-500", bgColor: "bg-violet-50", borderColor: "border-violet-200", activeColor: "ring-2 ring-violet-400" },
    { id: "cea", label: "CEAs in Approval", value: pendingCEAs.length, icon: CheckCircle, color: "from-emerald-500 to-teal-500", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", activeColor: "ring-2 ring-emerald-400" },
    { id: "dap", label: "Pending DAPs", value: pendingDAPs.length, icon: FileCheck, color: "from-amber-500 to-orange-500", bgColor: "bg-amber-50", borderColor: "border-amber-200", activeColor: "ring-2 ring-amber-400" },
    { id: "sample", label: "Sample Requested", value: sampleRequested.length, icon: TestTube2, color: "from-pink-500 to-rose-500", bgColor: "bg-pink-50", borderColor: "border-pink-200", activeColor: "ring-2 ring-pink-400" },
    { id: "pdi", label: "PDIs Pending", value: pendingPDIs.length, icon: ClipboardCheck, color: "from-cyan-500 to-sky-500", bgColor: "bg-cyan-50", borderColor: "border-cyan-200", activeColor: "ring-2 ring-cyan-400" },
  ];

  return (
    <div className="space-y-5 mt-6">
      <Card className="border border-slate-200 shadow-lg shadow-slate-200/50 bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))` }}>
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Pending Tasks</h3>
                <p className="text-[11px] text-slate-500">Click on any task to filter the table below</p>
              </div>
            </div>
            {pendingTaskFilter && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px]"
                onClick={() => setPendingTaskFilter(null)}
              >
                <XCircle className="w-3 h-3 mr-1" /> Clear Filter
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {tasks.map((task, idx) => (
              <div
                key={idx}
                className={`${task.bgColor} rounded-xl p-3 border transition-all duration-300 cursor-pointer group ${
                  pendingTaskFilter === task.id
                    ? `${task.activeColor} ${task.borderColor} scale-105 shadow-md`
                    : `${task.borderColor} hover:shadow-md`
                }`}
                onClick={() => {
                  if (pendingTaskFilter === task.id) {
                    setPendingTaskFilter(null);
                  } else {
                    setPendingTaskFilter(task.id);
                    setActiveTab("assigned");
                  }
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${task.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                    <task.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className={`text-2xl font-bold ${task.value > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{task.value}</span>
                </div>
                <p className="text-[10px] text-slate-600 font-medium">{task.label}</p>
                {pendingTaskFilter === task.id && (
                  <div className="mt-2 text-[9px] flex items-center gap-1" style={{ color: 'var(--theme-primary)' }}>
                    <Check className="w-3 h-3" /> Active Filter
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
