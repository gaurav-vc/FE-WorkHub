import { apiClient } from "./client";
import { Task } from "@/types/tasks";
import { API_BASE } from "@/config";

export const getTasks = (params: any = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/tasks/${query ? `?${query}` : ''}`);
};

export const getTaskById = async (id: string) => {
  const isBoardCard = id.toString().startsWith("board_card_");
  if (isBoardCard) {
    const cardId = id.replace('board_card_', '');
    return await apiClient(`/boards/cards/${cardId}/`);
  }
  return await apiClient(`/tasks/${id}/`);
};

const triggerSync = () => {
  window.dispatchEvent(new Event('tasks-updated'));
};

export const createTask = async (task: any) => {
  let data: any = task;
  
  if (task.file) {
    const formData = new FormData();
    Object.keys(task).forEach(key => {
      if (task[key] !== null && task[key] !== undefined) {
        if (key === 'file') {
          formData.append(key, task[key]);
        } else if (typeof task[key] === 'object' && task[key] !== null) {
          formData.append(key, JSON.stringify(task[key]));
        } else {
          formData.append(key, String(task[key]));
        }
      }
    });
    data = formData;
  }
  
  const res = await apiClient("/tasks/", {
    method: "POST",
    data,
  });
  triggerSync();
  return res;
};

export const updateTask = async (id: string, updates: Partial<Task>) => {
  const isBoardCard = id.toString().startsWith("board_card_");
  
  if (isBoardCard) {
    const cardId = id.replace('board_card_', '');
    const res = await apiClient(`/boards/cards/${cardId}/`, {
      method: "PATCH",
      data: updates,
    });
    triggerSync();
    return res;
  } else {
    const res = await apiClient(`/tasks/${id}/`, {
      method: "PATCH",
      data: updates,
    });
    triggerSync();
    return res;
  }
};

export const deleteTask = async (id: string) => {
  const res = await apiClient(`/tasks/${id}/`, {
    method: "DELETE",
  });
  triggerSync();
  return res;
};

export const getMyDayDashboard = () => {
  return apiClient("/myday/dashboard/");
};

export const submitApprovalAction = (id: string, action: string) => {
  return apiClient(`/myday/approvals/${id}/action/`, {
    method: "POST",
    data: { action },
  });
};

export const addQuickLink = (data: { label: string; url: string }) => {
  return apiClient("/myday/quicklinks/create/", {
    method: "POST",
    data,
  });
};

export const addTaskComment = (taskId: string, text: string) => {
  return apiClient(`/projects/tasks/${taskId}/add_comment/`, {
    method: "POST",
    data: { text },
  });
};

export const addTaskChat = (taskId: string, text: string) => {
  return apiClient(`/projects/tasks/${taskId}/add_chat/`, {
    method: "POST",
    data: { text },
  });
};

export const getAdminTaskSummary = (params: any = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/myday/admin-summary/${query ? `?${query}` : ''}`);
};

export const getUserTaskGraph = (userId: string, params: any = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/myday/user-graph/${userId}/${query ? `?${query}` : ''}`);
};

export const bulkUploadTasks = async (data: FormData | { tasks: any[]; default_project_id?: string; default_assigned_to_id?: string; default_priority?: string }) => {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  const res = await apiClient("/tasks/bulk_upload/", {
    method: "POST",
    data
  });
  triggerSync();
  return res;
};

export const downloadTaskCsvTemplate = async (availableProjects: string[] = []) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const headers: any = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}/tasks/csv_template/`, { headers });
    if (!res.ok) throw new Error("Server returned " + res.status);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "task_bulk_upload_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    // Client-side fallback template with titles and sample data
    const proj1 = availableProjects[0] || "Mobile App Development";
    const proj2 = availableProjects[1] || "Website Redesign";
    const proj3 = availableProjects[2] || "General Workspace";
    const today = new Date().toISOString().split("T")[0];
    const templateContent = [
      "Task Topic,Description,Priority,Due Date,Due Time,Project,Assigned To,Type,Platform,Estimated Effort,Effort Unit,Is Urgent,Tags",
      `"Implement Authentication Flow","Integrate JWT token login, refresh endpoints and RBAC","P1","${today}","17:00","${proj1}","","Feature","Backend","6","hours","TRUE","auth, security, api"`,
      `"Design Dashboard UI","Build modern widgets and activity charts","P2","${today}","18:30","${proj2}","","Enhancement","Web","8","hours","FALSE","ui, design, frontend"`,
      `"Database Optimization","Add indexes on task tables to improve query speed","P3","${today}","15:00","${proj3}","","Issue","Database","4","hours","FALSE","db, performance"`
    ].join("\n");

    const blob = new Blob([templateContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "task_bulk_upload_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
};

