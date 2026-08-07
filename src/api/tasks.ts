import { apiClient } from "./client";
import { Task } from "@/types/tasks";

export const getTasks = (params: any = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/tasks/${query ? `?${query}` : ''}`);
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
