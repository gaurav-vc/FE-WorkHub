import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Task, Notification } from "@/types/tasks";
import { getTasks, createTask, updateTask as updateTaskApi, deleteTask as deleteTaskApi } from "@/api/tasks";
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
}

const TaskContext = createContext<TaskContextType | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const mapTaskFromApi = (t: any): Task => {
    return {
      ...t,
      dueDate: t.due_date || t.dueDate || "",
      startDate: t.start_date || t.created_at || t.startDate || "",
      assignees: t.assignees || (t.assignee_detail ? [{
        id: t.assignee_detail.id,
        name: t.assignee_detail.name,
        initials: t.assignee_detail.name.substring(0, 2).toUpperCase()
      }] : []),
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
      estimatedEffort: t.estimatedEffort || t.duration || 3,
      effortUnit: t.effortUnit || "hours",
      actualEffort: t.actualEffort || 0,
    };
  };

  const fetchTasks = async () => {
    try {
      const data = await getTasks();
      const rawTasks = data.results || data;
      setTasks(rawTasks.map(mapTaskFromApi));
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/workspace/notifications/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const rawNotifs = data.results || data;
        setNotifications(rawNotifs.map((n: any) => ({
          id: n.id,
          type: n.type || 'task-updated',
          title: n.title,
          message: n.message,
          time: new Date(n.time).toLocaleString(),
          read: n.is_read || n.read || false,
          link: n.link
        })));
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchTasks();
      fetchNotifications();
      
      // Optional: Setup polling for notifications every 60 seconds
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    } else if (!isAuthenticated) {
      setTasks([]);
      setNotifications([]);
    }
  }, [isAuthenticated, token]);

  const addTask = async (task: Task) => {
    try {
      const newTask = await createTask(task);
      setTasks((prev) => [...prev, mapTaskFromApi(newTask)]);
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
    if (updates.dueDate !== undefined) apiPayload.due_date = updates.dueDate;
    if (updates.startDate !== undefined) apiPayload.start_date = updates.startDate;
    if (updates.estimatedEffort !== undefined) apiPayload.duration = updates.estimatedEffort;
    
    // Pass snake_case payload
    try {
      await updateTaskApi(id, apiPayload);
    } catch (err) {
      fetchTasks();
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
    setNotifications((prev) => prev.map((n) => (n.id.toString() === id.toString() ? { ...n, read: true } : n)));
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
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
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
      notifications, setNotifications, markNotificationRead, markAllNotificationsRead, unreadCount,
      selectedTask, setSelectedTask,
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
