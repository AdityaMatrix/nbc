import { useState, useMemo } from "react";
import { X, Search, FolderPlus, Save, Loader2 } from "lucide-react";
import { formatINR } from "@/lib/capexHelpers";

export function GroupManager({ open, onClose, onSave, group, allProjects, existingGroups }) {
  const isEdit = !!group;
  const [name, setName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [selectedIds, setSelectedIds] = useState(new Set(group?.project_ids || []));
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Projects already claimed by OTHER groups (not this one)
  const claimedIds = useMemo(() => {
    const claimed = new Set();
    for (const g of existingGroups || []) {
      if (isEdit && g.id === group.id) continue; // skip current group when editing
      for (const pid of g.project_ids || []) claimed.add(pid);
    }
    return claimed;
  }, [existingGroups, group, isEdit]);

  // Available projects = all projects minus those claimed by other groups
  const available = useMemo(() => {
    return allProjects.filter((p) => !claimedIds.has(p.id));
  }, [allProjects, claimedIds]);

  const filtered = useMemo(() => {
    if (!search) return available;
    const q = search.toLowerCase();
    return available.filter(
      (p) =>
        (p._projectName || "").toLowerCase().includes(q) ||
        (p.id || "").toLowerCase().includes(q) ||
        (p.plant || "").toLowerCase().includes(q) ||
        (p.department || "").toLowerCase().includes(q)
    );
  }, [available, search]);

  const toggleProject = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      // Deselect all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const p of filtered) next.delete(p.id);
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const p of filtered) next.add(p.id);
        return next;
      });
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }
    if (selectedIds.size === 0) {
      setError("Select at least one project");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave({
        id: group?.id,
        name: name.trim(),
        description: description.trim() || null,
        project_ids: [...selectedIds],
      });
      onClose();
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || "Failed to save group");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg grid place-items-center"
              style={{ backgroundColor: "var(--brand-soft, #f0fdf4)", color: "var(--brand, #0d9668)" }}
            >
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{isEdit ? "Edit Group" : "Create Group"}</h2>
              <p className="text-xs text-slate-500">
                {isEdit ? "Update group name and projects" : "Group related projects together"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-slate-100 transition">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Group Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. IT Infrastructure"
              className="w-full h-9 px-3 text-sm bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this group"
              className="w-full h-9 px-3 text-sm bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
            />
          </div>

          {/* Project picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700">
                Select Projects ({selectedIds.size} selected)
              </label>
              {filtered.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="text-[11px] font-medium hover:underline transition"
                  style={{ color: "var(--brand, #0d9668)" }}
                >
                  {selectedIds.size === filtered.length ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects…"
                className="w-full h-9 pl-8 pr-3 text-sm bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition"
              />
            </div>

            {/* Project list */}
            <div className="border border-slate-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400">
                  {search ? "No projects match your search" : "No available projects"}
                </div>
              ) : (
                filtered.map((p) => {
                  const checked = selectedIds.has(p.id);
                  return (
                    <label
                      key={p.id}
                      className={
                        "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors " +
                        (checked ? "bg-emerald-50/50" : "hover:bg-slate-50")
                      }
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleProject(p.id)}
                        className="w-3.5 h-3.5 accent-emerald-600 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p._projectName || p.id}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{p.id}</span>
                          <span>·</span>
                          <span>{p.plant || "—"}</span>
                          <span>·</span>
                          <span>{formatINR(p._orderValue)}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 tabular shrink-0">{p._completion}%</div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="h-9 px-4 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-5 inline-flex items-center gap-2 text-sm font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition active:scale-[0.98]"
            style={{ backgroundColor: "var(--brand, #0d9668)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? "Update Group" : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
