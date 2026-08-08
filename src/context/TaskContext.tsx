import { createContext, useContext, useState, useEffect, ReactNode, Context } from "react";
import { Task, Notification } from "@/types/tasks";
import { getTasks, createTask, updateTask as updateTaskApi, deleteTask as deleteTaskApi } from "@/api/tasks";
import { apiClient } from "@/api/client";
import { useAuth } from "./AuthContext";
import { API_BASE } from "@/config";
import { toast } from "sonner";

interface TaskContextType {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadCount: number;
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  isLoadingTasks: boolean;
  fetchTasks: (filters?: any) => Promise<void>;
  totalTasks: number;
  totalPages: number;
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
      dueTime: t.dueTime || t.due_time || "",
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
    };
    
    // Map status from backend to frontend
    if (t.status === "pending" || t.status === "open" || t.status === "planning") mappedTask.status = "todo";
    else if (t.status === "in_progress") mappedTask.status = "in-progress";
    else if (t.status === "delayed" || t.status === "on_hold") mappedTask.status = "blocked";
    else if (t.status === "completed" || t.status === "done") mappedTask.status = "done";
    
    return mappedTask;
  };

  const fetchTasks = async (filters: any = {}) => {
    setIsLoadingTasks(true);
    try {
      const data = await getTasks(filters);
      const rawTasks = data.results || data;
      setTasks(rawTasks.map(mapTaskFromApi));
      if (data.count !== undefined) {
        setTotalTasks(data.count);
        setTotalPages(Math.ceil(data.count / 12));
      } else {
        setTotalTasks(rawTasks.length);
        setTotalPages(1);
      }
    } catch (err: any) {
      if (err?.status !== 403) {
        console.error("Failed to fetch tasks", err);
      }
    } finally {
      setIsLoadingTasks(false);
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
          fetchTasks();
        }, 800);
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
      delete apiPayload.subtasks;
      delete apiPayload.checklists;
      delete apiPayload.checklist;
      delete apiPayload.comments;
      delete apiPayload.chat;
      delete apiPayload.dependent_tasks_legacy;

      if (task.dueDate) apiPayload.due_date = task.dueDate;
      else apiPayload.due_date = new Date().toISOString().split('T')[0]; // Required by backend
      
      if (task.startDate) apiPayload.start_date = task.startDate;
      if (task.estimatedEffort) apiPayload.duration = task.estimatedEffort;
      
      const anyTask: any = task;
      if (anyTask.assigneeIds && anyTask.assigneeIds.length > 0) {
          apiPayload.assigned_to = anyTask.assigneeIds[0];
          apiPayload.assignees = anyTask.assigneeIds;
      }
      
      if (task.status === "todo") apiPayload.status = "pending";
      else if (task.status === "in-progress") apiPayload.status = "in_progress";
      else if (task.status === "blocked") apiPayload.status = "delayed";
      
      const newTask = await createTask(apiPayload);
      setTasks((prev) => [...prev, { ...task, ...mapTaskFromApi(newTask), id: newTask.id || task.id }]);
      toast.success("Task created");
    } catch (err) {
      toast.error("Failed to create task");
      console.error(err);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id.toString() === id.toString() ? { ...t, ...updates } : t)));
    if (selectedTask?.id.toString() === id.toString()) {
      setSelectedTask((prev) => prev ? { ...prev, ...updates } : prev);
    }

    const apiPayload: any = { ...updates };
    
    // Clean up frontend-only fields
    delete apiPayload.assignees;
    delete apiPayload.subtasks;
    delete apiPayload.checklists;
    delete apiPayload.checklist;
    delete apiPayload.comments;
    delete apiPayload.chat;
    delete apiPayload.dependent_tasks_legacy;
    
    if (updates.dueDate !== undefined) apiPayload.due_date = updates.dueDate;
    if (updates.startDate !== undefined) apiPayload.start_date = updates.startDate;
    if (updates.estimatedEffort !== undefined) apiPayload.duration = updates.estimatedEffort;
    
    const anyUpdates: any = updates;
    if (anyUpdates.assigneeIds !== undefined) {
        if (anyUpdates.assigneeIds.length > 0) {
            apiPayload.assigned_to = anyUpdates.assigneeIds[0];
            apiPayload.assignees = anyUpdates.assigneeIds;
        } else {
            apiPayload.assigned_to = null;
            apiPayload.assignees = [];
        }
    }
    
    if (updates.status === "todo") apiPayload.status = "pending";
    else if (updates.status === "in-progress") apiPayload.status = "in_progress";
    else if (updates.status === "blocked") apiPayload.status = "delayed";
    else if (updates.status === "done") apiPayload.status = "done";
    
    console.log("Sending update to backend:", id, apiPayload);
    
    // Pass snake_case payload
    const updatePromise = updateTaskApi(id, apiPayload);
    
    toast.promise(updatePromise, {
      loading: 'Wait, The task is updating...',
      success: 'Task successfully updated!',
      error: (err: any) => `Failed to update task: ${err.message || 'Unknown error'}`
    });

    try {
      await updatePromise;
      console.log("Update successful, refetch scheduled...");
      // Re-fetch is handled by tasks-updated event which is already debounced
    } catch (err: any) {
      console.error("Update task failed:", err);
      if (fetchTimeout) clearTimeout(fetchTimeout);
      fetchTimeout = setTimeout(() => fetchTasks(), 500);
    }
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id.toString() !== id.toString()));
    if (selectedTask?.id.toString() === id.toString()) setSelectedTask(null);

    try {
      await deleteTaskApi(id);
      toast.success("Task deleted");
    } catch (err) {
      toast.error("Failed to delete task");
      fetchTasks();
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
      totalTasks,
      totalPages,
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
