import { useState, useEffect } from "react";
import {
  FolderKanban,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PagedPagination } from "@/components/ui/PagedPagination";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getProjects, createProject, updateProject, deleteProject as deleteProjectApi, getDepartments, getTemplates, importTemplate, duplicateProject, exportProject } from "@/api/projects";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "on-hold" | "completed" | "planning";
  progress: number;
  department: string;
  template_type: string;
  team: Array<{ name: string; initials: string }>;
  dueDate: string | null;
  tasks: any;
  imported_tasks?: any[];
  created_by_name?: string;
}

const DEFAULT_COLUMNS = [
  { id: "planning", title: "Planning", color: "bg-slate-400" },
  { id: "open", title: "Open", color: "bg-blue-400" },
  { id: "started", title: "Started", color: "bg-indigo-400" },
  { id: "pending", title: "Pending", color: "bg-yellow-500" },
  { id: "review", title: "Review", color: "bg-purple-500" },
  { id: "completed", title: "Completed", color: "bg-green-500" },
  { id: "closed", title: "Closed", color: "bg-red-500" },
];

const STATUS_MAPPING: Record<string, string> = {
  "in_progress": "open",
  "done": "completed",
  "hold": "pending",
  "on_hold": "pending",
  "delay": "review",
  "delayed": "review",
  "todo": "planning",
  "not_started": "planning",
  "not started": "planning",
};

const getMappedStatus = (status: string, columns: Array<{ id: string }>) => {
  if (!status) return "pending";
  const s = status.toLowerCase();
  if (columns.some(c => c.id === s)) return s;
  return STATUS_MAPPING[s] || s;
};

