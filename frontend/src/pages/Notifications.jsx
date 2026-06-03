import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Bell, CheckCircle, Clock, FileText, Package, MessageSquare, Check, CheckCheck } from "lucide-react";

const typeIcons = {
  approval_required: Clock,
  approval: CheckCircle,
  rejection: FileText,
  status_update: FileText,
  assignment: FileText,
  new_request: FileText,
  sample_request: Package,
  sample_response: Package,
  dap_review: FileText,
  comment: MessageSquare,
};

const typeColors = {
  approval_required: "bg-amber-100 text-amber-800",
  approval: "bg-emerald-100 text-emerald-800",
  rejection: "bg-rose-100 text-rose-800",
  status_update: "bg-blue-100 text-blue-800",
  assignment: "bg-indigo-100 text-indigo-800",
  new_request: "bg-violet-100 text-violet-800",
  sample_request: "bg-cyan-100 text-cyan-800",
  sample_response: "bg-teal-100 text-teal-800",
  dap_review: "bg-purple-100 text-purple-800",
  comment: "bg-slate-100 text-slate-800",
};

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`${API}/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="notifications-loading">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="notifications">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-['Outfit']">Notifications</h1>
          <p className="text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead} data-testid="mark-all-read-btn">
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {notifications.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => {
                  const Icon = typeIcons[notification.type] || Bell;
                  const colorClass = typeColors[notification.type] || "bg-slate-100 text-slate-800";
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 flex items-start gap-4 transition-colors ${!notification.read ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                      data-testid={`notification-${notification.id}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`font-medium ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-slate-500 mt-0.5">{notification.message}</p>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(notification.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {notification.reference_id && (
                            <Link to={`/requests/${notification.reference_id}`}>
                              <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200">
                                View Request
                              </Badge>
                            </Link>
                          )}
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => markAsRead(notification.id)}
                              data-testid={`mark-read-${notification.id}`}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Mark Read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="empty-state py-16">
              <Bell className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">No notifications</h3>
              <p className="text-slate-500">You're all caught up!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
