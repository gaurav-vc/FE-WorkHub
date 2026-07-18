import { apiClient } from "./client";
import { Task } from "@/types/tasks";

export const getTasks = () => {
  return apiClient("/tasks/");
};

export const createTask = (task: any) => {
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
  
  return apiClient("/tasks/", {
    method: "POST",
    data,
  });
};

export const updateTask = (id: string, updates: Partial<Task>) => {
  return apiClient(`/tasks/${id}/`, {
    method: "PATCH",
    data: updates,
  });
};

export const deleteTask = (id: string) => {
  return apiClient(`/tasks/${id}/`, {
    method: "DELETE",
  });
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
