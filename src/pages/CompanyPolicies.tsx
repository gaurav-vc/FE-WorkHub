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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" /> Company Policies
          </h1>
          <p className="text-muted-foreground mt-1">Browse and search company policy documents</p>
        </div>
        <PermissionGuard requires="create">
          <Button className="gradient-primary text-primary-foreground gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Policy
          </Button>
        </PermissionGuard>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search policies..." value={search} onChange={handleSearchChange} className="pl-9" />
        </div>
        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {policyCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {currentPolicies.map((policy) => (
          <Card key={policy.id} className="shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group border-border hover:border-primary/30" onClick={() => setSelectedPolicy(policy)}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <FileCheck className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{policy.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[10px]">{policy.category}</Badge>
                  <span className="text-[11px] text-muted-foreground">v{policy.version} · Created {formatDate(policy.created_at_formatted || policy.created_at)} · Updated {formatDate(policy.lastUpdated || policy.updated_at)}</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <PermissionGuard requires="edit">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(policy); }}>Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deletePolicy(policy.id); }}>Delete</DropdownMenuItem>
                  </PermissionGuard>
                </DropdownMenuContent>
              </DropdownMenu>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

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
