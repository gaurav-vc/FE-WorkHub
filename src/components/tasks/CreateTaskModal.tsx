import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { API_BASE } from "@/config";
import { ErrorBoundary } from "../ErrorBoundary";

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (taskData: any) => Promise<void> | void;
  teamMembers?: any[];
  tasks?: any[];
}

export function CreateTaskModal({ open, onOpenChange, onSubmit, teamMembers, tasks }: CreateTaskModalProps) {
  const [activeTab, setActiveTab] = useState("details");
  const [taskType, setTaskType] = useState<"self" | "assign">("self");
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  
  const [priority, setPriority] = useState("P3 Medium");
  const [projectId, setProjectId] = useState("general");
  const [projects, setProjects] = useState<any[]>([]);
  
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  
  const [estimatedEffort, setEstimatedEffort] = useState<number>(0);
  const [effortUnit, setEffortUnit] = useState<"Hours" | "Days">("Hours");
  
  const [isUrgent, setIsUrgent] = useState(false);
  
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedTo, setAssignedTo] = useState("unassigned");
  const [globalUsers, setGlobalUsers] = useState<any[]>([]);

  // Advanced fields
  const [isQueued, setIsQueued] = useState(false);
  const [color, setColor] = useState("bg-primary");
  const [startDay, setStartDay] = useState(0);
  const [duration, setDuration] = useState(3);

  useEffect(() => {
    if (open) {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const headers = token ? { "Authorization": `Bearer ${token}` } : {};
      
      fetch(`${API_BASE}/calendar/employees/`, { headers })
        .then(res => res.json())
        .then(data => setGlobalUsers(Array.isArray(data) ? data : data.results || []))
        .catch(console.error);
        
      fetch(`${API_BASE}/projects/`, { headers })
        .then(res => res.json())
        .then(data => setProjects(Array.isArray(data) ? data : data.results || []))
        .catch(console.error);
    }
  }, [open]);

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (('key' in e && e.key === 'Enter') || e.type === 'click') {
      e.preventDefault();
      if (tagsInput.trim() && !tags.includes(tagsInput.trim())) {
        setTags([...tags, tagsInput.trim()]);
        setTagsInput("");
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !dueDate) {
      alert("Please fill in required fields (Task Topic and Due Date)");
      return;
    }

    setIsSubmitting(true);
    try {
      const timeIntervalMinutes = estimatedEffort > 0 
        ? estimatedEffort * (effortUnit === "Hours" ? 60 : 480) 
        : 60;

      await onSubmit({
        title,
        description,
        taskType,
        assignedTo: taskType === "assign" && assignedTo !== "unassigned" ? parseInt(assignedTo.split('-')[0]) : null,
        priority,
        projectId: projectId === "general" ? null : parseInt(projectId),
        startDate,
        dueDate,
        dueTime,
        timeIntervalMinutes,
        estimatedEffort,
        effortUnit,
        isUrgent,
        tags,
        is_queued: isQueued,
        color,
        start_day: startDay,
        duration
      });
      // Reset form
      setTitle("");
      setDescription("");
      setPriority("P3 Medium");
      setProjectId("general");
      setStartDate("");
      setDueDate("");
      setDueTime("");
      setEstimatedEffort(0);
      setEffortUnit("Hours");
      setIsUrgent(false);
      setTags([]);
      setTaskType("self");
      setAssignedTo("unassigned");
      setIsQueued(false);
      setColor("bg-primary");
      setStartDay(0);
      setDuration(3);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      alert("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] flex flex-col p-0 overflow-hidden bg-background">
        <ErrorBoundary>
          <DialogHeader className="px-6 pt-6 pb-2 border-b border-border/50">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold mb-4">
              <Plus className="h-5 w-5 text-primary" />
              Create Task
            </DialogTitle>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full bg-transparent border-b border-border p-0 h-auto grid grid-cols-4 justify-start">
                <TabsTrigger value="details" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent rounded-none px-4 py-2 text-muted-foreground font-semibold">Details</TabsTrigger>
                <TabsTrigger value="checklist" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent rounded-none px-4 py-2 text-muted-foreground font-semibold">Checklist</TabsTrigger>
                <TabsTrigger value="subtasks" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent rounded-none px-4 py-2 text-muted-foreground font-semibold">Subtasks</TabsTrigger>
                <TabsTrigger value="advanced" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent rounded-none px-4 py-2 text-muted-foreground font-semibold">Advanced</TabsTrigger>
              </TabsList>
            </Tabs>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <Tabs value={activeTab} className="w-full">
              <TabsContent value="details" className="space-y-6 mt-0">
                {/* Task Type */}
                <div className="flex items-center gap-6 border-b border-border/50 pb-4">
                  <span className="font-semibold text-sm">Task Type</span>
                  <div className="flex items-center bg-muted/50 rounded-xl p-1.5 shadow-inner">
                    <button 
                      onClick={() => setTaskType("self")}
                      className={`px-8 py-2.5 rounded-lg text-base font-semibold transition-all ${taskType === 'self' ? 'bg-[#2563eb] text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Self Task
                    </button>
                    <button 
                      onClick={() => setTaskType("assign")}
                      className={`px-8 py-2.5 rounded-lg text-base font-semibold transition-all ${taskType === 'assign' ? 'bg-[#2563eb] text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Assign to Others
                    </button>
                  </div>
                </div>

                {/* Topic & Description */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Task Topic <span className="text-destructive">*</span></Label>
                    <Input 
                      value={title} onChange={(e) => setTitle(e.target.value)} 
                      placeholder="Enter task title..." className="h-10 bg-muted/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Description</Label>
                    <Textarea 
                      value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add task details..." className="h-24 resize-none bg-muted/30"
                    />
                  </div>
                </div>
                
                {/* Assign To (If applicable) */}
                {taskType === "assign" && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Assign To</Label>
                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                      <SelectTrigger className="bg-muted/30 h-10">
                        <SelectValue placeholder="Select employees to assign..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {(Array.isArray(teamMembers) && teamMembers.length ? teamMembers : globalUsers).map((m: any, idx) => {
                          const uniqueVal = m?.id ? `${m.id}-${idx}` : (m?.email ? `${m.email}-${idx}` : `user-${idx}`);
                          const displayName = m?.name || m?.username || m?.email || "Unknown User";
                          return <SelectItem key={uniqueVal} value={uniqueVal}>{displayName}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Priority & Project */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="bg-muted/30 h-10">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${priority.includes('1') ? 'bg-red-500' : priority.includes('2') ? 'bg-orange-500' : priority.includes('3') ? 'bg-[#3b82f6]' : 'bg-green-500'}`} />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="P1 Critical">P1 Critical</SelectItem>
                        <SelectItem value="P2 High">P2 High</SelectItem>
                        <SelectItem value="P3 Medium">P3 Medium</SelectItem>
                        <SelectItem value="P4 Low">P4 Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Project</Label>
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger className="bg-muted/30 h-10">
                        <SelectValue placeholder="No Project / General" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">No Project / General</SelectItem>
                        {projects.map((p: any) => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dates & Times */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Start Date</Label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-muted/30 h-10 dark:[color-scheme:dark]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Due Date <span className="text-destructive">*</span></Label>
                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-muted/30 h-10 dark:[color-scheme:dark]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Due Time</Label>
                    <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} className="bg-muted/30 h-10 dark:[color-scheme:dark]" />
                  </div>
                </div>

                {/* Estimated Effort */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Estimated Effort</Label>
                    <Input type="number" min={0} value={estimatedEffort} onChange={e => setEstimatedEffort(parseFloat(e.target.value) || 0)} className="bg-muted/30 h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Unit</Label>
                    <Select value={effortUnit} onValueChange={v => setEffortUnit(v as "Hours" | "Days")}>
                      <SelectTrigger className="bg-muted/30 h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hours">Hours</SelectItem>
                        <SelectItem value="Days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="col-span-2 text-xs text-muted-foreground -mt-2">This dictates the allowed time before this task is marked overdue.</span>
                </div>

                {/* Mark as Urgent */}
                <div className={`p-4 rounded-lg border flex items-center justify-between transition-colors ${isUrgent ? 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50' : 'bg-muted/20 border-border'}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                    Mark as Urgent
                  </div>
                  <Switch checked={isUrgent} onCheckedChange={setIsUrgent} />
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Tags</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={tagsInput} onChange={e => setTagsInput(e.target.value)} onKeyDown={handleAddTag}
                      placeholder="Add tag..." className="bg-muted/30 h-10"
                    />
                    <Button variant="outline" size="icon" onClick={handleAddTag} className="h-10 w-10 shrink-0 bg-muted/30"><Plus className="h-4 w-4" /></Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag, i) => (
                        <div key={i} className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-md flex items-center gap-1 font-medium">
                          {tag}
                          <button onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-foreground">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </TabsContent>
              <TabsContent value="checklist" className="mt-0 py-8 text-center text-muted-foreground">Checklist functionality coming soon.</TabsContent>
              <TabsContent value="subtasks" className="mt-0 py-8 text-center text-muted-foreground">Subtasks functionality coming soon.</TabsContent>
              <TabsContent value="advanced" className="mt-0 pt-4 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Task Color Label</Label>
                    <Select value={color} onValueChange={setColor}>
                      <SelectTrigger className="h-10 bg-muted/30"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bg-primary">Default Primary</SelectItem>
                        <SelectItem value="bg-red-500">Red</SelectItem>
                        <SelectItem value="bg-yellow-500">Yellow</SelectItem>
                        <SelectItem value="bg-green-500">Green</SelectItem>
                        <SelectItem value="bg-purple-500">Purple</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col justify-center space-y-2 pt-6">
                    <div className="flex items-center space-x-2">
                      <Switch id="is-queued" checked={isQueued} onCheckedChange={setIsQueued} />
                      <Label htmlFor="is-queued" className="text-sm font-semibold cursor-pointer">Queue Task Execution</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">If checked, task will wait in queue for resources.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border/50">
                  <div className="col-span-2">
                    <h4 className="text-sm font-semibold mb-1">Timeline Settings</h4>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Start Day Offset</Label>
                    <Input type="number" min={0} value={startDay} onChange={(e) => setStartDay(parseInt(e.target.value) || 0)} className="h-10 bg-muted/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Duration (Days)</Label>
                    <Input type="number" min={1} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 1)} className="h-10 bg-muted/30" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/50 bg-card">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-md font-semibold px-6">Cancel</Button>
            <Button 
              className="rounded-md font-semibold px-6 bg-[#4f46e5] hover:bg-[#4338ca] text-white"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
