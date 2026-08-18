export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface SubTask {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: "todo" | "in-progress" | "done";
}

export interface TaskComment {
  id: string;
  user?: string;
  user_name?: string;
  initials?: string;
  text: string;
  time?: string;
  created_at?: string;
  attachments?: string[];
  mentions?: string[];
}

export interface TaskChatMessage {
  id: string;
  user?: string;
  user_name?: string;
  initials?: string;
  text: string;
  time?: string;
  created_at?: string;
  file?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  file?: string;
  uploaded_by_name?: string;
  created_at?: string;
}

export interface RepeatConfig {
  enabled: boolean;
  type: "daily" | "weekly" | "monthly" | "custom";
  interval?: number;
  unit?: "days" | "weeks" | "months";
  endDate?: string;
  infinite?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  taskType: "self" | "assign";
  type?: string;
  platform?: string;
  priority: "P1" | "P2" | "P3" | "P4";
  status: "Yet to Start" | "in-progress" | "done" | "blocked" | "delayed";
  project: string;
  assignees: Array<{ id?: string | number; name: string; initials: string }>;
  createdBy: { name: string; initials: string };
  createdDate: string;
  createdTime?: string;
  dueDate: string;
  dueTime: string;
  startDate: string;
  estimatedEffort: number;
  effortUnit: "hours" | "days";
  actualEffort: number;

  // Dynamic queue & health properties
  timeIntervalMinutes?: number;
  startedAt?: string;
  isQueued?: boolean;
  healthStatus?: "green" | "yellow" | "red";
  isUrgent: boolean;
  repeat: RepeatConfig;
  dependencies: string[];
  dependent_tasks_legacy?: string[];
  file?: File | null;
  checklist: ChecklistItem[];
  checklists?: ChecklistItem[];
  subtasks: SubTask[];
  comments: TaskComment[];
  chat?: TaskChatMessage[];
  chats?: TaskChatMessage[];
  attachments: TaskAttachment[];
  tags: string[];
  assigneeIds?: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: string;
  capacity: number;
  capacityUnit: "hours/day" | "hours/week";
  avatar?: string;
}

export interface ResourceAllocation {
  resourceId: string;
  taskId: string;
  hours: number;
  startDate: string;
  endDate: string;
}

export interface Notification {
  id: string;
  type: "task-assigned" | "task-updated" | "comment" | "mention" | "dependency-complete" | "urgent";
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tasks: number;
  icon: string;
  popular?: boolean;
}
