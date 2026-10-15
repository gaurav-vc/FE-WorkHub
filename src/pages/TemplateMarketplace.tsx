import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  Star,
  Download,
  LayoutTemplate,
  CheckCircle2,
  Users,
  Clock,
  ArrowRight,
  Plus,
  Copy,
  Trash2,
  Edit,
  FileSpreadsheet,
  Briefcase,
  GraduationCap,
  Code,
  Palette,
  Camera,
  DollarSign,
  Megaphone,
  Headphones,
  User,
  Target,
  Zap,
  CheckSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectTemplate } from "@/types/tasks";
import { useAuth } from "@/context/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/config";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PagedPagination } from "@/components/ui/PagedPagination";

const categoryIcons: Record<string, any> = {
  "Team Management": Users, "Productivity": Zap, "Business": Briefcase,
  "Education": GraduationCap, "Project Management": Target, "Engineering": Code,
  "Design": Palette, "Creative": Camera, "Finance": DollarSign,
  "Marketing": Megaphone, "Support": Headphones, "Personal": User,
};

const categories = [
  "All", "Team Management", "Productivity", "Business", "Education",
  "Project Management", "Engineering", "Design", "Creative",
  "Finance", "Marketing", "Support", "Personal",
];

export default function TemplateMarketplace() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  
  const [tab, setTab] = useState("marketplace");
  const [myTemplates, setMyTemplates] = useState<ProjectTemplate[]>([]);
  const [backendTemplates, setBackendTemplates] = useState<any[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  
  const [projects, setProjects] = useState<any[]>([]);
  const [showUseModal, setShowUseModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [createForm, setCreateForm] = useState({ title: "", description: "", category: "", numTasks: 1 });
  const [createTasks, setCreateTasks] = useState([{ title: "", status: "pending" }]);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => { 
    fetchTemplates();
    fetchProjects();
  }, [token]);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects/?paginate=false`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.results || data);
      }
    } catch (e) { console.error(e); }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/templates/`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setBackendTemplates(await res.json());
    } catch (e) { console.error(e); }
  };

  const handlePreviewClick = async (tmpl: any) => {
    setPreviewTemplate(tmpl); // Show immediately with basic info
    if (tmpl.isBackend) {
      try {
        const res = await fetch(`${API_BASE}/templates/${tmpl.id}/`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (res.ok) {
          const fullData = await res.json();
          setPreviewTemplate((prev: any) => prev?.id === tmpl.id ? { ...prev, original: fullData } : prev);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleNumTasksChange = (val: number) => {
    const num = Math.max(1, val);
    setCreateForm(prev => ({ ...prev, numTasks: num }));
    setCreateTasks(prev => {
      const newTasks = [...prev];
      if (num > newTasks.length) {
        while (newTasks.length < num) newTasks.push({ title: "", status: "pending" });
      } else if (num < newTasks.length) {
        newTasks.length = num;
      }
      return newTasks;
    });
  };

  const handleTaskChange = (idx: number, field: string, val: string) => {
    setCreateTasks(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const handleCreateTemplate = async () => {
    if (!createForm.title || !createForm.category) return toast.error("Title and category are required");
    if (createTasks.some(t => !t.title.trim())) return toast.error("Fill in all task titles");
    setIsCreating(true);
    try {
      const payload = { 
        title: createForm.title, 
        description: createForm.description, 
        category: createForm.category,
        is_public: true, 
        tasks: createTasks 
      };
      const res = await fetch(`${API_BASE}/templates/`, {
        method: "POST", headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success("Template created successfully!");
        setShowCreate(false);
        setCreateForm({ title: "", description: "", category: "", numTasks: 1 });
        setCreateTasks([{ title: "", status: "pending" }]);
        fetchTemplates();
      } else {
        let errMsg = "Unknown error";
        try {
          const errData = await res.json();
          errMsg = errData.detail || errData.error || (typeof errData === 'object' ? JSON.stringify(errData) : "Invalid payload");
        } catch (e) {
          errMsg = res.statusText;
        }
        toast.error(`Failed to create template: ${errMsg}`);
      }
    } catch (e: any) { 
      toast.error(`Error: ${e?.message || "Network issue"}`); 
    } finally { 
      setIsCreating(false); 
    }
  };

  const downloadCsvTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + "Template Title,Template Description,Template Category,Task Title,Task Description,Task Status\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Template_Format.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length <= 1) {
         toast.error("CSV file is empty or only contains headers");
         return;
      }
      
      const parsedRows = lines.slice(1).map(line => {
         let parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || line.split(',');
         return parts.map(p => p.replace(/^"|"$/g, '').trim());
      });

      const firstRow = parsedRows[0];
      const templateTitle = firstRow[0] || file.name.replace('.csv', '');
      const templateDesc = firstRow[1] || "";
      const templateCat = firstRow[2] || "All";

      const parsedTasks = parsedRows.map(parts => ({
         title: parts[3] || "Untitled Task",
         description: parts[4] || "",
         status: parts[5] || "pending"
      })).filter(t => t.title && t.title !== "Untitled Task");
      
      setCreateTasks(parsedTasks);
      setCreateForm(prev => ({ 
        ...prev, 
        numTasks: Math.max(1, parsedTasks.length), 
        title: templateTitle,
        description: templateDesc,
        category: templateCat
      }));
      setShowImport(false);
      setShowCreate(true);
      toast.success(`Successfully parsed ${parsedTasks.length} tasks from CSV. Review and save.`);
    };
    reader.readAsText(file);
  };

  const normalizedTemplates = useMemo(() => {
    return backendTemplates.map(t => ({ id: t.id, name: t.title, description: t.description || "", category: t.category_name || "General", tasks: t.estimated_tasks || 0, isBackend: true, popular: t.is_featured || false, original: t }));
  }, [backendTemplates]);

  const filtered = useMemo(() => {
    return normalizedTemplates.filter(t => {
      const matchCat = activeCategory === "All" || t.category === activeCategory;
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, activeCategory, normalizedTemplates]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentTemplates = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  const handleUseTemplate = async (template: any) => {
    setPreviewTemplate(template);
    setShowUseModal(true);
  };

  const confirmUseTemplate = async () => {
    if (!selectedProjectId) return toast.error("Please select a project");
    setIsImporting(true);
    try {
      const res = await fetch(`${API_BASE}/templates/${previewTemplate.id}/import_template/`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ project_id: selectedProjectId })
      });
      if (res.ok) {
        toast.success("Template tasks added to the project successfully!");
        setShowUseModal(false);
        setPreviewTemplate(null);
        navigate(`/admin/projects`); // Or wherever projects are displayed
      } else {
        toast.error("Failed to add template tasks");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsImporting(false);
    }
  };

  const deleteMyTemplate = (id: string) => setMyTemplates(prev => prev.filter(t => t.id !== id));

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Background ambient light */}
      <div className="fixed top-20 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600 flex items-center gap-3">
            <LayoutTemplate className="h-8 w-8 text-primary animate-bounce-slow" /> Template Marketplace
          </h1>
          <p className="text-muted-foreground mt-1 ml-11">{backendTemplates.length} project templates ready to use</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5 border-white/10 hover:bg-card/50 rounded-xl h-10" onClick={downloadCsvTemplate} title="Download CSV Template Format">
            <Download className="h-4 w-4" /> Download Format
          </Button>
          <Button variant="outline" className="gap-1.5 border-white/10 hover:bg-card/50 rounded-xl h-10" onClick={() => setShowImport(true)}>
            <FileSpreadsheet className="h-4 w-4" /> Import CSV
          </Button>
          <Button className="gap-1.5 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg shadow-primary/25 rounded-xl h-10 hover:-translate-y-0.5 transition-all" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Create Template
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="marketplace">Browse Templates</TabsTrigger>
          <TabsTrigger value="my-templates">My Templates <Badge variant="secondary" className="ml-1.5 text-[10px]">{myTemplates.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="mt-4 space-y-6">
          {/* Controls: Search & Template Types Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search templates..." 
                  value={search} 
                  onChange={handleSearchChange} 
                  className="pl-10 h-10 rounded-xl bg-background/50 border-white/10 focus-visible:ring-primary/50 text-sm" 
                />
              </div>

              {/* Template Types Dropdown */}
              <div className="w-full sm:w-72">
                <Select value={activeCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-10 rounded-xl bg-background/50 border-white/10 focus:ring-primary/50 text-sm">
                    <div className="flex items-center gap-2 truncate">
                      {(() => {
                        const SelectedIcon = categoryIcons[activeCategory] || LayoutTemplate;
                        return <SelectedIcon className="h-4 w-4 text-primary shrink-0" />;
                      })()}
                      <span className="font-medium truncate">
                        {activeCategory === "All" ? "All Template Types" : activeCategory}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-80 rounded-xl border-white/10 backdrop-blur-xl">
                    {categories.map(cat => {
                      const Icon = categoryIcons[cat] || LayoutTemplate;
                      const count = cat === "All" ? normalizedTemplates.length : normalizedTemplates.filter(t => t.category === cat).length;
                      return (
                        <SelectItem key={cat} value={cat} className="rounded-lg py-2.5 cursor-pointer">
                          <div className="flex items-center justify-between w-full gap-4">
                            <div className="flex items-center gap-2.5">
                              <Icon className="h-4 w-4 text-primary shrink-0" />
                              <span className="font-medium text-sm">{cat}</span>
                            </div>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {count}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-xs text-muted-foreground font-medium shrink-0 hidden sm:block">
              Showing <span className="font-bold text-foreground">{filtered.length}</span> templates
            </div>
          </div>

          {/* Full-width Responsive Template Cards Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-card/40 rounded-3xl border border-dashed border-white/10">
              <LayoutTemplate className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground">No templates found</h3>
              <p className="text-xs text-muted-foreground mt-1">Try selecting a different template type or clearing your search.</p>
              {activeCategory !== "All" && (
                <Button variant="outline" size="sm" onClick={() => handleCategoryChange("All")} className="mt-4 rounded-xl">
                  View All Templates
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentTemplates.map((tmpl, index) => {
                const CatIcon = categoryIcons[tmpl.category] || LayoutTemplate;
                return (
                  <Card key={tmpl.id} className="relative shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all duration-500 cursor-pointer group border-white/10 hover:-translate-y-1 overflow-hidden rounded-3xl bg-card/60 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8 flex flex-col justify-between" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }} onClick={() => handlePreviewClick(tmpl)}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-primary/20 transition-colors duration-500"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <CardContent className="p-6 relative z-10 flex flex-col h-full justify-between">
                      <div>
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-purple-600 group-hover:text-white transition-all duration-300 shadow-sm border border-primary/20">
                            <CatIcon className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors text-foreground leading-snug">{tmpl.name}</h3>
                              {tmpl.popular && <Star className="h-4 w-4 text-warning fill-warning shrink-0 drop-shadow-sm" />}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{tmpl.description}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-white/5">
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary border-primary/20">{tmpl.category}</Badge>
                        <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1"><CheckSquare className="h-3.5 w-3.5" /> {tmpl.tasks} tasks</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          
          {filtered.length > 0 && totalPages > 1 && (
            <PagedPagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
            />
          )}
        </TabsContent>

        <TabsContent value="my-templates" className="mt-4">
          {myTemplates.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-12 text-center">
                <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">No saved templates yet</p>
                <p className="text-xs text-muted-foreground mt-1">Browse the marketplace and save templates you like</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {myTemplates.map(tmpl => (
                <Card key={tmpl.id} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold">{tmpl.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-[10px]">{tmpl.category}</Badge>
                          <span className="text-[10px] text-muted-foreground">{tmpl.tasks} tasks</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7"><Copy className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteMyTemplate(tmpl.id); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </div>
                    <Button size="sm" className="w-full mt-3 gradient-primary text-primary-foreground text-xs" onClick={(e) => { e.stopPropagation(); handlePreviewClick(tmpl); }}>Preview / Use</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{previewTemplate.description}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm font-medium">{previewTemplate.category}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Tasks Included</p>
                  <p className="text-sm font-medium">{previewTemplate.tasks} tasks</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-xs font-medium mb-2">Tasks Included in Template</p>
                {previewTemplate.original?.template_tasks?.length > 0 ? (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2">
                    {previewTemplate.original.template_tasks.map((t: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <CheckSquare className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs">{t.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {previewTemplate.original?.template_tasks ? "No tasks defined." : "Loading tasks..."}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button className="gradient-primary text-primary-foreground" onClick={() => previewTemplate && handleUseTemplate(previewTemplate)}>Use Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Use Template Modal */}
      <Dialog open={showUseModal} onOpenChange={setShowUseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Use Template: {previewTemplate?.name || previewTemplate?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Select a project to import these template tasks into.</p>
            <div className="space-y-2">
              <Label>Select Project</Label>
              <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={projectPopoverOpen} className="w-full justify-between font-normal">
                    <span className="truncate">
                      {selectedProjectId ? (projects.find(p => p.id.toString() === selectedProjectId)?.name || projects.find(p => p.id.toString() === selectedProjectId)?.title || "Select a project") : "Select a project"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search projects..." />
                    <CommandList>
                      <CommandEmpty>No project found.</CommandEmpty>
                      <CommandGroup>
                        {projects.map(p => (
                          <CommandItem
                            key={p.id}
                            value={`${p.name || p.title} ${p.id}`}
                            onSelect={() => {
                              setSelectedProjectId(p.id.toString());
                              setProjectPopoverOpen(false);
                            }}
                          >
                            <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary shrink-0", selectedProjectId === p.id.toString() ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                              <Check className="h-3 w-3" />
                            </div>
                            <span className="truncate">{p.name || p.title}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button className="gradient-primary text-primary-foreground" onClick={confirmUseTemplate} disabled={!selectedProjectId || isImporting}>
              {isImporting ? "Importing..." : "Confirm & Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" /> Import Template from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-primary/5 p-4 rounded-lg border border-primary/20">
              <div>
                <p className="text-sm font-semibold text-foreground">Need the correct format?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Download our standard CSV template.</p>
              </div>
              <Button size="sm" variant="outline" onClick={downloadCsvTemplate} className="gap-1.5">
                <Download className="h-4 w-4" /> Template
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Upload a CSV file (.csv) with the following columns:</p>
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              {["Template Title", "Template Description", "Template Category", "Task Title", "Task Description", "Task Status"].map(col => (
                <div key={col} className="flex items-center gap-2 text-xs">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {col}
                </div>
              ))}
            </div>
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Click to browse your files</p>
              <p className="text-xs text-muted-foreground mt-1">Accepts .csv format</p>
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><LayoutTemplate className="h-5 w-5 text-primary" /> Create New Template</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 pr-4">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Template Title</Label>
                <Input value={createForm.title} onChange={e => setCreateForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Employee Onboarding" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={createForm.description} onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe what this template is for..." />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={createForm.category}
                  onChange={e => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">Select category...</option>
                  {categories.filter(c => c !== "All").map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-base font-semibold">Define Tasks</Label>
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Number of Tasks</Label>
                  <Input 
                    type="number" min={1} max={50} className="w-24"
                    value={createForm.numTasks}
                    onChange={e => handleNumTasksChange(parseInt(e.target.value) || 1)}
                  />
                  <span className="text-xs text-muted-foreground">(Changes automatically update the rows below)</span>
                </div>
              </div>
              <div className="space-y-3 mt-4">
                {createTasks.map((task, idx) => (
                  <div key={idx} className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg border border-border/50">
                    <div className="h-9 w-6 flex items-center justify-center shrink-0 text-muted-foreground text-xs font-medium">
                      {idx + 1}.
                    </div>
                    <Input 
                      placeholder={`Task ${idx + 1} title`} 
                      value={task.title}
                      onChange={e => handleTaskChange(idx, "title", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button className="gradient-primary text-primary-foreground" onClick={handleCreateTemplate} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
