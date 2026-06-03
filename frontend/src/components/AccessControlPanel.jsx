import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/App';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Shield, Eye, EyeOff, Pencil, Save, RotateCcw, Loader2,
  ChevronDown, ChevronUp, LayoutDashboard, FileText, BarChart3,
  Check, IndianRupee, Clock, TrendingUp, CheckCircle, Building2,
  Package, UserCheck, ShoppingCart, MessageSquare, Paperclip,
  GitBranch, PieChart, LineChart, ClipboardList, Table2, Wallet,
  ShieldCheck, FlaskConical, Monitor, Layers, Lock, Unlock, ExternalLink
} from 'lucide-react';

/* ─── Role Definitions ─── */
const ROLES = [
  { id: 'user', label: 'User', icon: Monitor, color: '#64748b', ring: 'ring-slate-400' },
  { id: 'buyer', label: 'Buyer', icon: ShoppingCart, color: '#10b981', ring: 'ring-emerald-400' },
  { id: 'department_head', label: 'Dept Head', icon: Building2, color: '#f59e0b', ring: 'ring-amber-400' },
  { id: 'process_engineering', label: 'Process Eng.', icon: Layers, color: '#8b5cf6', ring: 'ring-purple-400' },
  { id: 'capex_head', label: 'Capex Head', icon: ShieldCheck, color: '#06b6d4', ring: 'ring-cyan-400' },
];

/* ─── Item Visual Metadata ─── */
const ITEM_META = {
  card_budget_utilized: { icon: IndianRupee, color: '#10b981' },
  card_pending_approvals: { icon: Clock, color: '#f59e0b' },
  card_cost_savings: { icon: TrendingUp, color: '#3b82f6' },
  card_completion_rate: { icon: CheckCircle, color: '#8b5cf6' },
  card_dept_requests: { icon: Building2, color: '#06b6d4' },
  card_my_requests: { icon: FileText, color: '#a855f7' },
  card_completed: { icon: CheckCircle, color: '#10b981' },
  card_in_progress: { icon: Package, color: '#f97316' },
  card_my_assigned: { icon: UserCheck, color: '#3b82f6' },
  card_purchase_value: { icon: IndianRupee, color: '#8b5cf6' },
  dept_spend_chart: { icon: BarChart3, color: '#06b6d4' },
  buyer_performance_chart: { icon: TrendingUp, color: '#f59e0b' },
  pending_tasks: { icon: ClipboardList, color: '#ef4444' },
  recent_requests: { icon: Table2, color: '#6366f1' },
  cost_savings_widget: { icon: Wallet, color: '#10b981' },
  basic_info: { icon: FileText, color: '#3b82f6' },
  supplier_details: { icon: LineChart, color: '#f97316' },
  buyer_module: { icon: ShoppingCart, color: '#10b981' },
  capex_head_module: { icon: ShieldCheck, color: '#06b6d4' },
  dh_approval: { icon: CheckCircle, color: '#f59e0b' },
  approval_flow: { icon: GitBranch, color: '#8b5cf6' },
  sample_section: { icon: FlaskConical, color: '#ec4899' },
  comments: { icon: MessageSquare, color: '#6366f1' },
  attachments: { icon: Paperclip, color: '#64748b' },
  assigned_buyer: { icon: UserCheck, color: '#10b981' },
  cost_savings_report: { icon: TrendingUp, color: '#10b981' },
  purchase_trends: { icon: LineChart, color: '#3b82f6' },
  vendor_performance: { icon: BarChart3, color: '#f59e0b' },
  department_spend: { icon: PieChart, color: '#06b6d4' },
  status_breakdown: { icon: PieChart, color: '#8b5cf6' },
  buyer_performance: { icon: BarChart3, color: '#f97316' },
};

