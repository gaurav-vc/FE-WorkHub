import { apiClient } from "./client";

export const getProjects = () => {
  return apiClient("/projects/");
};

export const createProject = (data: any) => {
  return apiClient("/projects/", {
    method: "POST",
    data,
  });
};

export const updateProject = (id: string, data: any) => {
  return apiClient(`/projects/${id}/`, {
    method: "PATCH",
    data,
  });
};

export const deleteProject = (id: string) => {
  return apiClient(`/projects/${id}/`, {
    method: "DELETE",
  });
};

export const duplicateProject = (id: string) => {
  return apiClient(`/projects/${id}/duplicate/`, {
    method: "POST",
  });
};

export const exportProject = async (id: string, projectName: string) => {
  // Since apiClient might parse JSON automatically, it's safer to use native fetch for downloading CSV
  // but we can just use window.open if it doesn't require authentication in cookies,
  // however, since it requires auth token, we use apiClient with responseType or handle it manually.
  // Assuming apiClient returns the raw response or blob if we pass responseType
  return apiClient(`/projects/${id}/export/`, {
    method: "GET",
    responseType: 'blob' // if axios is used under the hood
  }).then((data: any) => {
    // apiClient returns the blob directly
    const url = window.URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${projectName || 'Project'}_tasks.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
};

export const getDepartments = () => {
  return apiClient("/resources/departments/");
};

export const getTemplates = () => {
  return apiClient("/templates/");
};

export const importTemplate = (templateType: string, projectId: string) => {
  return apiClient(`/templates/${templateType}/import_template/`, {
    method: "POST",
    data: { project_id: projectId },
  });
};
