import { useState, useEffect, useRef } from "react";
import {
  BookOpen, Search, Clock, Eye, Tag, ArrowLeft, ThumbsUp,
  Share2, Bookmark, Plus, Download, FileText
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getKbArticles, createKbArticle, toggleKbHelpful, toggleKbSave } from "@/api/collaboration";
import { cn } from "@/lib/utils";
import { PagedPagination } from "@/components/ui/PagedPagination";

interface Article {
  id: string | number;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  author: { name: string; initials: string };
  readTime: string;
  views: number;
  updatedAt: string;
  content: string;
  file?: string | null;
  file_url?: string | null;
  is_helpful?: boolean;
  is_saved?: boolean;
  helpful_count?: number;
}

const defaultCategories = [
  { id: "all", name: "All Articles" },
  { id: "engineering", name: "Engineering" },
  { id: "product", name: "Product" },
  { id: "hr", name: "HR & People" },
  { id: "design", name: "Design" },
  { id: "onboarding", name: "Onboarding" },
];

export default function KnowledgeBase() {
  const { token, settings } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(true);

  // Upload Form
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newExcerpt, setNewExcerpt] = useState("");
  const customCategories = settings?.kb_categories?.map((c: string) => ({ id: c.toLowerCase().replace(/\s+/g, '-'), name: c })) || [];
  const categories = customCategories.length > 0 
    ? [{ id: "all", name: "All Articles" }, ...customCategories] 
    : defaultCategories;

  const [newCategory, setNewCategory] = useState(categories.length > 1 ? categories[1].id : "engineering");
  const [newContent, setNewContent] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentText, setAttachmentText] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
  }, [token]);

  useEffect(() => {
    if (selectedArticle?.file_url && selectedArticle.file_url.match(/\.(txt|md|csv|json|log)$/i)) {
      fetch(selectedArticle.file_url)
        .then(res => res.text())
        .then(text => setAttachmentText(text))
        .catch(() => setAttachmentText("Failed to load text content."));
    } else {
      setAttachmentText(null);
    }
  }, [selectedArticle]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const data = await getKbArticles();
      setArticles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const formData = new FormData();
    formData.append("title", newTitle);
    formData.append("excerpt", newExcerpt);
    formData.append("category", newCategory);
    formData.append("content", newContent);
    if (uploadFile) {
      formData.append("file", uploadFile);
    }

    try {
      await createKbArticle(formData);
      toast({ title: "Knowledge Added Successfully" });
      setIsUploadOpen(false);
      setNewTitle("");
      setNewExcerpt("");
      setNewContent("");
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchArticles();
    } catch (e) {
      toast({ title: "Error adding knowledge", variant: "destructive" });
    }
  };

  const handleHelpful = async (articleId: string | number) => {
    try {
      const res = await toggleKbHelpful(articleId);
      if (selectedArticle && selectedArticle.id === articleId) {
        setSelectedArticle({ ...selectedArticle, is_helpful: res.helpful, helpful_count: res.count });
      }
      setArticles(articles.map(a => a.id === articleId ? { ...a, is_helpful: res.helpful, helpful_count: res.count } : a));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (articleId: string | number) => {
    try {
      const res = await toggleKbSave(articleId);
      if (selectedArticle && selectedArticle.id === articleId) {
        setSelectedArticle({ ...selectedArticle, is_saved: res.saved });
      }
      setArticles(articles.map(a => a.id === articleId ? { ...a, is_saved: res.saved } : a));
      toast({ title: res.saved ? "Article saved" : "Article removed from saved" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = (articleId: string | number) => {
    const url = `${window.location.origin}/collaboration/knowledge-base?article=${articleId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard!" });
  };

  const filtered = articles.filter((a) => {
    const matchCategory = activeCategory === "all" || (a.category && a.category.toLowerCase() === activeCategory.toLowerCase());
    const searchLower = search.toLowerCase();
    const matchSearch = !search || 
      a.title.toLowerCase().includes(searchLower) || 
      (a.excerpt || '').toLowerCase().includes(searchLower) || 
      (a.tags || []).some((t) => t.toLowerCase().includes(searchLower));
    return matchCategory && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentArticles = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    setCurrentPage(1);
  };

  if (selectedArticle) {
    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col h-[calc(100vh-6rem)] animate-fade-in gap-8 pb-8 relative">
        {/* Ambient detail backgrounds */}
        <div className="fixed top-20 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse" />
        <div className="fixed bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse delay-1000" />

        <div className="shrink-0 pt-4 sticky top-0 z-50 bg-background/80 backdrop-blur-md pb-4 border-b border-border/50">
          <Button variant="outline" onClick={() => setSelectedArticle(null)} className="gap-2 bg-card/50 backdrop-blur-md border-white/10 shadow-sm hover:shadow-md hover:bg-card/80 transition-all rounded-xl">
            <ArrowLeft className="h-4 w-4" /> Back to articles
          </Button>
        </div>
        
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-wrap gap-2 mb-4">
            {(selectedArticle.tags || []).map((t) => (
              <Badge key={t} variant="secondary" className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">{t}</Badge>
            ))}
            {selectedArticle.category && (
              <Badge variant="secondary" className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border-indigo-500/20 capitalize">{selectedArticle.category.replace('-', ' ')}</Badge>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 leading-tight mb-6">
            {selectedArticle.title}
          </h1>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground bg-card/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 w-fit shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 border-2 border-indigo-100 shadow-sm"><AvatarFallback className="text-[10px] bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">{selectedArticle.author?.initials || 'A'}</AvatarFallback></Avatar>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{selectedArticle.author?.name || 'Anonymous'}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Author</span>
              </div>
            </div>
            <div className="w-px h-8 bg-border/50"></div>
            <div className="flex items-center gap-2 font-medium">
              <Clock className="h-4 w-4 text-primary/70" /> {selectedArticle.readTime || '1 min'} read
            </div>
            <div className="flex items-center gap-2 font-medium">
              <Eye className="h-4 w-4 text-primary/70" /> {selectedArticle.views || 0} views
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center border-y border-white/10 py-4 animate-in fade-in duration-1000">
          <Button 
            size="sm" 
            variant="outline" 
            className={cn("gap-2 text-sm rounded-xl transition-all duration-300", selectedArticle.is_helpful ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/30" : "hover:bg-accent")}
            onClick={() => handleHelpful(selectedArticle.id)}
          >
            <ThumbsUp className={cn("h-4 w-4", selectedArticle.is_helpful && "fill-current animate-bounce-slow")} /> {selectedArticle.helpful_count || 0} Helpful
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className={cn("gap-2 text-sm rounded-xl transition-all duration-300", selectedArticle.is_saved ? "bg-purple-500/10 text-purple-500 border-purple-500/30" : "hover:bg-accent")}
            onClick={() => handleSave(selectedArticle.id)}
          >
            <Bookmark className={cn("h-4 w-4", selectedArticle.is_saved && "fill-current animate-bounce-slow")} /> Save
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2 text-sm rounded-xl hover:bg-accent transition-all duration-300"
            onClick={() => handleShare(selectedArticle.id)}
          >
            <Share2 className="h-4 w-4" /> Share
          </Button>
          
          <div className="flex-1"></div>
          
          {selectedArticle.file_url && (
            <a href={selectedArticle.file_url} target="_blank" rel="noreferrer">
              <Button size="sm" className="gap-2 text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 rounded-xl hover:-translate-y-0.5 transition-all duration-300">
                <Download className="h-4 w-4 animate-pulse" /> Download Attachment
              </Button>
            </a>
          )}
        </div>

        <Card className="shadow-2xl shadow-indigo-500/5 border border-white/10 bg-card/80 backdrop-blur-xl flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 rounded-3xl animate-in fade-in slide-in-from-bottom-12 duration-700">
          <CardContent className="p-0">
            {selectedArticle.excerpt && <p className="text-xl md:text-2xl font-medium text-foreground/80 mb-10 pb-8 border-b border-border/50 leading-relaxed italic">{selectedArticle.excerpt}</p>}
            {/* Render Text Content if meaningful */}
            {selectedArticle.content && !selectedArticle.content.trim().startsWith("[Attached Article Document:") && (
              <div className={selectedArticle.file_url ? "mb-12 pb-10 border-b border-border/50 space-y-4" : "space-y-4"}>
                <div 
                  className="[&_h1]:text-3xl [&_h1]:font-extrabold [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-semibold [&_p]:leading-relaxed [&_p]:text-lg [&_p]:text-foreground/90 [&_ul]:list-disc [&_ul]:ml-8 [&_ul]:text-lg [&_ol]:list-decimal [&_ol]:ml-8 [&_ol]:text-lg prose prose-lg max-w-none prose-headings:text-foreground prose-a:text-indigo-500 hover:prose-a:text-indigo-600"
                  dangerouslySetInnerHTML={{ __html: selectedArticle.content }} 
                />
              </div>
            )}

            {/* Always render file preview if there is an attachment */}
            {selectedArticle.file_url ? (
              <div className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-accent/30 backdrop-blur-sm">
                {attachmentText !== null ? (
                  <pre className="p-8 whitespace-pre-wrap text-base text-foreground/90 bg-transparent max-h-[700px] overflow-auto font-sans leading-relaxed">
                    {attachmentText}
                  </pre>
                ) : selectedArticle.file_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                  <img src={selectedArticle.file_url} alt="Article Attachment" className="w-full max-h-[800px] object-contain bg-transparent rounded-2xl transition-transform hover:scale-[1.02] duration-500" />
                ) : (
                  <iframe src={selectedArticle.file_url} className="w-full h-[800px] bg-white" title="Article Attachment Preview" />
                )}
              </div>
            ) : !selectedArticle.content?.trim() ? (
              <div className="text-center py-20 bg-accent/30 rounded-3xl border border-dashed border-border">
                <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4 animate-pulse" />
                <p className="text-lg text-muted-foreground font-medium">No text content available.</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col h-[calc(100vh-6rem)] animate-fade-in gap-8 pb-8 relative">
      {/* Background ambient light */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse delay-1000" />
      
      {/* Header section with glassmorphic container */}
      <div className="relative rounded-3xl p-8 overflow-hidden bg-gradient-to-br from-card/80 to-background/50 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-primary flex items-center gap-3">
              <BookOpen className="h-10 w-10 text-indigo-500 animate-bounce-slow" />
              Knowledge Base
            </h1>
            <p className="text-muted-foreground font-medium pl-14 text-lg">Search and browse company documentation, guides, and policies</p>
          </div>
          
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 h-12 px-6 rounded-xl hover:-translate-y-1 transition-all duration-300">
                <Plus className="h-5 w-5" /> Add Knowledge
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl">
              <DialogHeader><DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">Add to Knowledge Base</DialogTitle></DialogHeader>
              <form onSubmit={handleUpload} className="space-y-6 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Title</label>
                    <Input required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Article or Document Title" className="h-11 rounded-xl bg-background/50 border-white/10 focus-visible:ring-indigo-500/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Category</label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/50 border-white/10 focus-visible:ring-indigo-500/50"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl border-white/10 backdrop-blur-xl">
                        {categories.filter(c => c.id !== 'all').map(c => (
                          <SelectItem key={c.id} value={c.id} className="rounded-lg">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Brief Description</label>
                  <Input value={newExcerpt} onChange={e => setNewExcerpt(e.target.value)} placeholder="What is this about?" className="h-11 rounded-xl bg-background/50 border-white/10 focus-visible:ring-indigo-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Content</label>
                  <div className="rounded-xl overflow-hidden border border-white/10 shadow-inner">
                    <RichTextEditor 
                      value={newContent}
                      onChange={setNewContent}
                      placeholder="Article content"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Upload File (Optional)</label>
                  <Input type="file" className="h-11 rounded-xl bg-background/50 border-white/10 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" ref={fileInputRef} onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setUploadFile(file);
                    if (file && !newContent.trim()) {
                      setNewContent(`[Attached Article Document: ${file.name}]`);
                    }
                  }} />
                </div>
                <Button type="submit" className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-300">Submit Knowledge</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center w-full">
        {/* Search */}
        <div className="relative w-full md:w-96 group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-md transition-all duration-500 group-hover:blur-lg opacity-0 group-hover:opacity-100" />
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-indigo-500 transition-colors z-10" />
          <Input
            placeholder="Search articles, guides, policies..."
            value={search}
            onChange={handleSearchChange}
            className="relative pl-12 h-12 rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10 shadow-inner focus-visible:ring-indigo-500/50 transition-all text-base"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 w-full md:flex-1 overflow-x-auto custom-scrollbar pb-2 md:pb-0 hide-scrollbar">
          {categories.map((cat) => {
            const count = cat.id === 'all' ? articles.length : articles.filter(a => a.category?.toLowerCase() === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={cn(
                  "px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 border flex items-center gap-2 flex-shrink-0",
                  activeCategory === cat.id
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent shadow-lg shadow-indigo-500/25 scale-105"
                    : "bg-card/60 text-muted-foreground border-white/10 hover:bg-card/80 hover:border-white/20 hover:scale-105 backdrop-blur-xl"
                )}
              >
                {cat.name} 
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", activeCategory === cat.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center text-muted-foreground/60">
          <BookOpen className="h-16 w-16 animate-pulse mb-4" />
          <p className="text-xl font-medium animate-pulse">Curating knowledge base...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {currentArticles.map((article, index) => (
            <Card
              key={article.id}
              className="group relative bg-card/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-500 cursor-pointer overflow-hidden rounded-3xl animate-in fade-in slide-in-from-bottom-8 flex flex-col h-full"
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
              onClick={() => setSelectedArticle(article)}
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70 group-hover:opacity-100 group-hover:h-2 transition-all duration-300"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <CardContent className="p-8 flex flex-col flex-1 relative z-10">
                <div className="flex flex-wrap gap-2 mb-5">
                  {article.category && (
                    <Badge variant="secondary" className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border-indigo-500/20 capitalize transition-colors group-hover:bg-indigo-500/20">{article.category.replace('-', ' ')}</Badge>
                  )}
                  {article.file_url && (
                    <Badge variant="secondary" className="text-xs px-2.5 py-1 rounded-full bg-accent/50 text-foreground border-white/10 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Attachment</Badge>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-foreground group-hover:text-indigo-500 transition-colors leading-snug mb-3">
                  {article.title}
                </h3>
                
                <p className="text-base text-muted-foreground/90 line-clamp-3 leading-relaxed flex-1">
                  {article.excerpt || 'Click to view details and read the full article.'}
                </p>
                
                <div className="flex items-center justify-between mt-8 pt-5 border-t border-white/5">
                  <div className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                    <Avatar className="h-8 w-8 border-2 border-indigo-500/20 shadow-sm"><AvatarFallback className="text-[10px] bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">{article.author?.initials || 'A'}</AvatarFallback></Avatar>
                    {article.author?.name || 'Anonymous'}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground/70 bg-accent/30 px-3 py-1.5 rounded-xl border border-white/5">
                    <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-indigo-500/70" />{article.readTime || '1 min'}</span>
                    <span className="flex items-center gap-1.5"><Eye className="h-4 w-4 text-indigo-500/70" />{article.views || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!loading && filtered.length > 0 && (
        <div className="pt-8">
          <PagedPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-32 bg-card/40 backdrop-blur-xl border border-dashed border-white/20 rounded-3xl animate-in zoom-in-95 duration-500">
          <BookOpen className="h-20 w-20 mx-auto text-muted-foreground/30 mb-6 animate-pulse" />
          <p className="text-2xl text-foreground font-semibold mb-2">No articles found.</p>
          <p className="text-muted-foreground mb-8">Try adjusting your search or selecting a different category.</p>
          <Button variant="outline" className="h-12 px-8 rounded-xl border-white/10 hover:bg-accent transition-all" onClick={() => setActiveCategory('all')}>Clear All Filters</Button>
        </div>
      )}
    </div>
  );
}
