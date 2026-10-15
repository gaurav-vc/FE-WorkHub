import React, { useState, useMemo } from "react";
import {
  Code2,
  Copy,
  Check,
  Search,
  Download,
  ExternalLink,
  BookOpen,
  Key,
  Layers,
  MessageSquare,
  Kanban,
  Calendar,
  Zap,
  Users,
  Radio,
  Terminal,
  ShieldCheck,
  Play,
  ArrowLeft,
  Sparkles,
  Server,
  RefreshCw,
  Globe,
  Lock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/config";

interface EndpointDoc {
  id: string;
  category: string;
  title: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "WS";
  path: string;
  description: string;
  authRequired: boolean;
  queryParams?: { name: string; type: string; default?: string; desc: string }[];
  headers?: { name: string; value: string; desc: string }[];
  requestBody?: object | string;
  responseStatus: number;
  responseBody: object;
  curlExample?: string;
  tags?: string[];
}

const API_CATEGORIES = [
  { id: "all", label: "All Endpoints", icon: Layers },
  { id: "auth", label: "01. Auth & Users", icon: Key },
  { id: "tasks", label: "02. Tasks & Activities", icon: BookOpen },
  { id: "projects", label: "03. Projects", icon: Layers },
  { id: "chat", label: "04. Team Chat", icon: MessageSquare },
  { id: "boards", label: "05. Custom Boards", icon: Kanban },
  { id: "calendar", label: "06. Calendar & Meetings", icon: Calendar },
  { id: "workflows", label: "07. Workflows", icon: Zap },
  { id: "hr", label: "08. HR & Directory", icon: Users },
  { id: "ws", label: "09. WebSockets", icon: Radio },
];

const ENDPOINTS: EndpointDoc[] = [
  // 01. Auth
  {
    id: "auth-login",
    category: "auth",
    title: "User Login",
    method: "POST",
    path: "/api/auth/login/",
    description: "Authenticates credentials and returns JWT bearer token, user metadata, and organization tenancy.",
    authRequired: false,
    headers: [
      { name: "Content-Type", value: "application/json", desc: "Standard JSON payload" }
    ],
    requestBody: {
      username: "admin",
      password: "your_secure_password"
    },
    responseStatus: 200,
    responseBody: {
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      user_id: 1,
      username: "admin",
      email: "admin@workhub.io",
      full_name: "Sarah Connor",
      role: "site_admin",
      organization_id: 1,
      organization_name: "Acme Global"
    }
  },
  {
    id: "auth-register",
    category: "auth",
    title: "Register New User",
    method: "POST",
    path: "/api/auth/register/",
    description: "Creates a new user profile attached to an organization.",
    authRequired: false,
    headers: [
      { name: "Content-Type", value: "application/json", desc: "Standard JSON payload" }
    ],
    requestBody: {
      username: "johndoe",
      email: "john.doe@workhub.io",
      password: "StrongPassword123!",
      first_name: "John",
      last_name: "Doe",
      organization: 1
    },
    responseStatus: 201,
    responseBody: {
      message: "User registered successfully",
      user_id: 24,
      username: "johndoe",
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  {
    id: "auth-me",
    category: "auth",
    title: "Current User Profile (Me)",
    method: "GET",
    path: "/api/auth/me/",
    description: "Returns the authenticated user's session profile, tenancy details, and assigned RBAC permissions.",
    authRequired: true,
    headers: [
      { name: "Authorization", value: "Bearer <token>", desc: "JWT or Session Token" }
    ],
    responseStatus: 200,
    responseBody: {
      id: 1,
      username: "admin",
      email: "admin@workhub.io",
      full_name: "Sarah Connor",
      role: "site_admin",
      is_superuser: true,
      organization: {
        id: 1,
        name: "Acme Global",
        slug: "acme-global"
      },
      permissions: [
        "tasks-projects:read",
        "tasks-projects:write",
        "team-chat:read",
        "team-chat:write"
      ]
    }
  },

  // 02. Tasks
  {
    id: "tasks-list",
    category: "tasks",
    title: "List & Filter Tasks",
    method: "GET",
    path: "/api/tasks/",
    description: "Retrieves a paginated list of tasks filtered by status, priority, assignee, search keywords, or project.",
    authRequired: true,
    queryParams: [
      { name: "status", type: "string", default: "all", desc: "Filter by status: all, todo, in-progress, blocked, done" },
      { name: "priority", type: "string", default: "all", desc: "Filter by priority: all, P1, P2, P3, P4" },
      { name: "assignee", type: "string", default: "", desc: "User ID or 'unassigned'" },
      { name: "view_mode", type: "string", default: "my_tasks", desc: "'my_tasks' (current user) or 'team_tasks' (entire org)" },
      { name: "search", type: "string", default: "", desc: "Fuzzy text search in title and description" },
      { name: "page", type: "integer", default: "1", desc: "Pagination page index" },
      { name: "paginate", type: "boolean", default: "true", desc: "Set to false to fetch unpaginated array" }
    ],
    headers: [
      { name: "Authorization", value: "Bearer <token>", desc: "Required" }
    ],
    responseStatus: 200,
    responseBody: {
      count: 42,
      next: "http://127.0.0.1:8000/api/tasks/?page=2",
      previous: null,
      status_counts: {
        todo: 12,
        in_progress: 15,
        blocked: 3,
        done: 12
      },
      results: [
        {
          id: 101,
          title: "Build Authentication Module",
          description: "JWT-based authentication flow with token refresh",
          status: "in_progress",
          priority: "P1",
          due_date: "2026-10-25",
          due_time: "18:00:00",
          project: "WorkHub Core",
          project_id: 1,
          assignee_detail: { id: 5, name: "Alex Chen", email: "alex@workhub.io" },
          assignees_detail: [{ id: 5, name: "Alex Chen" }, { id: 8, name: "James Wilson" }],
          estimated_effort: 8,
          effort_unit: "hours",
          is_urgent: true,
          created_by_name: "Sarah Connor"
        }
      ]
    }
  },
  {
    id: "tasks-create",
    category: "tasks",
    title: "Create Task",
    method: "POST",
    path: "/api/tasks/",
    description: "Creates a new task. Supports integer project_id or project name, flexible due_time ('17:00', '05:00 PM', null), subtasks, and checklists.",
    authRequired: true,
    headers: [
      { name: "Authorization", value: "Bearer <token>", desc: "Required" },
      { name: "Content-Type", value: "application/json", desc: "Required" }
    ],
    requestBody: {
      title: "Implement Flexible Due Time & Subtasks",
      description: "Support ISO times and 12-hour AM/PM formats seamlessly",
      project_id: 1,
      priority: "P2",
      status: "pending",
      due_date: "2026-10-30",
      due_time: "17:30",
      estimated_effort: 5,
      effort_unit: "hours",
      assigneeIds: [5, 8],
      subtasks: [
        { title: "Add serializer time parsing helper", status: "pending" },
        { title: "Lock task queue on completion", status: "pending" }
      ],
      checklists: [
        { title: "Run py_compile syntax checks" },
        { title: "Verify optimistic UI updates in frontend" }
      ]
    },
    responseStatus: 201,
    responseBody: {
      id: 145,
      title: "Implement Flexible Due Time & Subtasks",
      status: "pending",
      priority: "P2",
      due_date: "2026-10-30",
      due_time: "17:30:00",
      project_id: 1,
      project: "WorkHub Core",
      created_at: "2026-10-15T12:30:00Z"
    }
  },
  {
    id: "tasks-patch",
    category: "tasks",
    title: "Update Task (PATCH)",
    method: "PATCH",
    path: "/api/tasks/1/",
    description: "Partially updates task fields including status, priority, due date/time, and subtasks. Supports concurrent multi-task completion without queue rollback.",
    authRequired: true,
    headers: [
      { name: "Authorization", value: "Bearer <token>", desc: "Required" },
      { name: "Content-Type", value: "application/json", desc: "Required" }
    ],
    requestBody: {
      status: "completed",
      due_time: null
    },
    responseStatus: 200,
    responseBody: {
      id: 1,
      status: "completed",
      is_queued: false,
      updated_at: "2026-10-15T12:35:00Z"
    }
  },
  {
    id: "tasks-delete",
    category: "tasks",
    title: "Delete Task",
    method: "DELETE",
    path: "/api/tasks/1/",
    description: "Permanently deletes a task and cascading activities.",
    authRequired: true,
    headers: [
      { name: "Authorization", value: "Bearer <token>", desc: "Required" }
    ],
    responseStatus: 204,
    responseBody: {
      detail: "Task deleted successfully"
    }
  },

  // 03. Projects
  {
    id: "projects-list",
    category: "projects",
    title: "List Projects",
    method: "GET",
    path: "/api/projects/",
    description: "Fetches organization projects with task progress statistics and assigned team members.",
    authRequired: true,
    headers: [{ name: "Authorization", value: "Bearer <token>", desc: "Required" }],
    responseStatus: 200,
    responseBody: [
      {
        id: 1,
        name: "WorkHub Core",
        description: "Primary enterprise productivity suite platform",
        department: "Engineering",
        due_date: "2026-12-31",
        status: "active",
        progress: 74,
        tasks_count: 58,
        completed_tasks_count: 43
      }
    ]
  },
  {
    id: "projects-create",
    category: "projects",
    title: "Create Project",
    method: "POST",
    path: "/api/projects/create/",
    description: "Creates a new project portfolio and initializes milestone tracking.",
    authRequired: true,
    headers: [
      { name: "Authorization", value: "Bearer <token>", desc: "Required" },
      { name: "Content-Type", value: "application/json", desc: "Required" }
    ],
    requestBody: {
      name: "Mobile App v2.0",
      description: "Cross-platform mobile client with offline sync",
      department: "Mobile Engineering",
      due_date: "2026-11-30"
    },
    responseStatus: 201,
    responseBody: {
      id: 4,
      name: "Mobile App v2.0",
      department: "Mobile Engineering",
      created_at: "2026-10-15T12:00:00Z"
    }
  },

  // 04. Team Chat
  {
    id: "chat-channels",
    category: "chat",
    title: "List Channels",
    method: "GET",
    path: "/api/chat/channels/",
    description: "Retrieves public, private, and direct messaging channels for the authenticated user.",
    authRequired: true,
    headers: [{ name: "Authorization", value: "Bearer <token>", desc: "Required" }],
    responseStatus: 200,
    responseBody: [
      {
        id: "ch-general",
        name: "general",
        type: "channel",
        description: "Company-wide announcements and updates",
        unread_count: 0,
        last_message: {
          content: "Deployment v2.4 completed successfully",
          timestamp: "2026-10-15T12:20:00Z",
          sender: "DevOps Bot"
        }
      }
    ]
  },
  {
    id: "chat-messages",
    category: "chat",
    title: "Get Channel Messages",
    method: "GET",
    path: "/api/chat/messages/?channel_id=ch-general",
    description: "Fetches chronological message history for a channel with thread counts, file attachments, and emoji reactions.",
    authRequired: true,
    queryParams: [
      { name: "channel_id", type: "string", default: "ch-general", desc: "Target channel ID e.g. ch-general" }
    ],
    headers: [{ name: "Authorization", value: "Bearer <token>", desc: "Required" }],
    responseStatus: 200,
    responseBody: [
      {
        id: 501,
        channel: "ch-general",
        content: "Please review the updated API endpoints document.",
        created_at: "2026-10-15T12:40:00Z",
        sender_id: 1,
        sender_name: "Sarah Connor",
        attachments: [],
        reactions: [{ emoji: "👍", count: 4, users: [1, 5, 8, 12] }]
      }
    ]
  },
  {
    id: "chat-send",
    category: "chat",
    title: "Send Chat Message",
    method: "POST",
    path: "/api/chat/messages/",
    description: "Broadcasts a message to a channel or direct chat. Supports multipart file uploads and rich markdown.",
    authRequired: true,
    headers: [
      { name: "Authorization", value: "Bearer <token>", desc: "Required" },
      { name: "Content-Type", value: "multipart/form-data or application/json", desc: "Required" }
    ],
    requestBody: {
      channel: "ch-general",
      content: "All API docs are now available at /api/docs!"
    },
    responseStatus: 201,
    responseBody: {
      id: 502,
      channel: "ch-general",
      content: "All API docs are now available at /api/docs!",
      created_at: "2026-10-15T12:45:00Z"
    }
  },

  // 05. Boards
  {
    id: "boards-list",
    category: "boards",
    title: "List Custom Kanban Boards",
    method: "GET",
    path: "/api/boards/",
    description: "Fetches interactive workflow boards with configured columns and cards.",
    authRequired: true,
    headers: [{ name: "Authorization", value: "Bearer <token>", desc: "Required" }],
    responseStatus: 200,
    responseBody: [
      {
        id: 1,
        title: "Sprint 42 - Core Features",
        columns: [
          { id: 10, title: "Backlog", cards_count: 5 },
          { id: 11, title: "In Progress", cards_count: 3 },
          { id: 12, title: "Done", cards_count: 8 }
        ]
      }
    ]
  },

  // 06. Calendar
  {
    id: "calendar-meetings",
    category: "calendar",
    title: "List Scheduled Meetings",
    method: "GET",
    path: "/api/calendar/meetings/",
    description: "Returns upcoming calendar events, Google/Outlook sync statuses, and video conference links.",
    authRequired: true,
    headers: [{ name: "Authorization", value: "Bearer <token>", desc: "Required" }],
    responseStatus: 200,
    responseBody: [
      {
        id: 88,
        title: "Weekly Architecture Sync",
        start_time: "2026-10-16T10:00:00Z",
        end_time: "2026-10-16T11:00:00Z",
        conference_url: "https://meet.google.com/abc-defg-hij",
        attendees: ["alex@workhub.io", "sarah@workhub.io"]
      }
    ]
  },

  // 07. Workflows
  {
    id: "workflows-list",
    category: "workflows",
    title: "List Automated Workflows",
    method: "GET",
    path: "/api/workflows/",
    description: "Returns defined trigger-action automation pipelines (e.g., auto-assign tasks, webhook notifications).",
    authRequired: true,
    headers: [{ name: "Authorization", value: "Bearer <token>", desc: "Required" }],
    responseStatus: 200,
    responseBody: [
      {
        id: 12,
        name: "Auto-Notify Team on Critical Task",
        trigger: "task.created[priority=P1]",
        action: "chat.post_message[channel=ch-alerts]",
        is_active: true
      }
    ]
  },

  // 08. HR & Directory
  {
    id: "hr-directory",
    category: "hr",
    title: "Employee Directory",
    method: "GET",
    path: "/api/directory/",
    description: "Fetches organization roster with designations, departments, emails, and reporting structures.",
    authRequired: true,
    headers: [{ name: "Authorization", value: "Bearer <token>", desc: "Required" }],
    responseStatus: 200,
    responseBody: [
      {
        id: 5,
        full_name: "Alex Chen",
        email: "alex@workhub.io",
        department: "Engineering",
        designation: "Senior Backend Architect",
        status: "active"
      }
    ]
  },

  // 09. WebSockets
  {
    id: "ws-chat",
    category: "ws",
    title: "Real-time Team Chat WebSocket",
    method: "WS",
    path: "/ws/chat/?token={token}",
    description: "Full-duplex WebSocket stream for real-time messages, typing indicators, read receipts, and reactions.",
    authRequired: true,
    queryParams: [
      { name: "token", type: "string", desc: "JWT or Session authentication token" }
    ],
    responseStatus: 101,
    responseBody: {
      type: "chat_message",
      message: {
        id: 503,
        channel: "ch-general",
        content: "Live WebSocket message received!",
        sender: "Sarah Connor"
      }
    }
  }
];

export default function ApiDocs() {
  const navigate = useNavigate();
  
  // Dynamic Live Server resolution
  const detectedLiveHost = useMemo(() => {
    if (API_BASE && API_BASE.startsWith("http")) {
      return API_BASE.replace(/\/api\/?$/, "");
    }
    if (typeof window !== "undefined" && window.location.origin) {
      return window.location.origin;
    }
    return "http://127.0.0.1:8000";
  }, []);

  const [baseUrl, setBaseUrl] = useState<string>(detectedLiveHost);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDoc>(ENDPOINTS[0]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live execution test runner state
  const [authToken, setAuthToken] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
    }
    return "";
  });
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [liveResponse, setLiveResponse] = useState<{
    status: number;
    statusText: string;
    durationMs: number;
    data: any;
  } | null>(null);

  const presetEnvironments = useMemo(() => {
    const list = [
      { label: `Live Server (Auto-Detected: ${detectedLiveHost})`, value: detectedLiveHost },
      { label: "Production Cloud (https://workhub.vibecopilot.ai)", value: "https://workhub.vibecopilot.ai" },
      { label: "Staging Cloud (https://workhub.vibesandbox.live)", value: "https://workhub.vibesandbox.live" },
      { label: "Local Dev (http://127.0.0.1:8000)", value: "http://127.0.0.1:8000" }
    ];
    if (typeof window !== "undefined" && window.location.origin !== detectedLiveHost) {
      list.push({ label: `Current Origin (${window.location.origin})`, value: window.location.origin });
    }
    return list;
  }, [detectedLiveHost]);

  const filteredEndpoints = useMemo(() => {
    return ENDPOINTS.filter((endpoint) => {
      const matchesCategory =
        selectedCategory === "all" || endpoint.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        endpoint.title.toLowerCase().includes(q) ||
        endpoint.path.toLowerCase().includes(q) ||
        endpoint.method.toLowerCase().includes(q) ||
        endpoint.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-blue-600 text-white font-mono hover:bg-blue-700";
      case "POST":
        return "bg-emerald-600 text-white font-mono hover:bg-emerald-700";
      case "PUT":
        return "bg-amber-600 text-white font-mono hover:bg-amber-700";
      case "PATCH":
        return "bg-purple-600 text-white font-mono hover:bg-purple-700";
      case "DELETE":
        return "bg-rose-600 text-white font-mono hover:bg-rose-700";
      case "WS":
        return "bg-cyan-600 text-white font-mono hover:bg-cyan-700";
      default:
        return "bg-slate-700 text-white font-mono";
    }
  };

  const getFullUrl = (endpoint: EndpointDoc) => {
    if (endpoint.method === "WS") {
      const wsProtocol = baseUrl.startsWith("https") ? "wss:" : "ws:";
      const hostPart = baseUrl.replace(/^https?:\/\//, "");
      return `${wsProtocol}//${hostPart}${endpoint.path}`;
    }
    return `${baseUrl}${endpoint.path}`;
  };

  const generateCurl = (endpoint: EndpointDoc) => {
    const fullUrl = getFullUrl(endpoint);

    if (endpoint.method === "WS") {
      return `# Connect to live WebSocket:\nwscat -c "${fullUrl.replace("{token}", authToken || "YOUR_JWT_TOKEN")}"`;
    }

    let curl = `curl -X ${endpoint.method} "${fullUrl}"`;
    if (endpoint.authRequired) {
      curl += ` \\\n  -H "Authorization: Bearer ${authToken || "YOUR_TOKEN_HERE"}"`;
    }
    if (endpoint.requestBody) {
      curl += ` \\\n  -H "Content-Type: application/json"`;
      curl += ` \\\n  -d '${JSON.stringify(endpoint.requestBody, null, 2)}'`;
    }
    return curl;
  };

  const generateFetch = (endpoint: EndpointDoc) => {
    const fullUrl = getFullUrl(endpoint);
    const options: any = {
      method: endpoint.method,
      headers: {}
    };
    if (endpoint.authRequired) {
      options.headers["Authorization"] = `Bearer ${authToken || "YOUR_TOKEN_HERE"}`;
    }
    if (endpoint.requestBody) {
      options.headers["Content-Type"] = "application/json";
      options.body = endpoint.requestBody;
    }
    return `const response = await fetch("${fullUrl}", ${JSON.stringify(
      options,
      null,
      2
    )});\nconst data = await response.json();\nconsole.log(data);`;
  };

  // Live Request Execution
  const executeLiveRequest = async () => {
    if (selectedEndpoint.method === "WS") {
      toast.info("WebSockets cannot be executed over HTTP fetch. Connect using wscat or in-app chat.");
      return;
    }

    const fullUrl = getFullUrl(selectedEndpoint);
    setIsExecuting(true);
    setLiveResponse(null);
    const start = performance.now();

    try {
      const headers: Record<string, string> = {
        Accept: "application/json"
      };
      if (selectedEndpoint.authRequired && authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      if (selectedEndpoint.requestBody && selectedEndpoint.method !== "GET") {
        headers["Content-Type"] = "application/json";
      }

      const res = await fetch(fullUrl, {
        method: selectedEndpoint.method,
        headers,
        body:
          selectedEndpoint.requestBody && selectedEndpoint.method !== "GET"
            ? JSON.stringify(selectedEndpoint.requestBody)
            : undefined
      });

      const end = performance.now();
      const durationMs = Math.round(end - start);

      let data: any;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      setLiveResponse({
        status: res.status,
        statusText: res.statusText,
        durationMs,
        data
      });

      if (res.ok) {
        toast.success(`Live server responded with ${res.status} ${res.statusText} (${durationMs}ms)`);
      } else {
        toast.error(`Live server returned ${res.status} ${res.statusText}`);
      }
    } catch (err: any) {
      const end = performance.now();
      setLiveResponse({
        status: 0,
        statusText: "Network / CORS Error",
        durationMs: Math.round(end - start),
        data: {
          error: err.message || "Failed to reach live server",
          note: "Check if the live server URL is reachable and CORS allows requests from this origin."
        }
      });
      toast.error(`Request failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Download Postman Collection pre-configured with current live server URL
  const downloadLivePostman = () => {
    const postman = {
      info: {
        name: `WorkHub API Collection (${new URL(baseUrl).hostname})`,
        description: `Exported from WorkHub API Docs for live server: ${baseUrl}`,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      variable: [
        {
          key: "base_url",
          value: `${baseUrl}/api`,
          type: "string"
        },
        {
          key: "token",
          value: authToken || "YOUR_JWT_TOKEN_HERE",
          type: "string"
        }
      ],
      item: ENDPOINTS.map((ep) => ({
        name: ep.title,
        request: {
          method: ep.method === "WS" ? "GET" : ep.method,
          header: [
            ...(ep.authRequired ? [{ key: "Authorization", value: "Bearer {{token}}" }] : []),
            ...(ep.requestBody ? [{ key: "Content-Type", value: "application/json" }] : [])
          ],
          body: ep.requestBody
            ? {
                mode: "raw",
                raw: JSON.stringify(ep.requestBody, null, 2)
              }
            : undefined,
          url: {
            raw: `{{base_url}}${ep.path.replace("/api", "")}`,
            host: ["{{base_url}}"],
            path: ep.path.replace("/api/", "").split("/").filter(Boolean)
          }
        }
      }))
    };

    const blob = new Blob([JSON.stringify(postman, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `workhub_api_${new URL(baseUrl).hostname}.postman_collection.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Downloaded live Postman collection!");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
            title="Return to Home Dashboard"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to App
          </Button>
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Code2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-tight flex items-center gap-2">
                WorkHub API Reference
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono border border-emerald-500/30 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Server Active
                </span>
              </h1>
              <p className="text-xs text-slate-400">Enterprise REST & WebSocket Specifications</p>
            </div>
          </div>
        </div>

        {/* Global Controls & Server Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Server Selector */}
          <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
            <Globe className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-400 hidden sm:inline">Target Server:</span>
            <select
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="bg-slate-900 text-indigo-300 font-mono focus:outline-none border border-slate-700 rounded px-2 py-1 text-xs"
            >
              {presetEnvironments.map((env) => (
                <option key={env.value} value={env.value}>
                  {env.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://..."
              className="bg-transparent text-indigo-300 font-mono focus:outline-none w-36 sm:w-48 text-xs border-b border-slate-700"
              title="Edit custom server base URL"
            />
          </div>

          {/* Raw Spec Backend Link */}
          <a
            href={`${baseUrl}/api/api-docs/`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700"
            title="Open raw JSON specification from live server"
          >
            <Server className="h-3.5 w-3.5 text-indigo-400" />
            Raw API JSON
            <ExternalLink className="h-3 w-3" />
          </a>

          {/* Download Postman */}
          <Button
            onClick={downloadLivePostman}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-3.5 py-2 shadow-md shadow-indigo-600/20"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export Live Postman
          </Button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar - Navigation & Filtering */}
        <aside className="w-full md:w-80 border-r border-slate-800 bg-slate-900/60 flex flex-col flex-shrink-0">
          {/* Search Box */}
          <div className="p-3.5 border-b border-slate-800/80">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search endpoints, paths, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-800/70 border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs h-9"
              />
            </div>
          </div>

          {/* Categories Pill Selector */}
          <div className="p-2 border-b border-slate-800/80 overflow-x-auto flex gap-1 no-scrollbar">
            {API_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? "bg-indigo-600 text-white font-medium shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <cat.icon className="h-3 w-3" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* Endpoints List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredEndpoints.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No endpoints found matching "{searchQuery}"
              </div>
            ) : (
              filteredEndpoints.map((ep) => {
                const isSelected = selectedEndpoint.id === ep.id;
                return (
                  <button
                    key={ep.id}
                    onClick={() => {
                      setSelectedEndpoint(ep);
                      setLiveResponse(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-indigo-600/15 border border-indigo-500/40 text-white shadow-sm"
                        : "hover:bg-slate-800/60 border border-transparent text-slate-300"
                    }`}
                  >
                    <Badge className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ${getMethodBadgeClass(ep.method)}`}>
                      {ep.method}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate leading-tight">
                        {ep.title}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                        {ep.path}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Detail Panel */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-950">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header info */}
            <div className="bg-slate-900/80 rounded-xl p-6 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Badge className={`text-xs px-2.5 py-1 font-mono font-bold ${getMethodBadgeClass(selectedEndpoint.method)}`}>
                    {selectedEndpoint.method}
                  </Badge>
                  <code className="text-sm font-mono text-indigo-300 bg-slate-800/80 px-3 py-1 rounded-md border border-slate-700/60">
                    {selectedEndpoint.path}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  {/* Direct Open in Browser on Live Server */}
                  <a
                    href={getFullUrl(selectedEndpoint)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-medium"
                    title="Open this endpoint URL on live server in a new browser tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open on Live Server
                  </a>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(getFullUrl(selectedEndpoint), "fullPath")}
                    className="border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs"
                  >
                    {copiedId === "fullPath" ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    Copy Live URL
                  </Button>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">{selectedEndpoint.title}</h2>
                <p className="text-sm text-slate-400 mt-1">{selectedEndpoint.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-amber-400" />
                  <span>Authentication:</span>
                  <span className={selectedEndpoint.authRequired ? "text-amber-300 font-medium" : "text-emerald-400 font-medium"}>
                    {selectedEndpoint.authRequired ? "Bearer Token Required" : "Public (No Auth Required)"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Live Host:</span>
                  <span className="text-indigo-300 font-mono">{baseUrl}</span>
                </div>
              </div>
            </div>

            {/* Live Interactive Test Console */}
            <div className="bg-slate-900/70 rounded-xl p-5 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Play className="h-3.5 w-3.5 text-emerald-400" />
                  Live API Runner (Send Request to Live Server)
                </h3>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={executeLiveRequest}
                    disabled={isExecuting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3 py-1.5 h-8 shadow-md shadow-emerald-600/20"
                  >
                    {isExecuting ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                        Send Live Request
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Auth Token Override */}
              {selectedEndpoint.authRequired && (
                <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                  <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="text-slate-400 shrink-0 font-medium">Session Token:</span>
                  <input
                    type="text"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="Enter JWT Token (auto-loaded from active login if present)"
                    className="bg-transparent text-indigo-200 font-mono focus:outline-none flex-1 text-xs"
                  />
                </div>
              )}

              {/* Live Execution Output */}
              {liveResponse && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      {liveResponse.status >= 200 && liveResponse.status < 300 ? (
                        <Badge className="bg-emerald-600 text-white font-mono flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {liveResponse.status} {liveResponse.statusText}
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-600 text-white font-mono flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {liveResponse.status || "Error"} {liveResponse.statusText}
                        </Badge>
                      )}
                      <span className="text-slate-400 font-mono text-[11px]">
                        Latency: {liveResponse.durationMs}ms
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleCopy(JSON.stringify(liveResponse.data, null, 2), "liveOutput")
                      }
                      className="text-slate-400 hover:text-white h-7 text-xs"
                    >
                      {copiedId === "liveOutput" ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                      Copy Response
                    </Button>
                  </div>

                  <pre className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-emerald-300 border border-slate-800/80 overflow-x-auto leading-relaxed max-h-72">
                    {typeof liveResponse.data === "object"
                      ? JSON.stringify(liveResponse.data, null, 2)
                      : String(liveResponse.data)}
                  </pre>
                </div>
              )}
            </div>

            {/* Query Parameters Table */}
            {selectedEndpoint.queryParams && selectedEndpoint.queryParams.length > 0 && (
              <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                  Query Parameters
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-2 font-mono">Parameter</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Default</th>
                        <th className="pb-2">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {selectedEndpoint.queryParams.map((param) => (
                        <tr key={param.name}>
                          <td className="py-2.5 font-mono text-indigo-300 font-medium">{param.name}</td>
                          <td className="py-2.5 text-slate-400 font-mono text-[11px]">{param.type}</td>
                          <td className="py-2.5 text-slate-500 font-mono text-[11px]">{param.default || "-"}</td>
                          <td className="py-2.5 text-slate-300">{param.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Request Body & Payload */}
            {selectedEndpoint.requestBody && (
              <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Code2 className="h-3.5 w-3.5 text-indigo-400" />
                    Request Body (JSON)
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleCopy(JSON.stringify(selectedEndpoint.requestBody, null, 2), "reqBody")
                    }
                    className="text-slate-400 hover:text-white h-7 text-xs"
                  >
                    {copiedId === "reqBody" ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    Copy JSON
                  </Button>
                </div>
                <pre className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-indigo-200 border border-slate-800/80 overflow-x-auto leading-relaxed">
                  {JSON.stringify(selectedEndpoint.requestBody, null, 2)}
                </pre>
              </div>
            )}

            {/* Response Samples */}
            <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  Sample Expected Response ({selectedEndpoint.responseStatus}{" "}
                  {selectedEndpoint.responseStatus === 200
                    ? "OK"
                    : selectedEndpoint.responseStatus === 201
                    ? "Created"
                    : selectedEndpoint.responseStatus === 204
                    ? "No Content"
                    : "Protocol Switch"}
                  )
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleCopy(JSON.stringify(selectedEndpoint.responseBody, null, 2), "resBody")
                  }
                  className="text-slate-400 hover:text-white h-7 text-xs"
                >
                  {copiedId === "resBody" ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  Copy JSON
                </Button>
              </div>
              <pre className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-emerald-300 border border-slate-800/80 overflow-x-auto leading-relaxed">
                {JSON.stringify(selectedEndpoint.responseBody, null, 2)}
              </pre>
            </div>

            {/* Code Examples Tabs */}
            <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-800 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                Live Integration Code Snippets (Auto-Targeting {baseUrl})
              </h3>

              <Tabs defaultValue="curl" className="w-full">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <TabsList className="bg-slate-800/80">
                    <TabsTrigger value="curl" className="text-xs">cURL</TabsTrigger>
                    <TabsTrigger value="fetch" className="text-xs">JavaScript (Fetch)</TabsTrigger>
                  </TabsList>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(generateCurl(selectedEndpoint), "codeSnippet")}
                    className="text-slate-400 hover:text-white h-7 text-xs"
                  >
                    {copiedId === "codeSnippet" ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    Copy Snippet
                  </Button>
                </div>

                <TabsContent value="curl" className="mt-3">
                  <pre className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-amber-200/90 border border-slate-800/80 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {generateCurl(selectedEndpoint)}
                  </pre>
                </TabsContent>

                <TabsContent value="fetch" className="mt-3">
                  <pre className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-sky-200 border border-slate-800/80 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {generateFetch(selectedEndpoint)}
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
