import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, Context } from "react";
import { Task, Notification } from "@/types/tasks";
import { getTasks, createTask, updateTask as updateTaskApi, deleteTask as deleteTaskApi, getTaskById } from "@/api/tasks";
import { apiClient } from "@/api/client";
import { useAuth } from "./AuthContext";
import { API_BASE } from "@/config";
import { toast } from "sonner";

interface TaskContextType {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  addTask: (task: Task) => Promise<boolean | void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<boolean | void>;
  deleteTask: (id: string) => Promise<boolean | void>;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadCount: number;
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  isLoadingTasks: boolean;
  fetchTasks: (filters?: any, silent?: boolean) => Promise<void>;
  fetchTaskDetails: (id: string) => Promise<void>;
  totalTasks: number;
  totalPages: number;
  statusCounts: { todo: number, inProgress: number, blocked: number, done: number };
}

const TaskContext: Context<TaskContextType | null> = (window as any).__TaskContext || createContext<TaskContextType | null>(null);
if (import.meta.env?.DEV) {
  (window as any).__TaskContext = TaskContext;
}

let fetchTimeout: ReturnType<typeof setTimeout> | null = null;

export function TaskProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(true);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState({ todo: 0, inProgress: 0, blocked: 0, done: 0 });

  const mapTaskFromApi = (t: any): Task => {
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toISOString().split('T')[0];
      } catch {
        return dateStr;
      }
    };

    const mappedTask: Task = {
      ...t,
      dueDate: formatDate(t.due_date || t.dueDate),
      startDate: formatDate(t.start_date || t.created_at || t.startDate),
      createdDate: formatDate(t.created_at || t.createdDate),
      createdTime: t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
      dueTime: (t.due_time || (t.dueTime && t.dueTime !== 'EOD' ? t.dueTime : "")),
      rawDueTime: t.raw_due_time || (t.due_time && t.due_time !== 'EOD' ? t.due_time : ""),
      project_id: t.project_id || "",
      assignees: (t.assignees_detail && t.assignees_detail.length > 0) ? t.assignees_detail.map((a: any) => ({
        id: a.id,
        name: a.name,
        initials: a.name ? a.name.substring(0, 2).toUpperCase() : ""
      })) : (Array.isArray(t.assignees) && t.assignees.length > 0 && typeof t.assignees[0] === 'object' ? t.assignees : (t.assignee_detail ? [{
        id: t.assignee_detail.id,
        name: t.assignee_detail.name,
        initials: t.assignee_detail.name.substring(0, 2).toUpperCase()
      }] : [])),
      createdBy: t.createdBy || (t.created_by_name ? {
        name: t.created_by_name,
        initials: t.created_by_name.substring(0, 2).toUpperCase()
      } : { name: "System", initials: "SY" }),
      tags: Array.isArray(t.tags) ? t.tags : [],
      checklist: Array.isArray(t.checklist) ? t.checklist : [],
      subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
      chat: Array.isArray(t.chat) ? t.chat : [],
      comments: Array.isArray(t.comments) ? t.comments : [],
      attachments: Array.isArray(t.attachments) ? t.attachments : [],
      estimatedEffort: t.estimated_effort !== undefined ? t.estimated_effort : (t.estimatedEffort || t.duration || 3),
      effortUnit: t.effort_unit || t.effortUnit || "hours",
      actualEffort: t.actual_effort || t.actualEffort || 0,
      isUrgent: Boolean(t.isUrgent ?? t.is_urgent ?? false),
      is_urgent: Boolean(t.isUrgent ?? t.is_urgent ?? false),
    };
    
    // Map status from backend to frontend
    if (t.status === "pending" || t.status === "open" || t.status === "planning") mappedTask.status = "todo";
    else if (t.status === "in_progress") mappedTask.status = "in-progress";
    else if (t.status === "delayed" || t.status === "on_hold") mappedTask.status = "blocked";
    else if (t.status === "completed" || t.status === "done") mappedTask.status = "done";
    
    return mappedTask;
  };

  const lastFiltersRef = React.useRef<any>({});
  const inFlightStatusUpdatesRef = React.useRef<Map<string, string>>(new Map());
  
  const fetchTasks = async (filters: any = {}, silent: boolean = false) => {
    lastFiltersRef.current = filters;
    if (!silent) {
      setIsLoadingTasks(true);
    }
    try {
      const data = await getTasks(filters);
      const rawTasks = Array.isArray(data) ? data : (data?.results && Array.isArray(data.results)) ? data.results : [];
      if (rawTasks.length > 0 || !silent) {
        setTasks((prevTasks) => {
          const prevMap = new Map(prevTasks.map(t => [t.id.toString(), t]));
          return rawTasks.map((raw: any) => {
            const mapped = mapTaskFromApi(raw);
            const prev = prevMap.get(mapped.id.toString());
            
            // If there is an in-flight status update for this task, preserve it!
            const inFlightStatus = inFlightStatusUpdatesRef.current.get(mapped.id.toString());
            const finalStatus = inFlightStatus || mapped.status;

            if (prev) {
              return {
                ...mapped,
                status: finalStatus,
                chats: (mapped.chats && mapped.chats.length > 0) ? mapped.chats : (prev.chats || []),
                chat: (mapped.chat && mapped.chat.length > 0) ? mapped.chat : (prev.chat || []),
                comments: (mapped.comments && mapped.comments.length > 0) ? mapped.comments : (prev.comments || []),
                attachments: (mapped.attachments && mapped.attachments.length > 0) ? mapped.attachments : (prev.attachments || []),
                subtasks: (mapped.subtasks && mapped.subtasks.length > 0) ? mapped.subtasks : (prev.subtasks || []),
                checklist: (mapped.checklist && mapped.checklist.length > 0) ? mapped.checklist : (prev.checklist || []),
                checklists: (mapped.checklists && mapped.checklists.length > 0) ? mapped.checklists : (prev.checklists || []),
              };
            }
            return { ...mapped, status: finalStatus };
          });
        });
      }
      if (data?.count !== undefined) {
        setTotalTasks(data.count);
        setTotalPages(Math.ceil(data.count / 12));
      } else if (rawTasks.length > 0) {
        setTotalTasks(rawTasks.length);
        setTotalPages(1);
      }
      
      if (data.status_counts) {
        setStatusCounts({
          todo: data.status_counts.todo || 0,
          inProgress: data.status_counts.in_progress || 0,
          blocked: data.status_counts.blocked || 0,
          done: data.status_counts.done || 0,
        });
      } else {
        setStatusCounts({
          todo: rawTasks.filter((t: any) => t.status === "pending" || t.status === "todo" || t.status === "open").length,
          inProgress: rawTasks.filter((t: any) => t.status === "in_progress" || t.status === "in-progress").length,
          blocked: rawTasks.filter((t: any) => t.status === "delayed" || t.status === "blocked" || t.status === "on_hold").length,
          done: rawTasks.filter((t: any) => t.status === "completed" || t.status === "done").length,
        });
      }
    } catch (err: any) {
      if (err?.status !== 403) {
        console.error("Failed to fetch tasks", err);
      }
    } finally {
      if (!silent) {
        setIsLoadingTasks(false);
      }
    }
  };

  const fetchTaskDetails = async (id: string) => {
    try {
      const res = await getTaskById(id);
      if (res) {
        const mapped = mapTaskFromApi(res);
        setTasks((prev) => prev.map((t) => (t.id.toString() === id.toString() ? { ...t, ...mapped } : t)));
        setSelectedTask((prev) => (prev && prev.id.toString() === id.toString() ? { ...prev, ...mapped } : prev));
      }
    } catch (err) {
      console.error("Failed to fetch task details:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await apiClient('/workspace/notifications/');
      const rawNotifs = data.results || data;
      setNotifications(rawNotifs.map((n: any) => ({
        id: n.id,
        type: n.type || 'task-updated',
        title: n.title,
        message: n.message,
        time: n.time,
        read: n.is_read || n.read || false,
        link: n.link
      })));
    } catch (err: any) {
      if (err?.status !== 403 && err?.status !== 401) {
        console.error("Failed to fetch notifications", err);
      }
    }
  };

  useEffect(() => {
    let ws: WebSocket | null = null;
    if (isAuthenticated && token) {
      fetchTasks();
      fetchNotifications();
      
      const handleSync = () => {
        if (fetchTimeout) clearTimeout(fetchTimeout);
        fetchTimeout = setTimeout(() => {
          fetchTasks(lastFiltersRef.current, true); // Silent background fetch without loader
        }, 600);
      };
      
      window.addEventListener('tasks-updated', handleSync);
      
      // Setup WebSocket connection for real-time syncing
      const wsUrl = `${API_BASE.replace('http', 'ws').replace('/api', '')}/ws/workspace/?token=${token}`;
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "tasks_updated") {
            window.dispatchEvent(new Event('tasks-updated'));
          }
        } catch (e) {}
      };
      
      // Optional: Setup polling for notifications every 60 seconds
      const interval = setInterval(fetchNotifications, 60000);
      return () => {
        window.removeEventListener('tasks-updated', handleSync);
        clearInterval(interval);
        if (ws) ws.close();
      };
    } else if (!isAuthenticated) {
      setTasks([]);
      setNotifications([]);
    }
  }, [isAuthenticated, token]);

  const addTask = async (task: Task) => {
    try {
      const apiPayload: any = { ...task };
      
      // Clean up frontend-only fields
      delete apiPayload.assignees;
      delete apiPayload.comments;
      delete apiPayload.chat;
      delete apiPayload.dependent_tasks_legacy;

      if (task.dueDate) apiPayload.due_date = task.dueDate;
      else apiPayload.due_date = new Date().toISOString().split('T')[0]; // Required by backend
      
      if (task.dueTime && task.dueTime !== "EOD") {
        apiPayload.due_time = task.dueTime;
      } else {
        apiPayload.due_time = null;
      }
      
      const rawPid = (task as any).project_id && String((task as any).project_id).trim() !== "" 
        ? (task as any).project_id 
        : task.project;
      
      if (rawPid !== undefined && rawPid !== null && String(rawPid).trim() !== "") {
        const strVal = String(rawPid).trim();
        const num = Number(strVal);
        if (!isNaN(num) && Number.isInteger(num) && num > 0) {
          apiPayload.project_id = num;
          delete apiPayload.project;
        } else {
          apiPayload.project = strVal;
          delete apiPayload.project_id;
        }
      } else {
        delete apiPayload.project_id;
        delete apiPayload.project;
      }

      if (task.startDate) apiPayload.start_date = task.startDate;
      if (task.estimatedEffort) apiPayload.duration = task.estimatedEffort;
      
      const anyTask: any = task;
      if (task.isUrgent !== undefined) {
        apiPayload.is_urgent = task.isUrgent;
        apiPayload.isUrgent = task.isUrgent;
      }
      if (anyTask.assigneeIds && anyTask.assigneeIds.length > 0) {
          apiPayload.assigned_to = anyTask.assigneeIds[0];
          apiPayload.assignees = anyTask.assigneeIds;
      }
      
      if (task.status === "todo") apiPayload.status = "pending";
      else if (task.status === "in-progress") apiPayload.status = "in_progress";
      else if (task.status === "blocked") apiPayload.status = "delayed";
      
      const newTask = await createTask(apiPayload);
      const mapped = { ...task, ...mapTaskFromApi(newTask), id: newTask.id || task.id };
      
      // Prepend so the newly added task appears at the top immediately!
      setTasks((prev) => [mapped, ...prev]);
      
      // Dynamically update totalTasks and statusCounts immediately
      setTotalTasks((prev) => prev + 1);
      const statusKey = mapped.status === "done" ? "done" : mapped.status === "in-progress" ? "inProgress" : mapped.status === "blocked" ? "blocked" : "todo";
      setStatusCounts((prev) => ({
        ...prev,
        [statusKey]: (prev[statusKey as keyof typeof prev] || 0) + 1,
      }));

      // Broadcast task-created event so any subscriber updates immediately
      window.dispatchEvent(new CustomEvent('task-created', { detail: mapped }));

      toast.success("Task created");
      return true;
    } catch (err) {
      toast.error("Failed to create task");
      console.error(err);
      return false;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    let prevTask: Task | undefined;
    if (updates.status) {
      inFlightStatusUpdatesRef.current.set(id.toString(), updates.status);
    }
    setTasks((prev) => {
      prevTask = prev.find((t) => t.id.toString() === id.toString());
      const updated = prev.map((t) => (t.id.toString() === id.toString() ? { ...t, ...updates } : t));
      if (updates.status) {
        return updated.sort((a, b) => {
          const aDone = a.status === 'completed' || a.status === 'done' ? 1 : 0;
          const bDone = b.status === 'completed' || b.status === 'done' ? 1 : 0;
          if (aDone !== bDone) return aDone - bDone;
          return 0; // maintain relative order
        });
      }
      return updated;
    });

    if (selectedTask?.id.toString() === id.toString()) {
      setSelectedTask((prev) => prev ? { ...prev, ...updates } : prev);
    }

    // Instantly update statusCounts if status changed
    if (updates.status && prevTask && prevTask.status !== updates.status) {
      const getStatusKey = (s: string) => {
        if (s === 'done' || s === 'completed') return 'done';
        if (s === 'in-progress' || s === 'in_progress') return 'inProgress';
        if (s === 'blocked' || s === 'delayed') return 'blocked';
        return 'todo';
      };
      const oldKey = getStatusKey(prevTask.status);
      const newKey = getStatusKey(updates.status);
      if (oldKey !== newKey) {
        setStatusCounts((prev) => ({
          ...prev,
          [oldKey]: Math.max(0, (prev[oldKey as keyof typeof prev] || 0) - 1),
          [newKey]: (prev[newKey as keyof typeof prev] || 0) + 1,
        }));
      }
    }

    const apiPayload: any = { ...updates };
    
    // Clean up frontend-only fields
    delete apiPayload.assignees;
    delete apiPayload.comments;
    delete apiPayload.chat;
    delete apiPayload.dependent_tasks_legacy;
    
    if (updates.dueDate !== undefined) apiPayload.due_date = updates.dueDate;
    if (updates.dueTime !== undefined) {
      const dt = updates.dueTime;
      if (!dt || dt === "EOD" || dt === "null" || dt === "undefined") {
        apiPayload.due_time = null;
      } else {
        apiPayload.due_time = dt;
      }
    }
    const rawUpdatePid = (updates as any).project_id && String((updates as any).project_id).trim() !== ""
      ? (updates as any).project_id
      : updates.project;

    if (rawUpdatePid !== undefined && rawUpdatePid !== null && String(rawUpdatePid).trim() !== "") {
      const strVal = String(rawUpdatePid).trim();
      const num = Number(strVal);
      if (!isNaN(num) && Number.isInteger(num) && num > 0) {
        apiPayload.project_id = num;
        delete apiPayload.project;
      } else {
        apiPayload.project = strVal;
        delete apiPayload.project_id;
      }
    } else if ((updates as any).project_id !== undefined || updates.project !== undefined) {
      delete apiPayload.project_id;
      delete apiPayload.project;
    }
    if (updates.startDate !== undefined) apiPayload.start_date = updates.startDate;
    if (updates.estimatedEffort !== undefined) apiPayload.duration = updates.estimatedEffort;
    
    if (updates.isUrgent !== undefined) {
      apiPayload.is_urgent = updates.isUrgent;
      apiPayload.isUrgent = updates.isUrgent;
    }
    
    const anyUpdates: any = updates;
    if (anyUpdates.assigneeIds !== undefined) {
        if (anyUpdates.assigneeIds.length > 0) {
            apiPayload.assigned_to = anyUpdates.assigneeIds[0];
            apiPayload.assignees = anyUpdates.assigneeIds;
        } else if (anyUpdates.taskType === 'self') {
            // Keep self task assigned, never nullify
        } else {
            apiPayload.assigned_to = null;
            apiPayload.assignees = [];
        }
    }
    
    if (updates.status === "todo") apiPayload.status = "pending";
    else if (updates.status === "in-progress") apiPayload.status = "in_progress";
    else if (updates.status === "blocked") apiPayload.status = "delayed";
    else if (updates.status === "done") apiPayload.status = "completed";
    
    try {
      const res = await updateTaskApi(id, apiPayload);
      inFlightStatusUpdatesRef.current.delete(id.toString());
      if (res) {
        const mapped = mapTaskFromApi(res);
        setTasks((prev) => prev.map((t) => (t.id.toString() === id.toString() ? { ...t, ...mapped } : t)));
        setSelectedTask((prev) => (prev && prev.id.toString() === id.toString() ? { ...prev, ...mapped } : prev));
      }
      return true;
    } catch (err: any) {
      inFlightStatusUpdatesRef.current.delete(id.toString());
      console.error("Update task failed:", err);
      toast.error(`Failed to update task: ${err.message || 'Server error'}`);
      // Revert if failed
      if (prevTask) {
        setTasks((prev) => prev.map((t) => t.id.toString() === id.toString() ? prevTask! : t));
      }
      if (fetchTimeout) clearTimeout(fetchTimeout);
      fetchTimeout = setTimeout(() => fetchTasks(lastFiltersRef.current, true), 300);
      return false;
    }
  };

  const deleteTask = async (id: string) => {
    let deletedTask: Task | undefined;
    setTasks((prev) => {
      deletedTask = prev.find((t) => t.id.toString() === id.toString());
      return prev.filter((t) => t.id.toString() !== id.toString());
    });
    if (selectedTask?.id.toString() === id.toString()) setSelectedTask(null);

    if (deletedTask) {
      setTotalTasks((prev) => Math.max(0, prev - 1));
      const s = deletedTask.status;
      const key = s === "done" ? "done" : s === "in-progress" ? "inProgress" : s === "blocked" ? "blocked" : "todo";
      setStatusCounts((prev) => ({
        ...prev,
        [key]: Math.max(0, (prev[key as keyof typeof prev] || 0) - 1),
      }));
    }

    try {
      await deleteTaskApi(id);
      window.dispatchEvent(new CustomEvent('task-deleted', { detail: { id } }));
      toast.success("Task deleted");
    } catch (err) {
      toast.error("Failed to delete task");
      fetchTasks(lastFiltersRef.current, true);
    }
  };

  const markNotificationRead = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id.toString() !== id.toString()));
    try {
      await fetch(`${API_BASE}/workspace/notifications/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_read: true })
      });
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

  const markAllNotificationsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    setNotifications([]);
    try {
      for (const id of unreadIds) {
        await fetch(`${API_BASE}/workspace/notifications/${id}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ is_read: true })
        });
      }
    } catch (err) {
      console.error("Failed to mark all notifications read", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <TaskContext.Provider value={{
      tasks, setTasks, addTask, updateTask, deleteTask,
      notifications, setNotifications, markNotificationRead, markAllNotificationsRead,
      unreadCount,
      selectedTask,
      setSelectedTask,
      isLoadingTasks,
      fetchTasks,
      fetchTaskDetails,
      totalTasks,
      totalPages,
      statusCounts,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTaskContext must be used within TaskProvider");
  return ctx;
}
