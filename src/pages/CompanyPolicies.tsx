import { useState, useEffect } from "react";
import {
  FileCheck,
  Search,
  ChevronRight,
  ArrowLeft,
  Download,
  Plus,
  Trash2,
  Edit,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
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
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getCompanyPolicies, createCompanyPolicy, updateCompanyPolicy, deleteCompanyPolicy as deleteCompanyPolicyApi } from "@/api/hr";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PagedPagination } from "@/components/ui/PagedPagination";

interface Policy {
  id: string;
  title: string;
  category: string;
  lastUpdated: string;
  version: string;
  content: string;
  attachment?: string;
  created_at_formatted?: string;
  created_at?: string;
  updated_at?: string;
}

const defaultPolicyCategories = ["All", "General", "HR", "IT", "Finance", "Legal"];

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function CompanyPolicies() {
  const { token, settings } = useAuth();
  
  const customCats = settings?.policy_categories || [];
  const policyCategories = customCats.length > 0 ? ["All", ...customCats] : defaultPolicyCategories;
  
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editPolicy, setEditPolicy] = useState<Policy | null>(null);
  const [form, setForm] = useState({ title: "", category: policyCategories.length > 1 ? policyCategories[1] : "General", content: "", version: "1.0" });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentText, setAttachmentText] = useState<string | null>(null);

  const fetchPolicies = async () => {
    try {
      const data = await getCompanyPolicies();
      setPolicies(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchPolicies();
  }, [token]);

  useEffect(() => {
    if (selectedPolicy?.attachment && selectedPolicy.attachment.match(/\.(txt|md|csv|json|log)$/i)) {
      fetch(selectedPolicy.attachment)
        .then(res => res.text())
        .then(text => setAttachmentText(text))
        .catch(() => setAttachmentText("Failed to load text content."));
    } else {
      setAttachmentText(null);
    }
  }, [selectedPolicy]);

  const filtered = policies.filter((p) => {
    const matchCat = category === "All" || p.category === category;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentPolicies = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    setCurrentPage(1);
  };

  const openCreate = () => { setEditPolicy(null); setForm({ title: "", category: "General", content: "", version: "1.0" }); setAttachment(null); setShowCreate(true); };
  const openEdit = (p: Policy) => { setEditPolicy(p); setForm({ title: p.title, category: p.category, content: p.content, version: p.version }); setAttachment(null); setShowCreate(true); };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    
    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("category", form.category);
    formData.append("version", form.version);
    formData.append("content", form.content);
    if (attachment) {
      formData.append("attachment", attachment);
    }

    try {
      if (editPolicy) {
        await updateCompanyPolicy(editPolicy.id, formData);
      } else {
        await createCompanyPolicy(formData);
      }

      toast.success(editPolicy ? "Policy updated" : "Policy created");
      setShowCreate(false);
      fetchPolicies();
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const deletePolicy = async (id: string) => {
    try {
      await deleteCompanyPolicyApi(id);
      toast.success("Policy deleted");
      fetchPolicies();
      if (selectedPolicy?.id === id) setSelectedPolicy(null);
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  if (selectedPolicy) {
    return (
      <div className="max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => setSelectedPolicy(null)} className="gap-1.5 text-muted-foreground -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back to policies
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">{selectedPolicy.category}</Badge>
              <Badge variant="outline" className="text-[10px]">v{selectedPolicy.version}</Badge>
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">{selectedPolicy.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">Created: {formatDate(selectedPolicy.created_at_formatted || selectedPolicy.created_at)} · Last updated: {formatDate(selectedPolicy.lastUpdated || selectedPolicy.updated_at)}</p>
          </div>
          {selectedPolicy.attachment ? (
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <a href={selectedPolicy.attachment} target="_blank" rel="noreferrer" download>
                <Download className="h-3.5 w-3.5" /> Download File
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="gap-1.5" disabled><Download className="h-3.5 w-3.5" /> No File Attached</Button>
          )}
        </div>
        <Card className="shadow-card">
          <CardContent className="p-6">
            {/* Render HTML content if it exists and is not just the auto-placeholder */}
            {selectedPolicy.content.trim() && !selectedPolicy.content.trim().startsWith("[Attached Policy Document:") && (
              <div className={selectedPolicy.attachment ? "mb-8 pb-6 border-b" : ""}>
                <div 
                  className="[&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6"
                  dangerouslySetInnerHTML={{ __html: selectedPolicy.content }} 
                />
              </div>
            )}

            {/* Always render file preview if there is an attachment */}
            {selectedPolicy.attachment ? (
              <div className="w-full rounded-md overflow-hidden border bg-muted/5">
                {attachmentText !== null ? (
                  <pre className="p-6 whitespace-pre-wrap text-sm text-foreground bg-background max-h-[700px] overflow-auto font-sans leading-relaxed">
                    {attachmentText}
                  </pre>
                ) : selectedPolicy.attachment.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                  <img src={selectedPolicy.attachment} alt="Policy Attachment" className="w-full max-h-[700px] object-contain" />
                ) : (
                  <iframe src={selectedPolicy.attachment} className="w-full h-[700px] bg-white" title="Policy Attachment Preview" />
                )}
              </div>
            ) : !selectedPolicy.content.trim() ? (
              <p className="text-sm text-muted-foreground italic text-center py-6">No content available.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Background ambient light */}
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600 flex items-center gap-3">
            <FileCheck className="h-8 w-8 text-primary animate-bounce-slow" /> Company Policies
          </h1>
          <p className="text-muted-foreground mt-1 ml-11">Browse and search company policy documents</p>
        </div>
        <PermissionGuard requires="create">
          <Button className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white gap-2 shadow-lg shadow-primary/25 rounded-xl h-11 hover:-translate-y-0.5 transition-all" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Policy
          </Button>
        </PermissionGuard>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card/40 p-4 rounded-2xl shadow-sm border border-white/10 backdrop-blur-md relative overflow-hidden">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Search company policies..." value={search} onChange={handleSearchChange} className="pl-11 h-12 bg-background/50 border-white/10 rounded-xl focus-visible:ring-primary/50 text-base shadow-sm transition-all" />
        </div>
        <div className="w-full sm:w-[220px]">
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="h-12 bg-background/50 border-white/10 rounded-xl focus:ring-primary/50 font-semibold text-foreground shadow-sm transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-white/10 backdrop-blur-xl">
              {policyCategories.map((c) => <SelectItem key={c} value={c} className="cursor-pointer font-medium rounded-lg">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {currentPolicies.length === 0 ? (
        <div className="text-center py-24 bg-card/40 backdrop-blur-md rounded-3xl border border-dashed border-white/20 animate-in zoom-in-95 duration-500">
          <FileCheck className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4 animate-pulse" />
          <h3 className="text-xl font-bold text-foreground">No policies found</h3>
          <p className="text-muted-foreground mt-2">Try adjusting your search or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentPolicies.map((policy, index) => (
            <Card key={policy.id} className="relative shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all duration-500 cursor-pointer group border-white/10 hover:-translate-y-1 overflow-hidden rounded-3xl bg-card/60 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }} onClick={() => setSelectedPolicy(policy)}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-primary/20 transition-colors duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <CardContent className="p-5 flex flex-col h-full relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-purple-600 group-hover:text-white transition-all duration-300 shadow-sm border border-primary/20">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0 hover:bg-accent rounded-full transition-opacity"><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl shadow-lg border-white/10 bg-card/95 backdrop-blur-xl">
                      <PermissionGuard requires="edit">
                        <DropdownMenuItem className="cursor-pointer font-medium rounded-lg" onClick={(e) => { e.stopPropagation(); openEdit(policy); }}><Edit className="h-4 w-4 mr-2"/> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-destructive font-medium rounded-lg focus:bg-destructive/10 focus:text-destructive" onClick={(e) => { e.stopPropagation(); deletePolicy(policy.id); }}><Trash2 className="h-4 w-4 mr-2"/> Delete</DropdownMenuItem>
                      </PermissionGuard>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight mb-3">{policy.title}</h3>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-bold tracking-wide uppercase bg-primary/10 text-primary border-primary/20 group-hover:bg-primary/20 transition-colors">{policy.category}</Badge>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-bold tracking-wide uppercase border-white/10 text-muted-foreground bg-background/50">v{policy.version}</Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 mt-auto">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Upd: {formatDate(policy.lastUpdated || policy.updated_at)}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors transform group-hover:translate-x-1" />
                  </p>
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
        itemsPerPage={itemsPerPage}
      />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editPolicy ? "Edit Policy" : "Add Policy"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label className="text-sm font-semibold">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{policyCategories.filter((c) => c !== "All").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-sm font-semibold">Version</Label><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">File Attachment</Label>
              <Input 
                type="file" 
                onChange={(e) => {
                  const file = e.target.files ? e.target.files[0] : null;
                  setAttachment(file);
                  if (file && !form.content.trim()) {
                    setForm({ ...form, content: `[Attached Policy Document: ${file.name}]` });
                  }
                }} 
                className="cursor-pointer" 
              />
              {editPolicy?.attachment && !attachment && <p className="text-xs text-muted-foreground mt-1">Currently attached: <a href={editPolicy.attachment} target="_blank" rel="noreferrer" className="text-primary hover:underline">View file</a></p>}
            </div>
            <div className="space-y-1.5"><Label className="text-sm font-semibold">Content</Label><RichTextEditor value={form.content} onChange={(value) => setForm({ ...form, content: value })} placeholder="Policy content" /></div>
          </div>
          <DialogFooter className="mt-6">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button className="gradient-primary text-primary-foreground" onClick={save}>{editPolicy ? "Save Changes" : "Create Policy"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
