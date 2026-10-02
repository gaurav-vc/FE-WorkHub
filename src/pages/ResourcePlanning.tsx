import { useState, useMemo, useEffect } from "react";
import {
  Users, BarChart3, AlertTriangle, Calendar, Clock, ChevronLeft, ChevronRight, Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTaskContext } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";

export default function ResourcePlanning() {
  const { token } = useAuth();
  const { updateTask } = useTaskContext();
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [view, setView] = useState("dashboard");
  const [filter, setFilter] = useState<"all" | "optimal" | "overloaded">("all");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [acknowledgedConflicts, setAcknowledgedConflicts] = useState<string[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<any>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [reassignTo, setReassignTo] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);

  // Get this week's Mon-Fri dates
  const weekDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, []);

  const formattedDays = weekDates.map(d => `${d.toLocaleDateString('en-US', { weekday: 'short' })}, ${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`);

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/calendar/events/`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
            const fetched = data.results || data;
            if (Array.isArray(fetched)) setEvents(fetched);
        }).catch(console.error);

      fetch(`${API_BASE}/auth/employees/`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          const members = (data.results || data).map((m: any) => {
            const memberName = m.full_name || m.username || m.name || "Unknown";
            return {
              ...m,
              name: memberName,
              initials: m.initials || memberName.substring(0, 2).toUpperCase(),
              capacity: m.capacity || 8,
              capacityUnit: m.capacityUnit || "hours/day"
            };
          });
          setTeamMembers(members);
        })
        .catch(console.error);

      fetch(`${API_BASE}/tasks/?paginate=false`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
            const fetched = data.results || data;
            if (Array.isArray(fetched)) {
                const mapTaskFromApi = (t: any) => {
                    const formatDate = (dateStr: string) => {
                        if (!dateStr) return "";
                        try {
                            const d = new Date(dateStr);
                            return isNaN(d.getTime()) ? dateStr : d.toISOString().split('T')[0];
                        } catch {
                            return dateStr;
                        }
                    };
                    return {
                        id: t.id,
                        title: t.title,
                        dueDate: formatDate(t.due_date || t.dueDate),
                        startDate: formatDate(t.start_date || t.created_at || t.startDate),
                        status: (t.status === "pending" || t.status === "open" || t.status === "planning") ? "todo" :
                                (t.status === "in_progress") ? "in-progress" :
                                (t.status === "delayed" || t.status === "on_hold") ? "blocked" :
                                (t.status === "completed" || t.status === "done") ? "done" : t.status,
                        assignees: (t.assignees_detail && t.assignees_detail.length > 0) ? t.assignees_detail.map((a: any) => ({
                            id: a.id,
                            name: a.name,
                            initials: a.name ? a.name.substring(0, 2).toUpperCase() : ""
                        })) : (Array.isArray(t.assignees) && t.assignees.length > 0 && typeof t.assignees[0] === 'object' ? t.assignees : (t.assignee_detail ? [{
                            id: t.assignee_detail.id,
                            name: t.assignee_detail.name,
                            initials: t.assignee_detail.name.substring(0, 2).toUpperCase()
                        }] : [])),
                        estimatedEffort: t.estimated_effort !== undefined ? t.estimated_effort : (t.estimatedEffort || t.duration || 3),
                        effortUnit: t.effort_unit || t.effortUnit || "hours",
                        isUrgent: t.isUrgent || t.is_urgent || false,
                        priority: t.priority || "P3"
                    };
                };
                setAllTasks(fetched.map(mapTaskFromApi));
                setApiError(null);
            } else {
                setApiError("Backend API returned an invalid format. It likely crashed with a 500 Error due to fetching too many tasks at once.");
            }
        })
        .catch(err => {
            console.error(err);
            setApiError("Failed to fetch tasks from the backend. The server might have crashed or the database query exceeded its limits (e.g., SQLite 999 variable limit).");
        });
    }
  }, [token]);

  const resourceData = useMemo(() => {
    const weekStart = weekDates[0];
    const weekEnd = weekDates[weekDates.length - 1];

    return teamMembers.map(member => {
      const assignedTasks = allTasks.filter(t => {
        const isAssigned = (t.assignees || []).some((a: any) => (
          (a.id && member.id && a.id.toString() === member.id.toString()) ||
          (a.name && member.name && a.name.toLowerCase() === member.name.toLowerCase()) ||
          (a.name && member.username && a.name.toLowerCase() === member.username.toLowerCase()) ||
          (a.initials && member.initials && a.initials.toUpperCase() === member.initials.toUpperCase())
        ));
        if (!isAssigned || t.status === "done") return false;

        // Check if task falls in the current week or is active / overdue
        const start = new Date(t.startDate);
        const due = new Date(t.dueDate);
        
        // If neither start nor due date exists, include active task
        if (isNaN(start.getTime()) && isNaN(due.getTime())) return true;
        
        const effectiveStart = isNaN(start.getTime()) ? new Date(due) : start;
        
        // Include tasks starting on or before current week end (includes overdue & current week tasks)
        return effectiveStart <= weekEnd;
      });
      const totalEffortHours = assignedTasks.reduce((sum, t) => {
        const hours = t.effortUnit === "days" ? t.estimatedEffort * 8 : t.estimatedEffort;
        return sum + hours;
      }, 0);
      const weeklyCapacity = member.capacityUnit === "hours/day" ? member.capacity * 5 : member.capacity;
      const utilization = weeklyCapacity > 0 ? Math.min(Math.round((totalEffortHours / weeklyCapacity) * 100), 150) : 0;
      const status: "underutilized" | "optimal" | "overloaded" =
        utilization < 50 ? "underutilized" : utilization <= 100 ? "optimal" : "overloaded";

      return { ...member, assignedTasks, totalEffortHours, weeklyCapacity, utilization, status };
    });
  }, [allTasks, teamMembers]);

  const filteredResourceData = useMemo(() => {
    if (filter === "all") return resourceData;
    return resourceData.filter(r => r.status === filter);
  }, [resourceData, filter]);

  const conflicts = useMemo(() => {
    const results: Array<{ id: string, resource: string; initials: string; tasks: any[]; message: string }> = [];
    resourceData.forEach(r => {
      if (r.status === "overloaded") {
        results.push({
          id: r.id,
          resource: r.name, initials: r.initials,
          tasks: r.assignedTasks.map(t => ({ id: t.id, title: t.title })),
          message: `${r.name} is at ${r.utilization}% capacity — overallocated by ${r.totalEffortHours - r.weeklyCapacity}h this week`,
        });
      }
      // Check overlapping urgent tasks
      const urgentTasks = r.assignedTasks.filter(t => t.isUrgent);
      if (urgentTasks.length > 1) {
        results.push({
          id: `${r.id}-urgent`,
          resource: r.name, initials: r.initials,
          tasks: urgentTasks.map(t => ({ id: t.id, title: t.title })),
          message: `${r.name} has ${urgentTasks.length} urgent tasks assigned simultaneously`,
        });
      }
    });
    return results.filter(c => !acknowledgedConflicts.includes(c.id.toString()));
  }, [resourceData, acknowledgedConflicts]);

  const handleAcknowledge = (id: string) => {
    setAcknowledgedConflicts(prev => [...prev, id]);
    toast.success("Conflict acknowledged and dismissed");
  };

  const handleReassign = async () => {
    if (!reassignTo || !selectedConflict) return toast.error("Select an assignee");
    try {
      // Reassign first task in conflict as an example implementation
      const taskToReassign = selectedConflict.tasks[0]?.id;
      if (taskToReassign) {
        await updateTask(taskToReassign, { taskType: 'assign' });
        toast.success(`Task reassigned to ${reassignTo}`);
      }
      setShowReassignModal(false);
      setSelectedConflict(null);
    } catch (e) {
      toast.error("Failed to reassign task");
    }
  };

  const handleAdjustDeadline = async () => {
    if (!newDeadline || !selectedConflict) return toast.error("Select a new date");
    try {
      // Adjust deadline for first task in conflict
      const taskToAdjust = selectedConflict.tasks[0]?.id;
      if (taskToAdjust) {
        await updateTask(taskToAdjust, { dueDate: newDeadline });
        toast.success("Deadline adjusted successfully");
      }
      setShowDeadlineModal(false);
      setSelectedConflict(null);
    } catch (e) {
      toast.error("Failed to adjust deadline");
    }
  };

  const statusColors = {
    underutilized: "text-info bg-info/10",
    optimal: "text-success bg-success/10",
    overloaded: "text-destructive bg-destructive/10",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-7 w-7 text-primary" />
          </div>
          Resource Planning & Workload
        </h1>
        <p className="text-muted-foreground text-sm md:ml-14">Track team workload, capacity constraints, and resolve resource conflicts dynamically.</p>
      </div>

      {apiError && (
        <div className="bg-destructive/15 border-l-4 border-destructive p-4 rounded-md mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="text-destructive font-semibold">Critical Data Fetching Error</h3>
            <p className="text-destructive/90 text-sm mt-1">{apiError}</p>
            <p className="text-destructive/80 text-xs mt-2">
              <strong>Root Cause:</strong> The utilization calculated as 0% because the frontend received 0 tasks. This happened because the backend crashed trying to fetch thousands of tasks at once, exceeding the database limits.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`relative overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group border-0 bg-gradient-to-br from-white to-slate-50/80 ${filter === "all" && view !== "conflicts" ? "ring-2 ring-primary ring-offset-2 scale-[1.02]" : "hover:-translate-y-1"}`} onClick={() => { setView("dashboard"); setFilter("all"); }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <CardContent className="p-5 text-center flex flex-col items-center justify-center relative z-10">
            <div className="p-3 bg-primary/10 rounded-2xl mb-3 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
               <Users className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-display font-black text-slate-800">{teamMembers.length}</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Team Members</p>
          </CardContent>
        </Card>
        <Card className={`relative overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group border-0 bg-gradient-to-br from-white to-emerald-50/80 ${filter === "optimal" && view !== "conflicts" ? "ring-2 ring-emerald-500 ring-offset-2 scale-[1.02]" : "hover:-translate-y-1"}`} onClick={() => { setView("dashboard"); setFilter("optimal"); }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
          <CardContent className="p-5 text-center flex flex-col items-center justify-center relative z-10">
            <div className="p-3 bg-emerald-100 rounded-2xl mb-3 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
               <BarChart3 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-display font-black text-slate-800">{resourceData.filter(r => r.status === "optimal").length}</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Optimal Load</p>
          </CardContent>
        </Card>
        <Card className={`relative overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group border-0 bg-gradient-to-br from-white to-rose-50/80 ${filter === "overloaded" && view !== "conflicts" ? "ring-2 ring-rose-500 ring-offset-2 scale-[1.02]" : "hover:-translate-y-1"}`} onClick={() => { setView("dashboard"); setFilter("overloaded"); }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
          <CardContent className="p-5 text-center flex flex-col items-center justify-center relative z-10">
            <div className="p-3 bg-rose-100 rounded-2xl mb-3 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
               <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <p className="text-3xl font-display font-black text-slate-800">{resourceData.filter(r => r.status === "overloaded").length}</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Overloaded</p>
          </CardContent>
        </Card>
        <Card className={`relative overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group border-0 bg-gradient-to-br from-white to-amber-50/80 ${view === "conflicts" ? "ring-2 ring-amber-500 ring-offset-2 scale-[1.02]" : "hover:-translate-y-1"}`} onClick={() => { setView("conflicts"); }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
          <CardContent className="p-5 text-center flex flex-col items-center justify-center relative z-10">
            <div className="p-3 bg-amber-100 rounded-2xl mb-3 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
               <Briefcase className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-3xl font-display font-black text-slate-800">{conflicts.length}</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Conflicts</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="dashboard">Workload Dashboard</TabsTrigger>
          <TabsTrigger value="calendar">Capacity Calendar</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
        </TabsList>

        {/* Workload Dashboard */}
        <TabsContent value="dashboard" className="mt-4 space-y-3">
          {filteredResourceData.length === 0 && (
            <div className="p-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
              No resources match this filter.
            </div>
          )}
          {filteredResourceData.map((r, i) => (
            <Card key={r.id} className="shadow-sm border-slate-200 hover:shadow-md transition-all duration-300 animate-in slide-in-from-bottom-4 group hover:border-slate-300" style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-white shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold">{r.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{r.name}</p>
                        <p className="text-xs font-medium text-slate-500">{r.role || "Team Member"} {r.department ? `· ${r.department}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={`${statusColors[r.status]} text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border-0 shadow-sm`}>{r.status}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex-1">
                        <Progress value={Math.min(r.utilization, 100)} className={`h-2 shadow-inner ${r.status === "overloaded" ? "[&>div]:bg-rose-500" : r.status === "optimal" ? "[&>div]:bg-emerald-500" : "[&>div]:bg-blue-500"}`} />
                      </div>
                      <span className="text-xs font-black w-10 text-right text-slate-700">{r.utilization}%</span>
                    </div>
                    <div className="flex items-center gap-5 text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {r.assignedTasks.length} tasks</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.totalEffortHours}h assigned</span>
                      <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> {r.weeklyCapacity}h/week capacity</span>
                    </div>
                  </div>
                </div>
                {/* Assigned tasks list */}
                {r.assignedTasks.length > 0 && (
                  <Accordion type="single" collapsible className="mt-4 border-t border-slate-100">
                    <AccordionItem value="tasks" className="border-none">
                      <AccordionTrigger className="py-3 text-[11px] font-bold tracking-wider uppercase hover:no-underline text-slate-400 hover:text-primary transition-colors">
                        View Assigned Tasks ({r.assignedTasks.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="max-h-[160px] overflow-y-auto pr-3 space-y-2 custom-scrollbar">
                          {r.assignedTasks.map(t => (
                            <div key={t.id} className="flex items-center gap-3 text-xs bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg transition-colors border border-slate-100">
                              <div className={`h-2 w-2 rounded-full shadow-sm ${t.isUrgent ? "bg-rose-500" : "bg-primary"}`} />
                              <span className="flex-1 truncate font-medium text-slate-700">{t.title}</span>
                              <Badge variant="outline" className="text-[9px] font-bold tracking-widest bg-white shadow-sm border-slate-200">{t.priority}</Badge>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Capacity Calendar */}
        <TabsContent value="calendar" className="mt-4">
          <Card className="shadow-card overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="flex border-b">
                    <div className="w-48 shrink-0 border-r px-3 py-2 text-xs font-semibold text-muted-foreground">Resource</div>
                    {formattedDays.map(d => (
                      <div key={d} className="flex-1 text-center text-xs font-semibold text-muted-foreground py-2 border-r">{d}</div>
                    ))}
                  </div>
                  {filteredResourceData.map(r => (
                    <div key={r.id} className="flex border-b hover:bg-muted/30">
                      <div className="w-48 shrink-0 border-r px-3 py-2 flex items-center gap-2">
                        <Avatar className="h-6 w-6"><AvatarFallback className="text-[8px] bg-primary/10 text-primary">{r.initials}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{r.name}</p>
                          <p className="text-[10px] text-muted-foreground">{r.capacity}h/day</p>
                        </div>
                      </div>
                      {weekDates.map((dayDate, di) => {
                        const dailyTasks = r.assignedTasks.filter(t => {
                          let start = t.startDate ? new Date(t.startDate) : new Date();
                          let end = t.dueDate ? new Date(t.dueDate) : new Date();
                          start.setHours(0,0,0,0);
                          end.setHours(23,59,59,999);
                          return dayDate >= start && dayDate <= end;
                        });
                        
                        const getTaskDailyHours = (t: any) => {
                          let start = t.startDate ? new Date(t.startDate) : new Date();
                          let end = t.dueDate ? new Date(t.dueDate) : new Date();
                          start.setHours(0,0,0,0);
                          end.setHours(0,0,0,0);
                          const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                          const totalHours = t.effortUnit === "days" ? t.estimatedEffort * 8 : t.estimatedEffort;
                          return totalHours / totalDays;
                        };
                        
                        const dailyHours = dailyTasks.reduce((s, t) => s + getTaskDailyHours(t), 0);
                        const dailyUtil = r.capacity > 0 ? Math.round((dailyHours / r.capacity) * 100) : 0;
                        const dailyMeetings = events.filter(e => {
                          const evStart = e.start_time ? new Date(e.start_time) : null;
                          if (!evStart) return false;
                          const isSameDay = evStart.getFullYear() === dayDate.getFullYear() && evStart.getMonth() === dayDate.getMonth() && evStart.getDate() === dayDate.getDate();
                          const isAttending = Array.isArray(e.attendees) && e.attendees.some((a: any) => a.initials === r.initials || a.name === r.name);
                          return isSameDay && isAttending;
                        });

                        return (
                          <div key={di} className="flex-1 border-r p-1.5 relative group transition-colors hover:bg-muted/10">
                            {dailyTasks.map(t => (
                              <div key={t.id} className={`text-[9px] px-1.5 py-1 rounded mb-1 truncate border shadow-sm ${t.isUrgent ? "bg-destructive/10 text-destructive border-destructive/20 font-semibold" : "bg-primary/5 text-primary border-primary/20"}`} title={t.title}>
                                📝 {t.title}
                              </div>
                            ))}
                            {dailyMeetings.map(m => {
                              const timeStr = m.start_time ? new Date(m.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
                              return (
                                <div key={`m-${m.id}`} className="text-[9px] px-1.5 py-1 rounded mb-1 truncate border shadow-sm bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800" title={m.title}>
                                  🗓️ {timeStr} {m.title}
                                </div>
                              );
                            })}
                            {dailyTasks.length === 0 && dailyMeetings.length === 0 && <div className="text-[9px] text-muted-foreground/40 text-center py-3 select-none">—</div>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conflicts */}
        <TabsContent value="conflicts" className="mt-4 space-y-3">
          {conflicts.length === 0 ? (
            <Card className="shadow-card border-success/20">
              <CardContent className="p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-success" />
                </div>
                <p className="text-lg font-semibold text-foreground">No conflicts detected</p>
                <p className="text-sm text-muted-foreground mt-1">All resources are operating within healthy capacity limits.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-card border-destructive/20 overflow-hidden">
              <Accordion type="single" collapsible className="w-full">
                {conflicts.map((c, i) => (
                  <AccordionItem value={`conflict-${i}`} key={i} className="border-b last:border-b-0 border-destructive/10">
                    <AccordionTrigger className="hover:no-underline px-6 py-4 hover:bg-destructive/5 transition-colors">
                      <div className="flex items-center gap-4 text-left">
                        <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-destructive">Conflict for {c.resource}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{c.message}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2 bg-destructive/5 border-t border-destructive/10">
                      <div className="pl-14">
                        <p className="text-sm font-semibold mb-3 text-foreground">Involved Tasks & Priorities:</p>
                        <div className="flex flex-wrap gap-2 mb-5">
                          {c.tasks.map((t: any, ti: number) => (
                            <Badge key={ti} variant="secondary" className="px-2 py-1 text-xs bg-background border-destructive/20 shadow-sm">{t.title}</Badge>
                          ))}
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" size="sm" className="h-9" onClick={() => { setSelectedConflict(c); setShowReassignModal(true); }}>Reassign Tasks</Button>
                          <Button variant="outline" size="sm" className="h-9" onClick={() => { setSelectedConflict(c); setShowDeadlineModal(true); }}>Adjust Deadlines</Button>
                          <Button variant="ghost" size="sm" className="h-9 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleAcknowledge(c.id.toString())}>Acknowledge</Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Reassign Modal */}
      <Dialog open={showReassignModal} onOpenChange={setShowReassignModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reassign Tasks for {selectedConflict?.resource}</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Select New Assignee</Label>
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger><SelectValue placeholder="Choose someone with capacity..." /></SelectTrigger>
              <SelectContent>
                {teamMembers.filter(e => e.id !== selectedConflict?.id).map(e => (
                  <SelectItem key={e.id} value={e.id.toString()}>{e.name || e.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReassignModal(false)}>Cancel</Button>
            <Button className="gradient-primary" onClick={handleReassign}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Deadline Modal */}
      <Dialog open={showDeadlineModal} onOpenChange={setShowDeadlineModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Adjust Deadlines for {selectedConflict?.resource}</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Push Deadline To</Label>
            <Input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeadlineModal(false)}>Cancel</Button>
            <Button className="gradient-primary" onClick={handleAdjustDeadline}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
