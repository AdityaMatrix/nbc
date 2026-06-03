import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import { useNavigate, Navigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, Building2, Layers, Shield, LogOut, Plus, Pencil, Trash2,
  RefreshCw, KeyRound, CheckCircle, XCircle, BarChart3, Loader2, Palette,
  Mail, User, Hash, Phone, Lock, UserCog, MapPin
} from "lucide-react";
import { themes, applyTheme } from "@/lib/themes";
import AccessControlPanel from "@/components/AccessControlPanel";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [plants, setPlants] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [departmentHeads, setDepartmentHeads] = useState([]);
  const [capexHeads, setCapexHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('admin_theme') || 'aurora');

  const [plantDialog, setPlantDialog] = useState({ open: false, mode: "add", data: null });
  const [deptDialog, setDeptDialog] = useState({ open: false, mode: "add", data: null });
  const [userDialog, setUserDialog] = useState({ open: false, mode: "add", data: null });
  const [formData, setFormData] = useState({});

  const token = localStorage.getItem("capex_token");
  const headers = { Authorization: `Bearer ${token}` };

  // Get current theme object
  const theme = themes[currentTheme] || themes.aurora;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, plantsRes, deptsRes, usersRes, resetsRes, dhRes, chRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/plants`, { headers }),
        axios.get(`${API}/admin/departments`, { headers }),
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/password-reset-requests`, { headers }),
        axios.get(`${API}/admin/department-heads`, { headers }),
        axios.get(`${API}/admin/capex-heads`, { headers }),
      ]);
      setStats(statsRes.data);
      setPlants(plantsRes.data);
      setDepartments(deptsRes.data);
      setUsers(usersRes.data);
      setResetRequests(resetsRes.data);
      setDepartmentHeads(dhRes.data);
      setCapexHeads(chRes.data);
    } catch (err) {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Apply admin theme
  useEffect(() => {
    applyTheme(currentTheme);
    localStorage.setItem('admin_theme', currentTheme);
  }, [currentTheme]);

  if (user && user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const handleLogout = () => { logout(); navigate("/login"); };

  const savePlant = async () => {
    try {
      if (plantDialog.mode === "add") {
        await axios.post(`${API}/admin/plants`, { name: formData.name }, { headers });
        toast.success("Plant added");
      } else {
        await axios.put(`${API}/admin/plants/${plantDialog.data.id}`, { name: formData.name }, { headers });
        toast.success("Plant updated");
      }
      setPlantDialog({ open: false, mode: "add", data: null });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const deletePlant = async (id) => {
    if (!window.confirm("Delete this plant?")) return;
    try { await axios.delete(`${API}/admin/plants/${id}`, { headers }); toast.success("Plant deleted"); fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const saveDept = async () => {
    try {
      if (deptDialog.mode === "add") {
        await axios.post(`${API}/admin/departments`, { name: formData.name, plant: formData.plant }, { headers });
        toast.success("Department added");
      } else {
        await axios.put(`${API}/admin/departments/${deptDialog.data.id}`, { name: formData.name, plant: formData.plant }, { headers });
        toast.success("Department updated");
      }
      setDeptDialog({ open: false, mode: "add", data: null });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const deleteDept = async (id) => {
    if (!window.confirm("Delete this department?")) return;
    try { await axios.delete(`${API}/admin/departments/${id}`, { headers }); toast.success("Department deleted"); fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const saveUser = async () => {
    try {
      if (userDialog.mode === "add") {
        await axios.post(`${API}/admin/users`, formData, { headers });
        toast.success("User created");
      } else {
        await axios.put(`${API}/admin/users/${userDialog.data.id}`, formData, { headers });
        toast.success("User updated");
      }
      setUserDialog({ open: false, mode: "add", data: null });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try { await axios.delete(`${API}/admin/users/${id}`, { headers }); toast.success("User deleted"); fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const resetPassword = async (id) => {
    if (!window.confirm("Reset password to 'password123'?")) return;
    try { await axios.post(`${API}/admin/users/${id}/reset-password`, {}, { headers }); toast.success("Password reset"); }
    catch (err) { toast.error("Failed"); }
  };

  const approveReset = async (id) => {
    try { await axios.post(`${API}/admin/password-reset-requests/${id}/approve`, {}, { headers }); toast.success("Approved"); fetchAll();
    } catch (err) { toast.error("Failed"); }
  };

  const rejectReset = async (id) => {
    try { await axios.post(`${API}/admin/password-reset-requests/${id}/reject`, {}, { headers }); toast.success("Rejected"); fetchAll();
    } catch (err) { toast.error("Failed"); }
  };

  const roles = [
    { value: "user", label: "User" },
    { value: "department_head", label: "Department Head" },
    { value: "buyer", label: "Buyer" },
    { value: "capex_head", label: "Capex Head" },
    { value: "process_engineering", label: "Process Engineering" },
    { value: "admin", label: "Admin" },
  ];

  const roleColor = (r) => {
    const m = {
      admin: "bg-red-100 text-red-700 border-red-200",
      capex_head: "bg-cyan-100 text-cyan-700 border-cyan-200",
      buyer: "bg-emerald-100 text-emerald-700 border-emerald-200",
      department_head: "bg-amber-100 text-amber-700 border-amber-200",
      process_engineering: "bg-purple-100 text-purple-700 border-purple-200",
      user: "bg-slate-100 text-slate-600 border-slate-200"
    };
    return m[r] || m.user;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: theme.background }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.primary }} />
    </div>
  );

  const pendingResets = resetRequests.filter(r => r.status === "pending");

  const StatCard = ({ label, value, icon: Icon, iconColor }) => (
    <Card className="border shadow-sm hover:shadow-md transition-shadow" style={{ borderColor: theme.border, background: theme.card }}>
      <CardContent className="p-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
          style={{ background: `${iconColor}15`, color: iconColor }}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-2xl font-bold font-mono" style={{ color: theme.text }}>{value ?? 0}</p>
        <p className="text-[10px] uppercase tracking-wider font-mono mt-1" style={{ color: theme.muted }}>{label}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: theme.background }} data-testid="admin-dashboard">
      {/* Header */}
      <header className="border-b px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20"
        style={{ background: theme.sidebar, borderColor: `${theme.sidebarText}20` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold font-['Outfit']" style={{ color: theme.sidebarText }}>Admin Panel</h1>
            <p className="text-[9px] uppercase tracking-widest font-mono" style={{ color: `${theme.sidebarText}80` }}>CAPEX Portal Administration</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={fetchAll} className="h-8 text-xs"
            style={{ color: `${theme.sidebarText}cc` }}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={handleLogout}
            className="h-8 text-xs border-red-400/30 text-red-300 hover:bg-red-500/10" data-testid="admin-logout-btn">
            <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-10 gap-1 mb-6 p-1 border overflow-x-auto flex-wrap sm:flex-nowrap" style={{ background: theme.card, borderColor: theme.border }}>
            <TabsTrigger value="overview" data-testid="admin-tab-overview"
              className="text-xs gap-1.5 font-mono data-[state=active]:shadow-sm"
              style={{ '--tw-shadow-color': `${theme.primary}30` }}>
              <BarChart3 className="w-3.5 h-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="plants" data-testid="admin-tab-plants"
              className="text-xs gap-1.5 font-mono data-[state=active]:shadow-sm">
              <Building2 className="w-3.5 h-3.5" /> Plants
            </TabsTrigger>
            <TabsTrigger value="departments" data-testid="admin-tab-departments"
              className="text-xs gap-1.5 font-mono data-[state=active]:shadow-sm">
              <Layers className="w-3.5 h-3.5" /> Departments
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="admin-tab-users"
              className="text-xs gap-1.5 font-mono data-[state=active]:shadow-sm">
              <Users className="w-3.5 h-3.5" /> Users
            </TabsTrigger>
            <TabsTrigger value="resets" data-testid="admin-tab-resets"
              className="text-xs gap-1.5 font-mono data-[state=active]:shadow-sm relative">
              <KeyRound className="w-3.5 h-3.5" /> Resets
              {pendingResets.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{pendingResets.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="themes" data-testid="admin-tab-themes"
              className="text-xs gap-1.5 font-mono data-[state=active]:shadow-sm">
              <Palette className="w-3.5 h-3.5" /> Themes
            </TabsTrigger>
            <TabsTrigger value="access" data-testid="admin-tab-access"
              className="text-xs gap-1.5 font-mono data-[state=active]:shadow-sm">
              <Shield className="w-3.5 h-3.5" /> Access Control
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard label="Total Users" value={stats?.total_users} icon={Users} iconColor={theme.primary} />
              <StatCard label="Total Requests" value={stats?.total_requests} icon={BarChart3} iconColor={theme.success} />
              <StatCard label="Plants" value={stats?.total_plants} icon={Building2} iconColor={theme.warning} />
              <StatCard label="Departments" value={stats?.total_departments} icon={Layers} iconColor={theme.secondary} />
              <StatCard label="Pending Resets" value={stats?.pending_resets} icon={KeyRound} iconColor={theme.error} />
            </div>
            {stats?.role_breakdown && (
              <Card className="mt-6 border shadow-sm" style={{ borderColor: theme.border, background: theme.card }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider font-mono" style={{ color: theme.muted }}>Users by Role</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.role_breakdown).map(([role, count]) => (
                      <Badge key={role} variant="outline" className={`${roleColor(role)} text-[10px] px-3 py-1 border font-mono`}>
                        {role.replace(/_/g, " ")}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* PLANTS */}
          <TabsContent value="plants">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold font-mono" style={{ color: theme.text }}>Plants ({plants.length})</h2>
              <Button size="sm" className="h-8 text-xs text-white"
                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                onClick={() => { setFormData({ name: "" }); setPlantDialog({ open: true, mode: "add", data: null }); }} data-testid="add-plant-btn">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Plant
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {plants.map(p => (
                <Card key={p.id} className="border shadow-sm" style={{ borderColor: theme.border, background: theme.card }}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5" style={{ color: theme.warning }} />
                      <span className="text-sm font-medium" style={{ color: theme.text }}>{p.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                        style={{ color: theme.muted }}
                        onClick={() => { setFormData({ name: p.name }); setPlantDialog({ open: true, mode: "edit", data: p }); }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deletePlant(p.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* DEPARTMENTS */}
          <TabsContent value="departments">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold font-mono" style={{ color: theme.text }}>Departments ({departments.length})</h2>
              <Button size="sm" className="h-8 text-xs text-white"
                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                onClick={() => { setFormData({ name: "", plant: "" }); setDeptDialog({ open: true, mode: "add", data: null }); }} data-testid="add-dept-btn">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Department
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {departments.map(d => (
                <Card key={d.id} className="border shadow-sm" style={{ borderColor: theme.border, background: theme.card }}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Layers className="w-5 h-5" style={{ color: theme.secondary }} />
                      <div>
                        <span className="text-sm font-medium" style={{ color: theme.text }}>{d.name}</span>
                        {d.plant && <p className="text-[10px]" style={{ color: theme.muted }}>{d.plant}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                        style={{ color: theme.muted }}
                        onClick={() => { setFormData({ name: d.name, plant: d.plant || "" }); setDeptDialog({ open: true, mode: "edit", data: d }); }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteDept(d.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold font-mono" style={{ color: theme.text }}>Users ({users.length})</h2>
              <Button size="sm" className="h-8 text-xs text-white"
                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                onClick={() => { setFormData({ email: "", name: "", role: "user", password: "", department: "", plant: "", employee_id: "", mobile: "", mapped_dh_id: "" }); setUserDialog({ open: true, mode: "add", data: null }); }} data-testid="add-user-btn">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add User
              </Button>
            </div>
            <div className="overflow-x-auto rounded-xl border shadow-sm" style={{ borderColor: theme.border, background: theme.card }}>
              <table className="w-full text-xs">
                <thead className="border-b" style={{ borderColor: theme.border }}>
                  <tr>
                    <th className="text-left p-3 font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.muted }}>Name</th>
                    <th className="text-left p-3 font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.muted }}>Email</th>
                    <th className="text-left p-3 font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.muted }}>Emp ID</th>
                    <th className="text-left p-3 font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.muted }}>Mobile</th>
                    <th className="text-left p-3 font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.muted }}>Role</th>
                    <th className="text-left p-3 font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.muted }}>Dept / Plant</th>
                    <th className="text-left p-3 font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.muted }}>Mapped To</th>
                    <th className="text-right p-3 font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.muted }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const mappedPerson = [...departmentHeads, ...capexHeads].find(d => d.id === u.mapped_dh_id);
                    return (
                    <tr key={u.id} className="border-b last:border-b-0 hover:opacity-80 transition-opacity" style={{ borderColor: `${theme.border}80` }}>
                      <td className="p-3 font-medium" style={{ color: theme.text }}>{u.name}</td>
                      <td className="p-3 font-mono text-[10px]" style={{ color: theme.muted }}>{u.email}</td>
                      <td className="p-3 font-mono text-[10px]" style={{ color: theme.muted }}>{u.employee_id || "-"}</td>
                      <td className="p-3 text-[10px]" style={{ color: theme.muted }}>{u.mobile || "-"}</td>
                      <td className="p-3"><Badge className={`${roleColor(u.role)} text-[10px] border font-mono`}>{u.role?.replace(/_/g, " ")}</Badge></td>
                      <td className="p-3 text-[10px]" style={{ color: theme.muted }}>{[u.department, u.plant].filter(Boolean).join(" / ") || "-"}</td>
                      <td className="p-3 text-[10px]" style={{ color: theme.muted }}>{mappedPerson ? `${mappedPerson.name} (${mappedPerson.role?.replace(/_/g," ")})` : (u.mapped_dh_id ? "Unknown" : "-")}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            style={{ color: theme.muted }}
                            onClick={() => { setFormData({ name: u.name, email: u.email, role: u.role, department: u.department || "", plant: u.plant || "", employee_id: u.employee_id || "", mobile: u.mobile || "", mapped_dh_id: u.mapped_dh_id || "" }); setUserDialog({ open: true, mode: "edit", data: u }); }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-500 hover:text-amber-600" title="Reset password" onClick={() => resetPassword(u.id)}>
                            <KeyRound className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => deleteUser(u.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* PASSWORD RESETS */}
          <TabsContent value="resets">
            <h2 className="text-sm font-semibold font-mono mb-4" style={{ color: theme.text }}>Password Reset Requests</h2>
            {resetRequests.length === 0 ? (
              <div className="text-center py-12" style={{ color: theme.muted }}>
                <KeyRound className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-mono">No reset requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {resetRequests.map(r => (
                  <Card key={r.id} className="border shadow-sm" style={{ borderColor: theme.border, background: theme.card }}>
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium" style={{ color: theme.text }}>{r.user_name} ({r.email})</p>
                        <p className="text-[10px] font-mono" style={{ color: theme.muted }}>{new Date(r.created_at).toLocaleString()}</p>
                      </div>
                      {r.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => approveReset(r.id)}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50" onClick={() => rejectReset(r.id)}>
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline" className={`border font-mono text-[10px] ${r.status === "approved" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                          {r.status} {r.processed_by && `by ${r.processed_by}`}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* THEMES */}
          <TabsContent value="themes">
            <div className="mb-6">
              <h2 className="text-sm font-semibold font-mono mb-1" style={{ color: theme.text }}>Admin Panel Theme</h2>
              <p className="text-xs" style={{ color: theme.muted }}>Choose a theme for the admin panel. This applies to admin page only.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Object.entries(themes).map(([id, t]) => (
                <button key={id} onClick={() => { setCurrentTheme(id); toast.success(`Theme set to ${t.name}`); }}
                  className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] hover:shadow-lg ${currentTheme === id ? "ring-2 ring-offset-2 shadow-lg" : ""}`}
                  style={{
                    borderColor: currentTheme === id ? theme.primary : theme.border,
                    background: theme.card,
                    ...(currentTheme === id ? { ringColor: theme.primary } : {})
                  }}
                  data-testid={`theme-${id}`}>
                  <div className="w-full h-10 rounded-lg mb-3" style={{ background: t.preview }} />
                  <p className="text-xs font-semibold" style={{ color: theme.text }}>{t.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: theme.muted }}>{t.description}</p>
                  {currentTheme === id && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-mono" style={{ color: theme.primary }}>
                      <CheckCircle className="w-3 h-3" /> Active
                    </div>
                  )}
                </button>
              ))}
            </div>
          </TabsContent>

          {/* ACCESS CONTROL */}
          <TabsContent value="access">
            <AccessControlPanel theme={theme} allUsers={users} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Plant Dialog */}
      <Dialog open={plantDialog.open} onOpenChange={(v) => setPlantDialog(prev => ({ ...prev, open: v }))}>
        <DialogContent className="max-w-sm" style={{ background: theme.card, borderColor: theme.border }}>
          <DialogHeader>
            <DialogTitle style={{ color: theme.text }}>{plantDialog.mode === "add" ? "Add Plant" : "Edit Plant"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium" style={{ color: theme.text }}>Plant Name</Label>
              <Input placeholder="Enter plant name" value={formData.name || ""} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                className="border" style={{ borderColor: theme.border }} data-testid="plant-name-input" />
            </div>
            <Button className="w-full text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }} onClick={savePlant} data-testid="save-plant-btn">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Department Dialog */}
      <Dialog open={deptDialog.open} onOpenChange={(v) => setDeptDialog(prev => ({ ...prev, open: v }))}>
        <DialogContent className="max-w-sm" style={{ background: theme.card, borderColor: theme.border }}>
          <DialogHeader>
            <DialogTitle style={{ color: theme.text }}>{deptDialog.mode === "add" ? "Add Department" : "Edit Department"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium" style={{ color: theme.text }}>Department Name</Label>
              <Input placeholder="Enter department name" value={formData.name || ""} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                className="border" style={{ borderColor: theme.border }} data-testid="dept-name-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium" style={{ color: theme.text }}>Plant (Optional)</Label>
              <Select value={formData.plant || ""} onValueChange={v => setFormData(p => ({ ...p, plant: v }))}>
                <SelectTrigger className="border" style={{ borderColor: theme.border }} data-testid="dept-plant-select">
                  <SelectValue placeholder="Select plant" />
                </SelectTrigger>
                <SelectContent>
                  {plants.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }} onClick={saveDept} data-testid="save-dept-btn">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Dialog - Professional Form */}
      <Dialog open={userDialog.open} onOpenChange={(v) => setUserDialog(prev => ({ ...prev, open: v }))}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: theme.card, borderColor: theme.border }}>
          <DialogHeader className="pb-4 border-b" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
                <UserCog className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg" style={{ color: theme.text }}>
                  {userDialog.mode === "add" ? "Create New User" : "Edit User Details"}
                </DialogTitle>
                <p className="text-xs mt-0.5" style={{ color: theme.muted }}>
                  {userDialog.mode === "add" ? "Fill in the details to create a new user account" : "Update the user information below"}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Personal Information Section */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"
                style={{ color: theme.primary }}>
                <User className="w-3.5 h-3.5" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5" style={{ color: theme.text }}>
                    <Mail className="w-3 h-3" style={{ color: theme.muted }} /> Email ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="user@company.com"
                    type="email"
                    value={formData.email || ""}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="border h-10"
                    style={{ borderColor: theme.border }}
                    data-testid="user-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5" style={{ color: theme.text }}>
                    <User className="w-3 h-3" style={{ color: theme.muted }} /> Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="John Doe"
                    value={formData.name || ""}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="border h-10"
                    style={{ borderColor: theme.border }}
                    data-testid="user-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5" style={{ color: theme.text }}>
                    <Hash className="w-3 h-3" style={{ color: theme.muted }} /> Employee ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="EMP-001"
                    value={formData.employee_id || ""}
                    onChange={e => setFormData(p => ({ ...p, employee_id: e.target.value }))}
                    className="border h-10"
                    style={{ borderColor: theme.border }}
                    data-testid="user-empid-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5" style={{ color: theme.text }}>
                    <Phone className="w-3 h-3" style={{ color: theme.muted }} /> Mobile Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="+91 9876543210"
                    value={formData.mobile || ""}
                    onChange={e => setFormData(p => ({ ...p, mobile: e.target.value }))}
                    className="border h-10"
                    style={{ borderColor: theme.border }}
                    data-testid="user-mobile-input"
                  />
                </div>
              </div>
            </div>

            {/* Account Setup Section */}
            <div className="border-t pt-6" style={{ borderColor: theme.border }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"
                style={{ color: theme.primary }}>
                <Shield className="w-3.5 h-3.5" />
                Account Setup
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {userDialog.mode === "add" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-1.5" style={{ color: theme.text }}>
                      <Lock className="w-3 h-3" style={{ color: theme.muted }} /> Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Min. 6 characters"
                      type="password"
                      value={formData.password || ""}
                      onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                      className="border h-10"
                      style={{ borderColor: theme.border }}
                      data-testid="user-password-input"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5" style={{ color: theme.text }}>
                    <UserCog className="w-3 h-3" style={{ color: theme.muted }} /> Role <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.role || "user"} onValueChange={v => setFormData(p => ({ ...p, role: v, ...(["capex_head", "process_engineering", "admin"].includes(v) ? { department: "", plant: "", mapped_dh_id: "" } : { mapped_dh_id: "" }) }))}>
                    <SelectTrigger className="border h-10" style={{ borderColor: theme.border }} data-testid="user-role-select">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Plant & Department - shown for "user" or "department_head" */}
            {(formData.role === "user" || formData.role === "department_head") && (
              <div className="border-t pt-6" style={{ borderColor: theme.border }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"
                  style={{ color: theme.primary }}>
                  <MapPin className="w-3.5 h-3.5" />
                  Location Assignment
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium" style={{ color: theme.text }}>
                      Plant <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.plant || "none"} onValueChange={v => setFormData(p => ({ ...p, plant: v === "none" ? "" : v }))}>
                      <SelectTrigger className="border h-10" style={{ borderColor: theme.border }} data-testid="user-plant-select">
                        <SelectValue placeholder="Select Plant" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select Plant</SelectItem>
                        {plants.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium" style={{ color: theme.text }}>
                      Department <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.department || "none"} onValueChange={v => setFormData(p => ({ ...p, department: v === "none" ? "" : v }))}>
                      <SelectTrigger className="border h-10" style={{ borderColor: theme.border }} data-testid="user-dept-select">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select Department</SelectItem>
                        {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Map to DH - for "user" role */}
            {formData.role === "user" && (
              <div className="border-t pt-6" style={{ borderColor: theme.border }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"
                  style={{ color: theme.warning }}>
                  <Users className="w-3.5 h-3.5" />
                  Reporting Manager
                </h3>
                <div className="space-y-2">
                  <Label className="text-xs font-medium" style={{ color: theme.text }}>
                    Department Head <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.mapped_dh_id || "none"} onValueChange={v => setFormData(p => ({ ...p, mapped_dh_id: v === "none" ? "" : v }))}>
                    <SelectTrigger className="border h-10" style={{ borderColor: theme.border }} data-testid="user-dh-select">
                      <SelectValue placeholder="Select Department Head" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select DH</SelectItem>
                      {departmentHeads.map(dh => (
                        <SelectItem key={dh.id} value={dh.id}>{dh.name} ({dh.department || 'No dept'})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Map to Capex Head - for "buyer" role */}
            {formData.role === "buyer" && (
              <div className="border-t pt-6" style={{ borderColor: theme.border }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"
                  style={{ color: theme.secondary }}>
                  <Users className="w-3.5 h-3.5" />
                  Reporting Manager
                </h3>
                <div className="space-y-2">
                  <Label className="text-xs font-medium" style={{ color: theme.text }}>
                    Capex Head <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.mapped_dh_id || "none"} onValueChange={v => setFormData(p => ({ ...p, mapped_dh_id: v === "none" ? "" : v }))}>
                    <SelectTrigger className="border h-10" style={{ borderColor: theme.border }} data-testid="user-ch-select">
                      <SelectValue placeholder="Select Capex Head" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select Capex Head</SelectItem>
                      {capexHeads.map(ch => (
                        <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="border-t pt-6" style={{ borderColor: theme.border }}>
              <Button className="w-full h-11 text-sm font-medium text-white"
                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                onClick={saveUser} data-testid="save-user-btn">
                {userDialog.mode === "add" ? "Create User Account" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
