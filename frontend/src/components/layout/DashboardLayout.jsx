import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth, API } from "@/App";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  LayoutDashboard, FileText, Plus, Bell, Users,
  BarChart3, LogOut, Menu, ChevronRight, Zap, Settings, Clock,
  Building2, Hash, Phone, Mail, Layers, MoreVertical, Eye, X, GanttChart
} from "lucide-react";
import { useAccessControl } from "@/hooks/useAccessControl";
import AIChatAssistant from "@/components/AIChatAssistant";
import Tutorial from "@/components/Tutorial";
import { themes, applyTheme } from "@/lib/themes";

const roleLabels = {
  user: "User",
  department_head: "Dept Head",
  buyer: "Buyer",
  capex_head: "Capex Head",
  process_engineering: "Process Eng"
};

const roleColors = {
  user: "bg-blue-500/20 text-blue-300",
  department_head: "bg-purple-500/20 text-purple-300",
  buyer: "bg-amber-500/20 text-amber-300",
  capex_head: "bg-emerald-500/20 text-emerald-300",
  process_engineering: "bg-cyan-500/20 text-cyan-300"
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') || 'aurora');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');
  const [showTutorial, setShowTutorial] = useState(false);
  const [previewRole, setPreviewRole] = useState(() => sessionStorage.getItem('access_preview_role'));
  const { hasAccess } = useAccessControl();

  // Listen for preview mode changes
  useEffect(() => {
    const handler = () => setPreviewRole(sessionStorage.getItem('access_preview_role'));
    window.addEventListener('previewModeChanged', handler);
    return () => window.removeEventListener('previewModeChanged', handler);
  }, []);

  // Check if tutorial should be shown (first time user)
  useEffect(() => {
    const tutorialCompleted = localStorage.getItem('tutorialCompleted');
    if (!tutorialCompleted && user) {
      // Show tutorial after a short delay for better UX
      const timer = setTimeout(() => setShowTutorial(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleStartTutorial = () => {
    setShowTutorial(true);
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    toast.success("Tutorial completed! You're ready to use Capex Portal.");
  };

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get(`${API}/notifications`);
        setNotifications(response.data);
        const unread = response.data.filter(n => !n.read).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`);
      setNotifications(prev => prev.map(n => ({...n, read: true})));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark notifications read:", error);
    }
  };

  // Apply theme CSS variables
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  // Sync theme when navigating back from Settings page
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved && saved !== currentTheme) {
      setCurrentTheme(saved);
    }
  }, [location.pathname]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
    { name: "CAPEX Requests", href: "/requests", icon: FileText, module: "capex_request" },
    { name: "New Request", href: "/requests/new", icon: Plus, roles: ["user", "department_head", "process_engineering"] },
    { name: "Analytics", href: "/analytics", icon: BarChart3, roles: ["buyer", "capex_head"], module: "analytics" },
    { name: "Project Timeline", href: "/project-timeline", icon: GanttChart, roles: ["buyer", "capex_head"] },
  ];

  const filteredNav = navigation.filter(item => {
    // Role check
    if (item.roles && !item.roles.includes(user?.role)) return false;
    // Module access control check - hide if module is completely disabled
    if (item.module) {
      const moduleItems = {
        dashboard: ['card_budget_utilized', 'pending_tasks', 'recent_requests'],
        capex_request: ['basic_info', 'buyer_module'],
        analytics: ['cost_savings_report', 'purchase_trends', 'status_breakdown'],
      };
      const checkItems = moduleItems[item.module] || [];
      const anyVisible = checkItems.some(id => hasAccess(item.module, id));
      if (checkItems.length > 0 && !anyVisible) return false;
    }
    return true;
  });

  const SidebarContent = ({ isCollapsed = false }) => (
    <div className="flex flex-col h-full" style={{ background: `linear-gradient(to bottom, var(--theme-sidebar), var(--theme-sidebar))` }}>
      {/* Header with Logo and Collapse Toggle */}
      <div className="px-3 py-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))` }}
              >
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-white font-['Outfit'] tracking-tight">Capex Portal</div>
                <div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--theme-muted, #64748b)' }}>Enterprise</div>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg mx-auto"
              style={{ background: `linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))` }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 ${isCollapsed ? 'mx-auto mt-2' : ''}`}
            data-testid="sidebar-collapse-btn"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-0.5">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileOpen(false)}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
                  ${isActive 
                    ? "text-white shadow-lg" 
                    : "hover:bg-white/5"
                  }`}
                style={isActive ? { 
                  background: `linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))`,
                  boxShadow: `0 4px 15px color-mix(in srgb, var(--theme-primary) 40%, transparent)`
                } : {
                  color: 'var(--theme-sidebar-text, #94a3b8)'
                }}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && <span className="flex-1">{item.name}</span>}
                {!isCollapsed && isActive && <ChevronRight className="w-3 h-3" />}
              </NavLink>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Sign Out Button */}
      <div className="p-3 border-t border-white/5">
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          title={isCollapsed ? "Sign Out" : undefined}
          className={`w-full h-8 ${isCollapsed ? 'justify-center px-0' : 'justify-start'} text-xs hover:bg-white/5`}
          style={{ color: 'var(--theme-sidebar-text, #94a3b8)' }}
          data-testid="sidebar-logout-btn"
        >
          <LogOut className={`w-3.5 h-3.5 ${isCollapsed ? '' : 'mr-2'}`} />
          {!isCollapsed && "Sign Out"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100 dashboard-layout-enter" data-testid="dashboard-layout">
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}
      >
        <SidebarContent isCollapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-56 border-0">
          <SidebarContent isCollapsed={false} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setIsMobileOpen(true)} data-testid="mobile-menu-btn">
              <Menu className="w-4 h-4" />
            </Button>
            <span className="text-xs text-slate-500 hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8" data-testid="notifications-btn">
                  <Bell className="w-4 h-4 text-slate-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-hidden">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <span className="text-sm font-semibold text-slate-700">Notifications</span>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-blue-600 hover:text-blue-700" onClick={markAllRead}>
                      Mark all read
                    </Button>
                  )}
                </div>
                <ScrollArea className="max-h-72">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {notifications.slice(0, 10).map((n, idx) => (
                        <div 
                          key={n.id || idx} 
                          className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}
                          onClick={async () => {
                            // Mark notification as read
                            if (!n.read && n.id && !n.is_dynamic) {
                              try {
                                await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/notifications/${n.id}/read`, {}, {
                                  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                });
                              } catch (e) { console.log('Failed to mark read:', e); }
                            }
                            setNotificationOpen(false);
                            // Redirect to relevant page
                            if (n.reference_id) {
                              window.location.href = `/requests/${n.reference_id}`;
                            } else if (n.link) {
                              window.location.href = n.link;
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              n.type === 'approval_needed' ? 'bg-amber-100 text-amber-600' :
                              n.type === 'status_update' ? 'bg-blue-100 text-blue-600' :
                              n.type === 'assignment' ? 'bg-purple-100 text-purple-600' :
                              n.type === 'alert' ? 'bg-rose-100 text-rose-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {n.type === 'approval_needed' ? <Clock className="w-4 h-4" /> :
                               n.type === 'assignment' ? <Users className="w-4 h-4" /> :
                               n.type === 'alert' ? <Zap className="w-4 h-4" /> :
                               <Bell className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium ${!n.read ? 'text-slate-800' : 'text-slate-600'}`}>{n.title}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                              {!n.is_dynamic && n.created_at && (
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                            {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 px-3 text-center">
                      <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No notifications yet</p>
                    </div>
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2" data-testid="user-menu-btn">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 text-[10px] font-bold">
                      {user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-slate-700 hidden sm:inline">{user?.name?.split(' ')[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-0">
                {/* Profile Section */}
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-b">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                      <AvatarFallback 
                        className="text-white text-lg font-bold"
                        style={{ background: `linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))` }}
                      >
                        {user?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm text-slate-800">{user?.name}</p>
                      <Badge className={`${roleColors[user?.role]} text-[9px] px-1.5 py-0 h-4`}>
                        {roleLabels[user?.role]}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{user?.plant || 'Jaipur Plant'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Layers className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{user?.department || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Hash className="w-3 h-3 text-slate-400" />
                      <span>{user?.employee_code || user?.id?.slice(-6).toUpperCase() || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{user?.mobile || '+91 XXXXXXXXXX'}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 text-slate-600">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{user?.email}</span>
                    </div>
                  </div>
                </div>
                <div className="p-1">
                  <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => navigate('/settings')}>
                    <Settings className="w-3.5 h-3.5 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs cursor-pointer text-red-600" onClick={logout} data-testid="logout-btn">
                    <LogOut className="w-3.5 h-3.5 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Preview Mode Banner */}
        {previewRole && (() => {
          const roleNames = { user: 'User', buyer: 'Buyer', department_head: 'Dept Head', process_engineering: 'Process Eng.', capex_head: 'Capex Head' };
          const previewColors = { user: '#64748b', buyer: '#10b981', department_head: '#f59e0b', process_engineering: '#8b5cf6', capex_head: '#06b6d4' };
          const color = previewColors[previewRole] || '#64748b';
          return (
            <div className="flex items-center justify-between px-4 py-2 shrink-0"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
              data-testid="preview-banner">
              <div className="flex items-center gap-2 text-white">
                <Eye className="w-4 h-4" />
                <span className="text-xs font-bold">Preview Mode</span>
                <span className="text-xs opacity-80">Viewing portal as</span>
                <Badge className="text-[10px] bg-white/20 text-white border-white/30 font-bold">
                  {roleNames[previewRole] || previewRole}
                </Badge>
              </div>
              <Button size="sm" variant="outline"
                className="h-7 text-xs gap-1.5 bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => {
                  sessionStorage.removeItem('access_preview_role');
                  window.dispatchEvent(new Event('previewModeChanged'));
                  navigate('/admin');
                }}
                data-testid="exit-preview-btn"
              >
                <X className="w-3 h-3" /> Exit Preview
              </Button>
            </div>
          );
        })()}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-2 sm:p-4">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Dialogs removed - Settings now on /settings page */}

      {/* AI Chat Assistant */}
      <AIChatAssistant />

      {/* Interactive Tutorial */}
      <Tutorial 
        isOpen={showTutorial} 
        onClose={() => setShowTutorial(false)}
        onComplete={handleTutorialComplete}
      />
    </div>
  );
}
