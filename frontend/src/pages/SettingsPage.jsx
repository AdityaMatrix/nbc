import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "@/App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { themes, applyTheme } from "@/lib/themes";
import { toast } from "sonner";
import { 
  Settings, Palette, Type, Key, LayoutDashboard, GripVertical,
  Eye, EyeOff, RotateCcw, Save, ArrowLeft, BookOpen, PlayCircle,
  Download, GraduationCap, CheckCircle, ChevronUp, ChevronDown
} from "lucide-react";

// Theme entries for rendering
const themeEntries = Object.entries(themes);

// Default dashboard widgets configuration
const defaultWidgets = [
  { id: 'stats_cards', name: 'Statistics Cards', description: 'Overview metrics and KPIs', visible: true, order: 1 },
  { id: 'analytics', name: 'Executive Analytics', description: 'Department spend & buyer performance', visible: true, order: 2 },
  { id: 'pending_tasks', name: 'Pending Tasks', description: 'Tasks requiring your attention (Buyer only)', visible: true, order: 3 },
  { id: 'recent_requests', name: 'Requests Table', description: 'Main table with all capex requests', visible: true, order: 4 },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Appearance settings
  const [fontSize, setFontSize] = useState(localStorage.getItem('fontSize') || 'small');
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') || 'aurora');
  
  // Password change
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Dashboard customization
  const [widgets, setWidgets] = useState(() => {
    const saved = localStorage.getItem('dashboardWidgets');
    return saved ? JSON.parse(saved) : defaultWidgets;
  });
  const [draggedWidget, setDraggedWidget] = useState(null);

  // Apply theme
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  // Apply font size
  useEffect(() => {
    document.documentElement.classList.remove('text-sm', 'text-base', 'text-lg');
    document.documentElement.classList.add(
      fontSize === 'small' ? 'text-sm' : fontSize === 'medium' ? 'text-base' : 'text-lg'
    );
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error("New passwords don't match");
      return;
    }
    if (passwordData.new.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setIsChangingPassword(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        current_password: passwordData.current,
        new_password: passwordData.new
      });
      toast.success("Password changed successfully");
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const toggleWidgetVisibility = (widgetId) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    ));
  };

  const handleDragStart = (e, widget) => {
    setDraggedWidget(widget);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', widget.id);
  };

  const handleDragOver = (e, targetWidget) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedWidget || draggedWidget.id === targetWidget.id) return;
  };

  const handleDrop = (e, targetWidget) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget.id === targetWidget.id) return;

    setWidgets(prev => {
      const newWidgets = prev.map(w => ({ ...w }));
      const draggedIndex = newWidgets.findIndex(w => w.id === draggedWidget.id);
      const targetIndex = newWidgets.findIndex(w => w.id === targetWidget.id);
      
      const draggedOrder = newWidgets[draggedIndex].order;
      newWidgets[draggedIndex].order = newWidgets[targetIndex].order;
      newWidgets[targetIndex].order = draggedOrder;
      
      return newWidgets.sort((a, b) => a.order - b.order);
    });
    setDraggedWidget(null);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
  };

  const moveWidget = (widgetId, direction) => {
    setWidgets(prev => {
      const sorted = prev.map(w => ({ ...w })).sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(w => w.id === widgetId);
      if (direction === 'up' && idx > 0) {
        const temp = sorted[idx].order;
        sorted[idx].order = sorted[idx - 1].order;
        sorted[idx - 1].order = temp;
      } else if (direction === 'down' && idx < sorted.length - 1) {
        const temp = sorted[idx].order;
        sorted[idx].order = sorted[idx + 1].order;
        sorted[idx + 1].order = temp;
      }
      return sorted.sort((a, b) => a.order - b.order);
    });
  };

  const saveDashboardLayout = () => {
    localStorage.setItem('dashboardWidgets', JSON.stringify(widgets));
    toast.success("Dashboard layout saved!");
  };

  const resetDashboardLayout = () => {
    setWidgets(defaultWidgets);
    localStorage.removeItem('dashboardWidgets');
    toast.success("Dashboard layout reset to default");
  };

  const startTutorial = () => {
    localStorage.removeItem('tutorialCompleted');
    navigate('/dashboard');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6" data-testid="settings-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500">Customize your experience</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {user?.name} • {user?.role?.replace('_', ' ')}
        </Badge>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid w-full max-w-xl grid-cols-2 sm:grid-cols-4 h-auto sm:h-12 gap-1">
          <TabsTrigger value="appearance" className="gap-2 text-xs sm:text-sm">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Appearance</span>
            <span className="sm:hidden">Theme</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2 text-xs sm:text-sm">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 text-xs sm:text-sm">
            <Key className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="help" className="gap-2 text-xs sm:text-sm">
            <BookOpen className="w-4 h-4" />
            Help
          </TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Theme Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Color Theme
                </CardTitle>
                <CardDescription>Choose your preferred color scheme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
                  {themeEntries.map(([key, theme]) => (
                    <button
                      key={key}
                      onClick={() => setCurrentTheme(key)}
                      data-testid={`theme-${key}`}
                      className={`relative p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                        currentTheme === key 
                          ? 'border-indigo-500 ring-2 ring-indigo-200' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div 
                        className="w-full h-8 rounded-md mb-2" 
                        style={{ background: theme.preview || `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)` }}
                      />
                      <p className="text-xs font-medium text-slate-700">{theme.name}</p>
                      {theme.description && (
                        <p className="text-[9px] text-slate-400 mt-0.5">{theme.description}</p>
                      )}
                      {currentTheme === key && (
                        <CheckCircle className="absolute top-1 right-1 w-4 h-4 text-indigo-500" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Font Size */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Type className="w-5 h-5" />
                  Font Size
                </CardTitle>
                <CardDescription>Adjust text size for better readability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  {[
                    { id: 'small', label: 'Small', size: 'text-sm' },
                    { id: 'medium', label: 'Medium', size: 'text-base' },
                    { id: 'large', label: 'Large', size: 'text-lg' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setFontSize(option.id)}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                        fontSize === option.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className={`font-medium ${option.size}`}>{option.label}</p>
                      <p className="text-xs text-slate-500 mt-1">Aa Bb Cc</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dashboard Customization Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5" />
                    Dashboard Layout
                  </CardTitle>
                  <CardDescription>Drag to reorder, toggle to show/hide widgets</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetDashboardLayout}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button size="sm" onClick={saveDashboardLayout}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Layout
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {widgets.sort((a, b) => a.order - b.order).map((widget, idx) => (
                  <div
                    key={widget.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, widget)}
                    onDragOver={(e) => handleDragOver(e, widget)}
                    onDrop={(e) => handleDrop(e, widget)}
                    onDragEnd={handleDragEnd}
                    data-testid={`widget-${widget.id}`}
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                      draggedWidget?.id === widget.id
                        ? 'border-indigo-500 bg-indigo-50 opacity-50 scale-[0.98]'
                        : draggedWidget
                          ? 'border-dashed border-indigo-300 bg-indigo-50/30'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                    } ${!widget.visible ? 'opacity-60' : ''}`}
                  >
                    <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveWidget(widget.id, 'up')}
                        disabled={idx === 0}
                        className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        data-testid={`widget-${widget.id}-move-up`}
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                      <button
                        onClick={() => moveWidget(widget.id, 'down')}
                        disabled={idx === widgets.length - 1}
                        className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        data-testid={`widget-${widget.id}-move-down`}
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{widget.name}</p>
                      <p className="text-xs text-slate-500">{widget.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        Position {widget.order}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {widget.visible ? (
                          <Eye className="w-4 h-4 text-slate-400" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-400" />
                        )}
                        <Switch
                          checked={widget.visible}
                          onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Tip:</strong> Drag widgets to reorder them on your dashboard. 
                  Use the toggle to show or hide specific sections. Click "Save Layout" to apply changes.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                  placeholder="Confirm new password"
                />
              </div>
              <Button 
                onClick={handlePasswordChange} 
                disabled={isChangingPassword || !passwordData.current || !passwordData.new}
                className="w-full"
              >
                {isChangingPassword ? "Changing..." : "Change Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value="help" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tutorial */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Interactive Tutorial
                </CardTitle>
                <CardDescription>Learn how to use Capex Portal step by step</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-lg p-4 border border-indigo-100">
                  <p className="text-sm text-slate-600 mb-4">
                    Take a guided tour of the application. The tutorial will highlight key features 
                    and explain how to use them effectively.
                  </p>
                  <Button onClick={startTutorial} className="w-full gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Start Interactive Tutorial
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* User Manual PPT */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  User Manual (PPT)
                </CardTitle>
                <CardDescription>Download the complete system guide presentation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  A comprehensive 16-slide PowerPoint presentation covering all roles, workflows, 
                  and features of the CAPEX Portal.
                </p>
                <a
                  href={`${API}/download/user-manual-ppt`}
                  download="CAPEX_Portal_User_Manual.pptx"
                  className="flex items-center justify-center gap-2 w-full p-3 bg-amber-500 rounded-lg text-sm text-white font-semibold hover:bg-amber-600 transition-colors shadow-sm"
                  data-testid="download-ppt-btn"
                >
                  <Download className="w-5 h-5" />
                  Download User Manual (PPTX)
                </a>
              </CardContent>
            </Card>

            {/* Video Tutorial */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Video Tutorial
                </CardTitle>
                <CardDescription>Watch a complete walkthrough video</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-lg p-4 border border-cyan-100 space-y-3">
                  <a
                    href={`${API}/static/videos/user_manual.mp4`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full p-3 bg-white rounded-lg border border-cyan-200 text-sm text-cyan-700 hover:bg-cyan-50 transition-colors"
                  >
                    <PlayCircle className="w-5 h-5" />
                    Watch Tutorial Video
                  </a>
                  <a
                    href={`${API}/download/user-manual`}
                    download="Capex_Portal_User_Manual.mp4"
                    className="flex items-center gap-2 w-full p-3 bg-white rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download Video (MP4)
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