/* ─── Layout Groups (mimic actual UI layout) ─── */
const MODULE_LAYOUTS = {
  dashboard: [
    { label: 'KPI Statistics Cards', gridClass: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5',
      ids: ['card_budget_utilized','card_pending_approvals','card_cost_savings','card_completion_rate','card_dept_requests','card_my_requests','card_completed','card_in_progress','card_my_assigned','card_purchase_value'] },
    { label: 'Analytics Charts', gridClass: 'grid-cols-1 sm:grid-cols-2',
      ids: ['dept_spend_chart','buyer_performance_chart'] },
    { label: 'Dashboard Widgets', gridClass: 'grid-cols-1 sm:grid-cols-3',
      ids: ['pending_tasks','recent_requests','cost_savings_widget'] },
  ],
  capex_request: [
    { label: 'Request Information', gridClass: 'grid-cols-2 sm:grid-cols-3',
      ids: ['basic_info','supplier_details','assigned_buyer'] },
    { label: 'Action Modules', gridClass: 'grid-cols-1 sm:grid-cols-3',
      ids: ['buyer_module','capex_head_module','dh_approval'] },
    { label: 'Process & Communication', gridClass: 'grid-cols-2 sm:grid-cols-4',
      ids: ['approval_flow','sample_section','comments','attachments'] },
  ],
  analytics: [
    { label: 'Financial Reports', gridClass: 'grid-cols-1 sm:grid-cols-3',
      ids: ['cost_savings_report','purchase_trends','vendor_performance'] },
    { label: 'Operational Analytics', gridClass: 'grid-cols-1 sm:grid-cols-3',
      ids: ['department_spend','status_breakdown','buyer_performance'] },
  ],
};

const MODULE_ICONS = { dashboard: LayoutDashboard, capex_request: FileText, analytics: BarChart3 };
const MODULE_COLORS = { dashboard: '#06b6d4', capex_request: '#f59e0b', analytics: '#8b5cf6' };