const getStatusStyles = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('planning')) return { backgroundColor: '#e0f2fe', color: '#0369a1' }; // Sky blue
  if (s.includes('open') && !s.includes('re-open')) return { backgroundColor: '#fce7f3', color: '#be185d' }; // Pink
  if (s.includes('pending')) return { backgroundColor: '#fee2e2', color: '#b91c1c' }; // Red
  if (s.includes('wip') || s.includes('progress')) return { backgroundColor: '#ede9fe', color: '#6d28d9' }; // Purple
  if (s.includes('review')) return { backgroundColor: '#fef3c7', color: '#b45309' }; // Amber
  if (s.includes('complete') || s.includes('done')) return { backgroundColor: '#dcfce7', color: '#15803d' }; // Green
  if (s.includes('closed')) return { backgroundColor: '#ccfbf1', color: '#0f766e' }; // Teal
  if (s.includes('re-open') || s.includes('delayed')) return { backgroundColor: '#ffedd5', color: '#c2410c' }; // Orange
  return { backgroundColor: '#f3f4f6', color: '#374151' }; // Gray
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-success/10 text-success border-success/20" },
  "on-hold": { label: "On Hold", color: "bg-warning/10 text-warning border-warning/20" },
  completed: { label: "Completed", color: "bg-info/10 text-info border-info/20" },
  planning: { label: "Planning", color: "bg-muted text-muted-foreground border-border" },
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: "", description: "", department: "Entire Organization", status: "planning" as Project["status"], dueDate: "", template_type: "blank" });
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();
  const { token } = useAuth();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects({ search, status: filterStatus, page: currentPage });
      const rawProjects = data.results || data;
      setProjects(rawProjects.map((p: any) => ({
        id: p.id.toString(),
        name: p.name,
        description: p.description,
        status: p.status,
        progress: p.progress || 0,
        department: p.department || "",
        template_type: p.template_type || "blank",
        team: p.team || [],
        dueDate: p.dueDate,
        tasks: p.tasks || { total: 0, completed: 0 },
        imported_tasks: p.imported_tasks || [],
        created_by_name: p.created_by_name,
      })));
      if (data.count !== undefined) {
        setTotalPages(Math.ceil(data.count / 12));
      } else {
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Failed to fetch projects", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch(e) {}
  };

  useEffect(() => {
    fetchTemplates();
    fetchDepartments();
  }, [token]);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchProjects();
    }, 300);
    return () => clearTimeout(delay);
  }, [token, currentPage, search, filterStatus]);

  const openCreate = () => { setEditProject(null); setForm({ name: "", description: "", department: "Entire Organization", status: "planning", dueDate: "", template_type: "blank" }); setShowDialog(true); };
  
  const openEdit = (e: React.MouseEvent, p: Project) => { 
    e.stopPropagation();
    setEditProject(p); 
    setForm({ name: p.name, description: p.description, department: p.department, status: p.status, dueDate: p.dueDate || "", template_type: p.template_type }); 
    setShowDialog(true); 
  };

  const saveProject = async () => {
    if (!form.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    try {
      const payload: any = { ...form };
      if (!payload.dueDate) {
        delete payload.dueDate;
      }
      
      let savedProject;
      if (editProject) {
        savedProject = await updateProject(editProject.id, payload);
      } else {
        savedProject = await createProject(payload);
      }

      if (!editProject && form.template_type && form.template_type !== "blank" && !["software", "marketing", "design"].includes(form.template_type)) {
        try {
          await importTemplate(form.template_type, savedProject.id);
        } catch(e: any) { 
          console.error("Template import failed", e); 
          toast.error(`Template import error: ${e.message}`);
        }
      }

      toast.success(`Project ${editProject ? 'updated' : 'created'} successfully`);
      fetchProjects();
      setShowDialog(false);
    } catch (err) {
      toast.error("Failed to save project");
    }
  };

  const deleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project?")) return;
    
    try {
      await deleteProjectApi(id);
      toast.success("Project deleted");
      fetchProjects();
    } catch (err) {
      toast.error("Failed to delete project");
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await duplicateProject(id);
      toast.success("Project duplicated successfully");
      fetchProjects();
    } catch (err) {
      toast.error("Failed to duplicate project");
    }
  };

  const handleExport = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    try {
      await exportProject(project.id, project.name);
      toast.success("Project exported successfully");
    } catch (err) {
      toast.error("Failed to export project");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" /> Projects
          </h1>
          <p className="text-muted-foreground mt-1">Track project progress, teams, and milestones</p>
        </div>
        <PermissionGuard requires="create">
          <Button className="gradient-primary text-primary-foreground gap-1.5 px-6 py-5 text-base shadow-md hover:shadow-lg transition-all" onClick={openCreate}>
            <Plus className="h-5 w-5" /> New Project
          </Button>
        </PermissionGuard>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : projects.length === 0 ? (
         <div className="text-center p-12 bg-card rounded-xl border border-dashed border-border shadow-sm">
           <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
           <h3 className="text-lg font-medium text-foreground">No projects found</h3>
           <p className="text-muted-foreground mt-1">Create a new project to get started.</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card 
              key={project.id} 
              className="shadow-card hover:shadow-md transition-all cursor-pointer group"
              onClick={() => navigate(`/tasks/projects/${project.id}`)}
            >
              <CardContent className="p-6 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-[15px] font-bold text-slate-800 group-hover:text-primary transition-colors">{project.name}</h3>
                    <p className="text-[11px] font-medium text-slate-400 mt-1 line-clamp-1">
                      {project.department || 'General'} &middot; {project.template_type === 'blank' ? 'Project' : project.template_type || 'Project'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`${statusConfig[project.status]?.color || statusConfig['planning'].color} text-[10px] font-semibold border-0 bg-opacity-10 px-2.5 py-1 whitespace-nowrap flex items-center`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${statusConfig[project.status]?.color?.replace('text-', 'bg-').replace('border-', 'bg-') || 'bg-slate-400'}`}></span>
                      {statusConfig[project.status]?.label || 'Planning'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <PermissionGuard requires="edit">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(e as any, project); }}>
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleDuplicate(e as any, project.id)}>
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleExport(e as any, project)}>
                            Export
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={(e) => deleteProject(e as any, project.id)}>
                            Archive
                          </DropdownMenuItem>
                        </PermissionGuard>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* 2x2 Grid */}
                <div className="grid grid-cols-2 gap-y-5 gap-x-2 mb-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Access Scope</p>
                    <p className="text-xs font-semibold text-slate-700">{project.department || 'Execution'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project Head</p>
                    <p className="text-xs font-semibold text-slate-700">{project.created_by_name || 'System'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Tasks</p>
                    <p className="text-xs font-semibold text-slate-700">{project.imported_tasks?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Timeline Status</p>
                    <p className="text-xs font-semibold text-slate-700">
                      {(() => {
                        if (!project.dueDate) return 'TBD';
                        if (['completed', 'closed', 'done'].includes(project.status.toLowerCase())) return 'Completed';
                        
                        const due = new Date(project.dueDate);
                        const today = new Date();
                        due.setHours(0,0,0,0);
                        today.setHours(0,0,0,0);
                        
                        const diffTime = due.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays < 0) return <span className="text-red-500">{Math.abs(diffDays)} day{Math.abs(diffDays) === 1 ? '' : 's'} behind</span>;
                        if (diffDays === 0) return <span className="text-amber-500">Due today</span>;
                        return <span className="text-emerald-500">On Schedule</span>;
                      })()}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                {(() => {
                  const totalTasks = project.imported_tasks?.length || 0;
                  const completedTasks = project.imported_tasks?.filter((t: any) => ['completed', 'done', 'closed'].includes(t.status?.toLowerCase())).length || 0;
                  const progressValue = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                  
                  let progressColor = "bg-blue-600";
                  if (project.status === "completed") progressColor = "bg-blue-600";
                  else if (project.status === "on-hold" || project.status === "planning") progressColor = "bg-amber-500";
                  else if (project.status === "active") progressColor = "bg-emerald-500";
                  else progressColor = "bg-red-500";

                  return (
                    <div className="mb-6">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                        <span>Progress</span>
                        <span className="text-slate-700">{progressValue}%</span>
                      </div>
                      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${progressColor} rounded-full`} style={{ width: `${progressValue}%` }} />
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-auto">
                  {/* Date & Avatars row */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      {project.dueDate ? `Due ${project.dueDate}` : 'No Due Date'}
                    </div>

                    <div className="flex items-center gap-1">
                      {(() => {
                        const activeAssignees = new Map();
                        if (project.imported_tasks) {
                          project.imported_tasks.forEach((task: any) => {
                            if (task.assignee_detail) {
                               activeAssignees.set(task.assignee_detail.id, task.assignee_detail.name);
                            }
                            if (task.assignees_detail) {
                               task.assignees_detail.forEach((a: any) => activeAssignees.set(a.id, a.name));
                            }
                          });
                        }
                        const assigneesList = Array.from(activeAssignees.values());
                        const displayList = assigneesList.slice(0, 4);
                        const remaining = assigneesList.length - 4;

                        return (
                          <>
                            {displayList.map((name: any, idx) => {
                              const initials = name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
                              return (
                                <div key={idx} className="h-5 w-5 rounded flex items-center justify-center bg-blue-50 text-blue-500 text-[8px] font-bold">
                                  {initials}
                                </div>
                              );
                            })}
                            {remaining > 0 && (
                              <div className="h-5 w-5 rounded flex items-center justify-center bg-slate-50 text-slate-400 text-[8px] font-bold">
                                +{remaining}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Status Counts row */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                    {(() => {
                      const counts: Record<string, number> = {
                        planning: 0, open: 0, pending: 0, review: 0, completed: 0, closed: 0
                      };
                      if (project.imported_tasks) {
                        project.imported_tasks.forEach((t: any) => {
                          const status = getMappedStatus(t.status, DEFAULT_COLUMNS);
                          if (counts[status] === undefined) {
                            counts[status] = 0;
                          }
                          counts[status]++;
                        });
                      }
                      
                      return Object.entries(counts).map(([statusId, count]) => {
                        const defaultCol = DEFAULT_COLUMNS.find(c => c.id === statusId);
                        const title = defaultCol ? defaultCol.title : statusId.charAt(0).toUpperCase() + statusId.slice(1).replace(/_/g, ' ');
                        const color = defaultCol ? defaultCol.color : "bg-slate-500";
                        return (
                          <div key={statusId} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 min-w-[80px] justify-center shadow-sm">
                            <span className={`w-2 h-2 rounded-full ${color}`}></span>
                            <span className="text-[11px] font-semibold text-slate-700 hidden sm:inline">{title}</span>
                            <span className="text-xs font-bold text-slate-900 ml-auto">{count}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PagedPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        className="mt-8 mb-4"
      />

      {/* Expanded Dialog size max-w-2xl */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">{editProject ? "Edit Project" : "New Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2"><Label className="text-sm font-semibold">Project Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter project name" className="bg-muted" /></div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Template</Label>
                <Select value={form.template_type} onValueChange={(v) => setForm({ ...form, template_type: v })}>
                  <SelectTrigger className="bg-muted"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blank">Blank Project</SelectItem>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2"><Label className="text-sm font-semibold">Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the project" className="bg-muted" /></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Access Scope</Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger className="bg-muted"><SelectValue placeholder="Select access scope" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entire Organization">Entire Organization</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Project["status"] })}>
                  <SelectTrigger className="bg-muted"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-sm font-semibold">Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="bg-muted" /></div>
            </div>
          </div>
          <DialogFooter className="mt-8">
            <DialogClose asChild><Button variant="outline" className="px-5">Cancel</Button></DialogClose>
            <Button className="gradient-primary text-primary-foreground px-6" onClick={saveProject}>{editProject ? "Save Changes" : "Create Project"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
