import { useState, useEffect } from "react";
import { Check, CheckSquare, CalendarDays, MessageSquare, Clock, ArrowRight, Users, TrendingUp, Sparkles, Loader2, PanelRightClose, PanelRightOpen } from "lucide-react";
import { safeFormatDistanceToNow as formatDistanceToNow } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useTaskContext } from "@/context/TaskContext";
import { TaskWorkspacePanel } from "@/components/tasks/TaskWorkspacePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getMyDayDashboard, submitApprovalAction, addQuickLink, updateTask } from "@/api/tasks";
import { toast } from "sonner";
import { useBranding } from "@/context/BrandingContext";
import { Plus, ExternalLink, Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PagedPagination } from "@/components/ui/PagedPagination";

const priorityColors: Record<string, string> = {
  P1: "bg-destructive/10 text-destructive border-destructive/20",
  P2: "bg-warning/10 text-warning border-warning/20",
  P3: "bg-info/10 text-info border-info/20",
  P4: "bg-muted text-muted-foreground border-border",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { tasks, setSelectedTask } = useTaskContext();
  const { branding } = useBranding();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [activeTab, setActiveTab] = useState("my_tasks");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const itemsPerPage = 12;

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkLabel || !newLinkUrl) return toast.error("Please fill in both fields");
    
    setIsAddingLink(true);
    try {
      await addQuickLink({ label: newLinkLabel, url: newLinkUrl });
      toast.success("Quick link added successfully");
      setIsAddLinkOpen(false);
      setNewLinkLabel("");
      setNewLinkUrl("");
      fetchDashboardData();
    } catch (err) {
      toast.error("Failed to add quick link");
    } finally {
      setIsAddingLink(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const dashboardData = await getMyDayDashboard();
      setData(dashboardData);
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while fetching dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
      const handleSync = () => fetchDashboardData();
      window.addEventListener('tasks-updated', handleSync);
      return () => window.removeEventListener('tasks-updated', handleSync);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const { currentUser, summaryStats, todayTasks, delegatedTasks, upcomingMeetings, teamActivity, pendingApprovals, quickLinks } = data;

  const activeTasksList = activeTab === 'my_tasks' ? todayTasks : delegatedTasks;
  const totalPages = Math.ceil((activeTasksList?.length || 0) / itemsPerPage);
  const paginatedTasks = activeTasksList?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleTaskClick = (task: any) => {
    const fullTask = tasks.find((t) => String(t.id) === String(task.id || task.task_id));
    if (fullTask) {
      setSelectedTask(fullTask);
    } else {
      setSelectedTask({
        ...task,
        id: task.id || task.task_id,
        createdBy: task.createdBy || { name: "System", initials: "SY" },
        assignees: task.assignees || [],
        tags: task.tags || [],
        checklist: task.checklist || [],
        subtasks: task.subtasks || [],
        dependencies: task.dependencies || [],
        chats: task.chats || [],
        comments: task.comments || [],
      } as any);
    }
  };

  const statCards = [
    { label: "Tasks Due Today", value: summaryStats.tasksDue, icon: CheckSquare, color: "text-primary", bg: "bg-primary/10", path: "/tasks/my-day" },
    { label: "Unread Messages", value: summaryStats.unreadMessages, icon: MessageSquare, color: "text-accent", bg: "bg-accent/10", path: "/inbox" },
  ];

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  
  const handleApprovalAction = async (id: string, action: 'approve' | 'decline') => {
    const rawId = id.toString().replace('hr_', '');
    try {
      await submitApprovalAction(rawId, action);
      toast.success(`Request ${action}d successfully`);
      fetchDashboardData();
    } catch (e) {
      toast.error("An error occurred");
    }
  };
  const getTimelineStatus = (task: any) => {
    if (task.status === 'done' || task.status === 'completed') {
      return { border: "border-success/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]", text: "text-success font-semibold", label: "Completed" };
    }
    const dueDateStr = task.due_date;
    if (!dueDateStr) return { border: "border-transparent", text: "text-muted-foreground", label: "" };
    const due = new Date(dueDateStr);
    due.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { border: "border-destructive/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]", text: "text-destructive font-semibold", label: "Delayed" };
    if (diffDays === 0) return { border: "border-destructive/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]", text: "text-destructive font-semibold", label: "Due Today" };
    if (diffDays <= 2) return { border: "border-warning/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]", text: "text-warning font-medium", label: "Approaching" };
    return { border: "border-success/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]", text: "text-success font-medium", label: "On Track" };
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (updatingTasks.has(taskId)) {
      toast.info("Wait, task is updating");
      return;
    }
    setUpdatingTasks(prev => new Set(prev).add(taskId));
    try {
      // Optimistic update
      setData((prev: any) => {
        if (!prev) return prev;
        const updatedMyTasks = prev.todayTasks.map((t: any) => t.id === taskId ? { ...t, status: newStatus } : t);
        updatedMyTasks.sort((a: any, b: any) => {
          const aDone = a.status === 'completed' || a.status === 'done' ? 1 : 0;
          const bDone = b.status === 'completed' || b.status === 'done' ? 1 : 0;
          if (aDone !== bDone) return aDone - bDone;
          return 0; // maintain relative order
        });
        return { ...prev, todayTasks: updatedMyTasks };
      });
      await updateTask(taskId, { status: newStatus as any });
      toast.success("Task status updated");
      // Fire a custom event so company pulse can sync
      window.dispatchEvent(new Event('tasks-updated'));
    } catch (e) {
      toast.error("Wait, task is updating");
      fetchDashboardData(); // revert
    } finally {
      setUpdatingTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      {branding?.showWelcomeBanner !== false && (
        <div className="rounded-xl gradient-primary p-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold">
                {greeting}, {currentUser?.name?.split(" ")[0]}! <span className="inline-block animate-bounce">👋</span>
              </h1>
              <p className="mt-1 text-primary-foreground/80 text-sm">{dateStr}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="shadow-card border-0 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-300 cursor-pointer group" onClick={() => navigate(stat.path)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display group-hover:text-primary transition-colors">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className={`grid grid-cols-1 ${isSidebarOpen ? "lg:grid-cols-3" : "lg:grid-cols-1"} gap-6 relative transition-all duration-300`}>
        <div className={`${isSidebarOpen ? "lg:col-span-2" : "lg:col-span-1"} space-y-6 transition-all duration-300`}>
          {/* Tasks Widget with Tabs */}
          <Card className="shadow-card border-0">
          <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); }} className="w-full">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <TabsList className="h-9 bg-slate-100">
                  <TabsTrigger value="my_tasks" className="text-xs font-semibold px-4">
                    <CheckSquare className="h-3.5 w-3.5 mr-1.5 text-primary" />
                    My Tasks
                  </TabsTrigger>
                  <TabsTrigger value="assigned_tasks" className="text-xs font-semibold px-4">
                    <Users className="h-3.5 w-3.5 mr-1.5 text-info" />
                    My Assigned Task to Others
                  </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 hidden sm:flex shrink-0" onClick={() => navigate('/tasks/my-day')}>
                    View All <ArrowRight className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="hidden lg:flex rounded-full h-8 w-8 bg-slate-50 shadow-sm border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}>
                    {isSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 min-h-[300px]">
              
              {/* My Tasks Tab */}
              <TabsContent value="my_tasks" className="m-0 space-y-2">
                {paginatedTasks?.length > 0 ? paginatedTasks.map((task: any) => {
                  const timeline = getTimelineStatus(task);
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 rounded-lg border-2 p-3 hover:bg-secondary/50 transition-colors group cursor-pointer ${timeline.border}`}
                      onClick={() => handleTaskClick(task)}
                    >
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const isDone = task.status === 'done' || task.status === 'completed';
                          handleStatusChange(task.id || task.task_id, isDone ? 'pending' : 'completed');
                        }}
                        className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 
                          ${task.status === 'done' || task.status === 'completed' 
                            ? 'bg-success border-success text-white' 
                            : 'border-muted-foreground/30 hover:border-primary'}
                          ${updatingTasks.has(task.id || task.task_id) ? 'opacity-50' : ''}`}
                      >
                        {(task.status === 'done' || task.status === 'completed') && <Check className="h-3 w-3" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.project || 'General'}
                          {task.due_date && (
                            <span className={`ml-2 ${timeline.text}`}>
                              · {timeline.label} ({new Date(task.due_date).toLocaleDateString()})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${priorityColors[task.priority] || priorityColors.P3}`}>
                          {task.priority || 'P3'}
                        </Badge>
                        <div className="shrink-0" onClick={e => e.stopPropagation()}>
                          <Select value={task.status === "in_progress" ? "in-progress" : task.status === "pending" || task.status === "open" ? "todo" : task.status === "delayed" || task.status === "on_hold" ? "blocked" : task.status === "completed" ? "done" : task.status} onValueChange={v => {
                            let backendStatus = v;
                            if (v === "todo") backendStatus = "pending";
                            if (v === "in-progress") backendStatus = "in_progress";
                            if (v === "blocked") backendStatus = "delayed";
                            handleStatusChange(task.id || task.task_id, backendStatus);
                          }}>
                            <SelectTrigger className={`w-[105px] h-7 text-[10px] font-semibold border-none ${task.status === 'done' || task.status === 'completed' ? 'bg-success/10 text-success' : task.status === 'in-progress' || task.status === 'in_progress' ? 'bg-primary/10 text-primary' : task.status === 'blocked' || task.status === 'delayed' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                              <SelectItem value="todo">Yet to Start</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-muted-foreground p-4 text-center border-2 border-dashed rounded-lg">No pending tasks for today.</p>
                )}
              </TabsContent>

              {/* Delegated Tasks Tab */}
              <TabsContent value="assigned_tasks" className="m-0 space-y-2">
                {paginatedTasks?.length > 0 ? paginatedTasks.map((task: any) => {
                  const isDone = task.status === 'done' || task.status === 'completed';
                  const isDelayed = task.status === 'delayed' || task.status === 'blocked';
                  
                  const statusColor = isDone 
                    ? 'text-success bg-success/10 border-success/30' 
                    : isDelayed 
                      ? 'text-destructive bg-destructive/10 border-destructive/30' 
                      : 'text-muted-foreground bg-muted border-border';

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg border-2 p-3 hover:bg-secondary/50 transition-colors group shadow-sm cursor-pointer"
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {task.assignee}</span>
                          {task.due_date && (
                            <span className="text-slate-400">· Due {new Date(task.due_date).toLocaleDateString()}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs font-semibold px-2 py-0.5 ${statusColor}`}>
                          {task.status === "in_progress" ? "In Progress" : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-muted-foreground p-4 text-center border-2 border-dashed rounded-lg">No delegated tasks found.</p>
                )}
              </TabsContent>

              <PagedPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                className="mt-4 border-slate-100"
              />
            </CardContent>
          </Tabs>
        </Card>
        </div>

        {isSidebarOpen && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Upcoming Meetings */}
            <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-accent" />
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2 pt-1 pb-4">
            <div className="space-y-3 px-1">
            {upcomingMeetings?.length > 0 ? upcomingMeetings.map((meeting: any, idx: number) => (
              <div 
                key={meeting.id} 
                className="group relative rounded-xl border border-slate-100 bg-white p-3 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2 overflow-hidden"
                style={{ animationFillMode: "both", animationDelay: `${idx * 75}ms` }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[13px] font-semibold text-slate-800 group-hover:text-primary transition-colors">{meeting.title}</p>
                  {meeting.type === "recurring" && (
                    <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-500 border-dashed border-slate-200 uppercase tracking-wider px-1.5 py-0 mt-0.5">Recurring</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md group-hover:bg-primary/5 transition-colors">
                    <Clock className="h-3 w-3 text-primary/70" />
                    {new Date(meeting.meeting_time || meeting.time).toLocaleString([], {hour: '2-digit', minute:'2-digit'})} · {meeting.duration}
                  </span>
                  <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md group-hover:bg-accent/5 transition-colors">
                    <Users className="h-3 w-3 text-accent/70" />
                    {meeting.attendees?.length || meeting.attendees || 0}
                  </span>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming meetings.</p>
            )}
            </div>
          </CardContent>
        </Card>


        {/* Team Activity */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Team Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2 pt-1 pb-4">
            <div className="relative space-y-5 px-1">
            {teamActivity?.length > 0 ? teamActivity.map((activity: any, idx: number) => {
              const getTimeString = (dateStr: string) => {
                if (!dateStr) return "just now";
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return "just now";
                return `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${formatDistanceToNow(date, { addSuffix: true })})`;
              };
              
              return (
              <div 
                key={activity.id} 
                className="group relative flex items-start gap-4 animate-in fade-in slide-in-from-bottom-3"
                style={{ animationFillMode: "both", animationDelay: `${idx * 100}ms` }}
              >
                {/* Connecting timeline line */}
                {idx !== teamActivity.length - 1 && (
                  <div className="absolute left-[15px] top-8 bottom-[-24px] w-px bg-gradient-to-b from-border to-transparent" />
                )}
                
                <div className="relative z-10 shrink-0 mt-0.5">
                  <div className="absolute inset-0 bg-primary/20 blur-md rounded-full scale-0 group-hover:scale-150 transition-transform duration-500" />
                  <Avatar className="h-8 w-8 border-2 border-background shadow-sm relative z-10 group-hover:-translate-y-0.5 transition-transform duration-300">
                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold">
                      {activity.user_name?.[0] || activity.initials || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="flex-1 min-w-0 bg-transparent group-hover:bg-slate-50 p-2 -my-2 -mx-2 rounded-xl transition-all duration-300">
                  <p className="text-[13px] leading-snug">
                    <span className="font-semibold text-slate-900">{activity.user_name || activity.user}</span>{" "}
                    <span className="text-slate-500 font-medium">{activity.action}</span>{" "}
                    <span className="font-semibold text-slate-800">{activity.target}</span>
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 mt-1 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {getTimeString(activity.created_at || activity.time)}
                  </p>
                </div>
              </div>
            )}) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
            )}
            </div>
          </CardContent>
        </Card>


        {/* Quick Links */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-display font-semibold">Quick Links</CardTitle>
            <Dialog open={isAddLinkOpen} onOpenChange={setIsAddLinkOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-primary hover:text-white transition-all duration-300">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Quick Link</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddLink} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="label">Link Title</Label>
                    <Input id="label" placeholder="e.g. Timesheet Portal" value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <Input id="url" type="url" placeholder="https://..." value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isAddingLink}>
                    {isAddingLink ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Link
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2 pt-2 pb-4">
            {quickLinks?.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 px-1">
                {quickLinks.map((link: any, idx: number) => (
                  <a
                    key={link.id || link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex flex-col items-start overflow-hidden rounded-xl border border-slate-200/60 bg-white p-4 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-primary/30 animate-in fade-in zoom-in-95"
                    style={{ animationFillMode: "both", animationDelay: `${idx * 75}ms` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 mb-3 transition-all duration-500 group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-110 group-hover:-rotate-3 shadow-sm border border-slate-100">
                      <Link2 className="h-5 w-5" />
                    </div>
                    <div className="relative z-10 flex w-full items-center justify-between mt-auto">
                      <span className="font-semibold text-sm text-slate-700 group-hover:text-slate-900 transition-colors truncate pr-2">{link.label}</span>
                      <div className="h-6 w-6 rounded-full bg-slate-50 flex items-center justify-center opacity-0 -translate-x-3 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0 group-hover:bg-primary group-hover:text-white">
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No quick links configured.</p>
            )}
          </CardContent>
        </Card>
          </div>
        )}
      </div>
      <TaskWorkspacePanel />
    </div>
  );
}