/* ─── Item Preview Card ─── */
function ItemCard({ item, meta, modId, selectedRole, modEnabled, theme, onToggleRole, onPermChange, onToggleEnabled }) {
  const isRoleAssigned = item.roles?.includes(selectedRole);
  const isDisabled = !modEnabled;
  const isItemOff = !item.enabled;
  const isVisible = isRoleAssigned && !isDisabled && !isItemOff;
  const IIcon = meta?.icon || LayoutDashboard;
  const itemColor = meta?.color || '#64748b';

  return (
    <div
      className={`relative rounded-xl border-2 transition-all duration-200 overflow-hidden ${
        isDisabled ? 'opacity-30 pointer-events-none border-dashed' :
        isItemOff ? 'opacity-50 border-dashed' :
        isVisible ? 'shadow-sm hover:shadow-md border-solid' : 'border-dashed hover:border-solid'
      }`}
      style={{
        borderColor: isVisible ? `${itemColor}50` : `${theme?.border || '#e2e8f0'}`,
        background: isVisible ? `${itemColor}06` : `${theme?.background || '#fff'}`,
      }}
      data-testid={`item-${item.id}`}
    >
      {/* Main content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: isVisible ? `${itemColor}18` : `${theme?.muted || '#94a3b8'}12`,
                color: isVisible ? itemColor : theme?.muted || '#94a3b8'
              }}>
              <IIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className={`text-[11px] font-semibold truncate ${!isVisible && !isItemOff ? 'line-through' : ''}`}
                style={{ color: isVisible ? theme?.text : theme?.muted }}>
                {item.name}
              </p>
              {item.desc && (
                <p className="text-[9px] truncate mt-0.5" style={{ color: theme?.muted }}>{item.desc}</p>
              )}
            </div>
          </div>
          <Switch
            checked={isRoleAssigned}
            disabled={isDisabled || isItemOff}
            onCheckedChange={() => onToggleRole(modId, item.id)}
            className="shrink-0 scale-90"
            data-testid={`toggle-${item.id}`}
          />
        </div>

        {/* Permission & Enable controls */}
        <div className="mt-2 flex items-center justify-between gap-1">
          {/* Permission level */}
          {isRoleAssigned && !isItemOff ? (
            <div className="flex gap-1">
              {[
                { val: 'view', label: 'View', icon: Eye },
                { val: 'editable', label: 'Edit', icon: Pencil },
              ].map(p => (
                <button key={p.val}
                  className={`flex items-center gap-1 text-[9px] px-2 py-1 rounded-md font-medium border transition-all ${
                    item.permission === p.val ? 'shadow-sm' : 'opacity-40 hover:opacity-80'
                  }`}
                  style={item.permission === p.val
                    ? { borderColor: `${itemColor}40`, background: `${itemColor}12`, color: itemColor }
                    : { borderColor: theme?.border, color: theme?.muted }}
                  onClick={() => onPermChange(modId, item.id, p.val)}
                  data-testid={`perm-${item.id}-${p.val}`}
                >
                  <p.icon className="w-2.5 h-2.5" /> {p.label}
                </button>
              ))}
            </div>
          ) : (
            <Badge variant="outline" className="text-[9px] border-dashed"
              style={{ borderColor: theme?.border, color: theme?.muted }}>
              <EyeOff className="w-2.5 h-2.5 mr-1" /> Hidden
            </Badge>
          )}

          {/* Global enable/disable */}
          {!isDisabled && (
            <button
              className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md border transition-all hover:opacity-100"
              style={{
                borderColor: isItemOff ? '#ef444440' : theme?.border,
                color: isItemOff ? '#ef4444' : theme?.muted,
                background: isItemOff ? '#ef444408' : 'transparent',
                opacity: isItemOff ? 1 : 0.5
              }}
              onClick={() => onToggleEnabled(modId, item.id, !item.enabled)}
              title={isItemOff ? 'Item globally disabled. Click to enable.' : 'Disable for all roles'}
              data-testid={`global-toggle-${item.id}`}
            >
              {isItemOff ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
              {isItemOff ? 'Locked' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function AccessControlPanel({ theme, allUsers = [] }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedRole, setSelectedRole] = useState('buyer');
  const [expandedModules, setExpandedModules] = useState({
    dashboard: true, capex_request: true, analytics: true
  });
  const token = localStorage.getItem('capex_token');
  const headers = { Authorization: `Bearer ${token}` };

  /* ── API ── */
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/access-config`, { headers });
      setConfig(res.data);
      setDirty(false);
    } catch { toast.error('Failed to load access config'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchConfig(); }, []);

  /* ── Mutations ── */
  const toggleRoleForItem = (modId, itemId) => {
    setConfig(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (m.id !== modId) return m;
        return {
          ...m, items: m.items.map(it => {
            if (it.id !== itemId) return it;
            const roles = [...(it.roles || [])];
            const idx = roles.indexOf(selectedRole);
            idx >= 0 ? roles.splice(idx, 1) : roles.push(selectedRole);
            return { ...it, roles };
          })
        };
      })
    }));
    setDirty(true);
  };

  const updatePermission = (modId, itemId, perm) => {
    setConfig(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (m.id !== modId) return m;
        return { ...m, items: m.items.map(it => it.id === itemId ? { ...it, permission: perm } : it) };
      })
    }));
    setDirty(true);
  };

  const toggleItemEnabled = (modId, itemId, enabled) => {
    setConfig(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (m.id !== modId) return m;
        return { ...m, items: m.items.map(it => it.id === itemId ? { ...it, enabled } : it) };
      })
    }));
    setDirty(true);
  };

  const toggleModule = (modId) => {
    setConfig(prev => ({
      ...prev,
      modules: prev.modules.map(m => m.id === modId ? { ...m, enabled: !m.enabled } : m)
    }));
    setDirty(true);
  };

  const toggleAllItemsForRole = (modId) => {
    setConfig(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (m.id !== modId) return m;
        const allVisible = m.items.every(it => it.roles?.includes(selectedRole));
        return {
          ...m, items: m.items.map(it => {
            const roles = [...(it.roles || [])];
            const idx = roles.indexOf(selectedRole);
            if (allVisible) { if (idx >= 0) roles.splice(idx, 1); }
            else { if (idx < 0) roles.push(selectedRole); }
            return { ...it, roles };
          })
        };
      })
    }));
    setDirty(true);
  };

  /* ── Preview as Role ── */
  const startPreview = () => {
    if (dirty) {
      toast.error('Save your changes before previewing');
      return;
    }
    sessionStorage.setItem('access_preview_role', selectedRole);
    window.dispatchEvent(new Event('previewModeChanged'));
    navigate('/dashboard');
  };

  /* ── Save / Reset ── */
  const saveConfig = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/access-config`, {
        modules: config.modules.map(m => ({
          id: m.id, enabled: m.enabled,
          items: m.items.map(it => ({
            id: it.id, enabled: it.enabled, permission: it.permission,
            roles: it.roles, user_overrides: it.user_overrides || []
          }))
        }))
      }, { headers });
      toast.success('Access control configuration saved');
      setDirty(false);
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const resetConfig = async () => {
    if (!window.confirm('Reset all access settings to defaults? This cannot be undone.')) return;
    try {
      await axios.post(`${API}/admin/access-config/reset`, {}, { headers });
      toast.success('Reset to defaults');
      fetchConfig();
    } catch { toast.error('Failed to reset'); }
  };

  /* ── Computed ── */
  const roleStats = useMemo(() => {
    if (!config) return {};
    const stats = {};
    ROLES.forEach(r => {
      let total = 0, visible = 0;
      config.modules.forEach(m => {
        m.items.forEach(it => {
          total++;
          if (m.enabled && it.enabled && it.roles?.includes(r.id)) visible++;
        });
      });
      stats[r.id] = { total, visible };
    });
    return stats;
  }, [config]);

  const selectedRoleMeta = ROLES.find(r => r.id === selectedRole);

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: theme?.primary }} />
    </div>
  );
  if (!config) return <p className="text-sm text-center py-8" style={{ color: theme?.muted }}>Failed to load</p>;

  return (
    <div className="space-y-5" data-testid="access-control-panel">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold font-mono flex items-center gap-2" style={{ color: theme?.text }}>
            <Shield className="w-4 h-4" style={{ color: theme?.primary }} /> Access Control
          </h2>
          <p className="text-xs mt-0.5" style={{ color: theme?.muted }}>
            Select a role to preview and control what they see
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={resetConfig}
            style={{ borderColor: theme?.border, color: theme?.muted }} data-testid="reset-access-btn">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 text-white" onClick={saveConfig} disabled={!dirty || saving}
            style={{ background: dirty ? `linear-gradient(135deg, ${theme?.primary}, ${theme?.secondary})` : theme?.muted }}
            data-testid="save-access-btn">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* ── Role Selector ── */}
      <div className="p-2 rounded-xl border" style={{ borderColor: theme?.border, background: theme?.card }}>
        <div className="flex flex-wrap gap-2">
          {ROLES.map(role => {
            const isActive = selectedRole === role.id;
            const RIcon = role.icon;
            const stats = roleStats[role.id] || { total: 0, visible: 0 };
            return (
              <button key={role.id} onClick={() => setSelectedRole(role.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border-2 ${
                  isActive ? 'shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                style={isActive
                  ? { borderColor: role.color, background: `${role.color}12`, color: role.color }
                  : { color: theme?.muted }
                }
                data-testid={`role-tab-${role.id}`}
              >
                <RIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{role.label}</span>
                <Badge variant="outline" className="text-[9px] ml-0.5 font-mono h-5 px-1.5"
                  style={{
                    borderColor: isActive ? `${role.color}40` : theme?.border,
                    color: isActive ? role.color : theme?.muted
                  }}>
                  {stats.visible}/{stats.total}
                </Badge>
                {isActive && (
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
                    style={{ background: role.color }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Role Preview Summary ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border"
        style={{ borderColor: `${selectedRoleMeta?.color}30`, background: `${selectedRoleMeta?.color}06` }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${selectedRoleMeta?.color}15`, color: selectedRoleMeta?.color }}>
          {selectedRoleMeta && <selectedRoleMeta.icon className="w-4 h-4" />}
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold" style={{ color: theme?.text }}>
            Previewing: <span style={{ color: selectedRoleMeta?.color }}>{selectedRoleMeta?.label}</span>
          </p>
          <p className="text-[10px]" style={{ color: theme?.muted }}>
            Toggle switches to show/hide elements for this role. Changes apply after saving.
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-mono px-3 py-1"
          style={{ borderColor: `${selectedRoleMeta?.color}40`, color: selectedRoleMeta?.color }}>
          {roleStats[selectedRole]?.visible || 0} / {roleStats[selectedRole]?.total || 0} visible
        </Badge>
        <Button size="sm" className="h-8 text-xs gap-1.5 text-white shadow-md"
          style={{ background: `linear-gradient(135deg, ${selectedRoleMeta?.color}, ${selectedRoleMeta?.color}cc)` }}
          onClick={startPreview}
          data-testid="preview-as-role-btn"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Preview as {selectedRoleMeta?.label}
        </Button>
      </div>

      {/* ── Module Sections ── */}
      {config.modules.map(mod => {
        const layout = MODULE_LAYOUTS[mod.id] || [];
        const ModIcon = MODULE_ICONS[mod.id] || LayoutDashboard;
        const modColor = MODULE_COLORS[mod.id] || theme?.primary;
        const isOpen = expandedModules[mod.id];
        const itemMap = {};
        mod.items.forEach(it => { itemMap[it.id] = it; });
        const visibleCount = mod.items.filter(it => mod.enabled && it.enabled && it.roles?.includes(selectedRole)).length;
        const allVisible = mod.items.length > 0 && mod.items.every(it => it.roles?.includes(selectedRole));

        return (
          <Card key={mod.id} className="border shadow-sm overflow-hidden"
            style={{ borderColor: theme?.border, background: theme?.card }}
            data-testid={`module-${mod.id}`}>

            {/* Module Header */}
            <div className="flex items-center gap-3 p-4 cursor-pointer select-none"
              onClick={() => setExpandedModules(p => ({ ...p, [mod.id]: !p[mod.id] }))}
              style={{ borderBottom: isOpen ? `1px solid ${theme?.border}` : 'none' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${modColor}15`, color: modColor }}>
                <ModIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold" style={{ color: theme?.text }}>{mod.name}</h3>
                  <Badge variant="outline" className="text-[9px] border font-mono"
                    style={{ borderColor: theme?.border, color: theme?.muted }}>
                    {visibleCount}/{mod.items.length} for {selectedRoleMeta?.label}
                  </Badge>
                </div>
                <p className="text-[11px]" style={{ color: theme?.muted }}>{mod.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                {/* Select All / Deselect All */}
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 px-2 hidden sm:flex"
                  style={{ borderColor: theme?.border, color: modColor }}
                  onClick={() => toggleAllItemsForRole(mod.id)}
                  data-testid={`select-all-${mod.id}`}
                >
                  {allVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {allVisible ? 'Hide All' : 'Show All'}
                </Button>
                <Switch
                  checked={mod.enabled}
                  onCheckedChange={() => toggleModule(mod.id)}
                  data-testid={`module-toggle-${mod.id}`}
                />
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: theme?.muted }} /> :
                <ChevronDown className="w-4 h-4 shrink-0" style={{ color: theme?.muted }} />}
            </div>

            {/* Module Content - Visual Preview */}
            {isOpen && (
              <div className="p-4 space-y-5">
                {!mod.enabled && (
                  <div className="px-4 py-3 rounded-lg text-xs flex items-center gap-2"
                    style={{ background: '#ef444408', color: '#ef4444' }}>
                    <EyeOff className="w-3.5 h-3.5" /> Module disabled. All items are hidden for non-admin users.
                  </div>
                )}

                {layout.map((group, gi) => {
                  const groupItems = group.ids.map(id => itemMap[id]).filter(Boolean);
                  if (groupItems.length === 0) return null;

                  return (
                    <div key={gi}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: modColor }} />
                        <h4 className="text-[10px] uppercase tracking-wider font-bold"
                          style={{ color: modColor }}>
                          {group.label}
                        </h4>
                        <div className="flex-1 h-px" style={{ background: `${modColor}20` }} />
                        <span className="text-[9px] font-mono" style={{ color: theme?.muted }}>
                          {groupItems.filter(it => it.roles?.includes(selectedRole) && it.enabled).length}/{groupItems.length}
                        </span>
                      </div>
                      <div className={`grid gap-2.5 ${group.gridClass}`}>
                        {groupItems.map(item => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            meta={ITEM_META[item.id]}
                            modId={mod.id}
                            selectedRole={selectedRole}
                            modEnabled={mod.enabled}
                            theme={theme}
                            onToggleRole={toggleRoleForItem}
                            onPermChange={updatePermission}
                            onToggleEnabled={toggleItemEnabled}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Catch-all: items not in layout groups */}
                {(() => {
                  const layoutIds = layout.flatMap(g => g.ids);
                  const otherItems = mod.items.filter(it => !layoutIds.includes(it.id));
                  if (otherItems.length === 0) return null;
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme?.muted }} />
                        <h4 className="text-[10px] uppercase tracking-wider font-bold" style={{ color: theme?.muted }}>
                          Other Items
                        </h4>
                        <div className="flex-1 h-px" style={{ background: `${theme?.muted}20` }} />
                      </div>
                      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3">
                        {otherItems.map(item => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            meta={ITEM_META[item.id]}
                            modId={mod.id}
                            selectedRole={selectedRole}
                            modEnabled={mod.enabled}
                            theme={theme}
                            onToggleRole={toggleRoleForItem}
                            onPermChange={updatePermission}
                            onToggleEnabled={toggleItemEnabled}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </Card>
        );
      })}

      {/* ── Footer ── */}
      {config.updated_at && (
        <p className="text-[10px] text-center pt-2" style={{ color: theme?.muted }}>
          Last saved: {new Date(config.updated_at).toLocaleString()} {config.updated_by && `by ${config.updated_by}`}
        </p>
      )}
    </div>
  );
}
