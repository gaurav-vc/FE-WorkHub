import {
  Bell, CheckCircle2, MessageSquare, AtSign, AlertTriangle, Link2, RefreshCw, Check,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTaskContext } from "@/context/TaskContext";
import { Notification } from "@/types/tasks";
import { safeFormatDistanceToNow as formatDistanceToNow } from "@/lib/utils";

const iconMap: Record<string, any> = {
  "task-assigned": CheckCircle2,
  "task-updated": RefreshCw,
  "comment": MessageSquare,
  "mention": AtSign,
  "dependency-complete": Link2,
  "urgent": AlertTriangle,
};

const colorMap: Record<string, string> = {
  "task-assigned": "text-primary",
  "task-updated": "text-info",
  "comment": "text-accent",
  "mention": "text-warning",
  "dependency-complete": "text-success",
  "urgent": "text-destructive",
};

export function NotificationPanel() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useTaskContext();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" onClick={markAllNotificationsRead}>
              <Check className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
          ) : (
            notifications.map(n => {
              const Icon = iconMap[n.type] || Bell;
              const color = colorMap[n.type] || "text-muted-foreground";
              return (
                <div
                  key={n.id}
                  className={`flex gap-3 p-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                >
                  <div className={`h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { if(n.link) window.location.href = n.link; }}>
                    <p className={`text-xs font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {n.time ? formatDistanceToNow(new Date(n.time), { addSuffix: true }) : "just now"}
                    </p>
                  </div>
                  {!n.read && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 shrink-0 text-slate-400 hover:text-primary hover:bg-primary/10"
                      onClick={(e) => { e.stopPropagation(); markNotificationRead(n.id); }}
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
