import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Plus,
  Clock, RefreshCw, Layers, ArrowRight, Check, Sparkles, Terminal, Copy,
  Eye, EyeOff, ChevronLeft, ChevronRight, SlidersHorizontal, ChevronDown, ChevronUp,
  Sliders, Calendar, ChevronsUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { bulkUploadTasks, downloadTaskCsvTemplate } from "@/api/tasks";
import { useTaskContext } from "@/context/TaskContext";
import { toast } from "sonner";

export interface BulkTaskRow {
  id: string;
  topic: string;
  description?: string;
  priority: string;
  dueDate: string;
  dueTime?: string;
  project?: string;
  assignedTo?: string;
  type?: string;
  platform?: string;
  estimatedEffort?: number | string;
  effortUnit?: string;
  isUrgent?: boolean;
  tags?: string;
  isValid: boolean;
  validationError?: string;
}

export interface BulkUploadLog {
  timestamp: string;
  time_display: string;
  status: "success" | "error" | "info";
  title?: string;
  task_id?: number | string;
  project?: string;
  priority?: string;
  message: string;
}

interface BulkTaskUploadProps {
  projects?: any[];
  teamMembers?: any[];
  defaultProjectId?: string;
  onSuccess?: (createdTasks: any[]) => void;
  onClose?: () => void;
}

/**
 * Returns today's date formatted as strict ISO YYYY-MM-DD
 */
export const getTodayISO = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Formats ISO YYYY-MM-DD string into a friendly, human-readable date e.g. "Sat, Oct 17, 2026"
 */
export const formatFriendlyDate = (isoStr?: string): string => {
  if (!isoStr) return "";
  try {
    const parts = String(isoStr).split("T")[0].split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
  } catch {}
  return String(isoStr);
};

/**
 * Normalizes any date format into strict ISO YYYY-MM-DD required by HTML5 date inputs.
 * Accepts:
 * - DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
 * - MM/DD/YYYY, MM-DD-YYYY
 * - YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, YYYY-M-D
 * - 2-digit years: DD-MM-YY, DD/MM/YY (e.g. 17-10-26 -> 2026-10-17)
 * - English month names: 17-Oct-2026, 17 Oct 2026, Oct 17 2026, 17-October-2026
 * - Excel serial dates: e.g. 45582
 * - ISO timestamps: 2026-10-17T00:00:00Z
 * - Fallback: always returns today's valid ISO date
 */
export const normalizeDateToISO = (raw: any): string => {
  const today = getTodayISO();
  if (raw === undefined || raw === null) return today;
  let str = String(raw).trim().replace(/['"`]/g, "");
  if (!str || str.toLowerCase() === "none" || str.toLowerCase() === "null") return today;

  // Excel serial date integer (e.g. 45582, 46312)
  if (/^\d{5}$/.test(str)) {
    const excelDays = parseInt(str, 10);
    // Excel epoch begins at 1899-12-30 due to 1900 leap year bug
    const d = new Date(Math.round((excelDays - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }

  // Strip time part if present
  const dateOnly = str.split("T")[0].split(" ")[0].trim();

  // YYYY-MM-DD or YYYY-M-D
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateOnly)) {
    const parts = dateOnly.split("-");
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }

  // YYYY/MM/DD or YYYY.MM.DD
  if (/^\d{4}[\/\.]\d{1,2}[\/\.]\d{1,2}$/.test(dateOnly)) {
    const parts = dateOnly.split(/[\/\.]/);
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }

  // Month name formats: 17-Oct-2026, 17 Oct 2026, Oct 17 2026, 17-October-2026
  const monthMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
  };

  const monthNameMatch1 = dateOnly.match(/^(\d{1,2})[-\s/]([a-zA-Z]{3,9})[-\s/](\d{2,4})$/);
  if (monthNameMatch1) {
    const day = monthNameMatch1[1].padStart(2, "0");
    const mStr = monthNameMatch1[2].toLowerCase().substring(0, 3);
    const m = monthMap[mStr] || "01";
    let y = monthNameMatch1[3];
    if (y.length === 2) y = parseInt(y, 10) < 50 ? `20${y}` : `19${y}`;
    return `${y}-${m}-${day}`;
  }

  const monthNameMatch2 = dateOnly.match(/^([a-zA-Z]{3,9})[-\s/](\d{1,2})[-\s/,]+(\d{2,4})$/);
  if (monthNameMatch2) {
    const mStr = monthNameMatch2[1].toLowerCase().substring(0, 3);
    const m = monthMap[mStr] || "01";
    const day = monthNameMatch2[2].padStart(2, "0");
    let y = monthNameMatch2[3];
    if (y.length === 2) y = parseInt(y, 10) < 50 ? `20${y}` : `19${y}`;
    return `${y}-${m}-${day}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY or MM/DD/YYYY or 2-digit years
  if (/^\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}$/.test(dateOnly)) {
    const parts = dateOnly.split(/[-\/\.]/);
    let p1 = parseInt(parts[0], 10);
    let p2 = parseInt(parts[1], 10);
    let y = parts[2];
    if (y.length === 2) {
      y = parseInt(y, 10) < 50 ? `20${y}` : `19${y}`;
    }

    let d = p1;
    let m = p2;
    // If p1 <= 12 and p2 > 12, it's MM-DD-YYYY
    if (p1 <= 12 && p2 > 12) {
      m = p1;
      d = p2;
    }

    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // Fallback with Date.parse
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }

  return today;
};

export function BulkTaskUpload({
  projects = [],
  teamMembers = [],
  defaultProjectId,
  onSuccess,
  onClose
}: BulkTaskUploadProps) {
  const { setTasks, fetchTasks } = useTaskContext();

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<BulkTaskRow[]>([]);
  
  // Filter out any "General Workspace" project so only actual user projects are available
  const availableProjects = useMemo(() => {
    return projects.filter(p => 
      p.name?.trim().toLowerCase() !== "general workspace" && 
      p.name?.trim().toLowerCase() !== "general"
    );
  }, [projects]);

  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  // Configurable defaults
  const [defaultProject, setDefaultProject] = useState<string>(
    defaultProjectId || (availableProjects.length > 0 ? availableProjects[0].id.toString() : "")
  );
  const [defaultAssignee, setDefaultAssignee] = useState<string>("none");
  const [defaultPriority, setDefaultPriority] = useState<string>("P3");

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadLogs, setUploadLogs] = useState<BulkUploadLog[]>([]);
  const [createdTasksResult, setCreatedTasksResult] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"prepare" | "logs" | "created">("prepare");
  
  // Toggle states
  const [showProjectInfo, setShowProjectInfo] = useState(false);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [scrollPercent, setScrollPercent] = useState(0);
  const [viewMode, setViewMode] = useState<"table" | "slide_cards">("table");
  const [tableLayoutMode, setTableLayoutMode] = useState<"compact" | "all_columns">("compact");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [logFilter, setLogFilter] = useState<"all" | "error" | "success">("all");
  const [logsCopied, setLogsCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultProjectId) {
      setDefaultProject(defaultProjectId);
    } else if ((!defaultProject || defaultProject === "general") && availableProjects.length > 0) {
      setDefaultProject(availableProjects[0].id.toString());
    }
  }, [defaultProjectId, availableProjects]);

  useEffect(() => {
    if (activeView === "logs" && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [uploadLogs, activeView]);

  // Parse CSV string into row objects
  const parseCSV = (text: string): BulkTaskRow[] => {
    // 1. Strip UTF-8 BOM if present
    const cleanText = text.replace(/^\uFEFF/, "");
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 1) return [];

    // Auto-detect delimiter: comma, semicolon, or tab
    const firstLine = lines[0] || "";
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    let delimiter = ",";
    if (semicolonCount > commaCount && semicolonCount > tabCount) delimiter = ";";
    else if (tabCount > commaCount && tabCount > semicolonCount) delimiter = "\t";

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          if (inQuotes && line[i + 1] === char) {
            current += char;
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const rawHeaders = parseLine(lines[0]);
    // Clean headers by removing all non-alphanumeric chars
    const headerLine = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
    const dataLines = lines.slice(1);

    const parsedRows: BulkTaskRow[] = [];

    dataLines.forEach((lineStr, index) => {
      if (!lineStr.trim()) return;
      const values = parseLine(lineStr);
      const rowDict: Record<string, string> = {};
      headerLine.forEach((h, i) => {
        if (values[i] !== undefined) {
          rowDict[h] = values[i];
        }
      });

      const topic = rowDict["tasktopic"] || rowDict["topic"] || rowDict["title"] || rowDict["tasktitle"] || rowDict["name"] || values[0] || "";
      const description = rowDict["description"] || rowDict["details"] || rowDict["notes"] || values[1] || "";
      const rawPriority = (rowDict["priority"] || values[2] || "P3").toUpperCase();
      let priority = "P3";
      if (rawPriority.includes("P1") || rawPriority.includes("CRITICAL")) priority = "P1";
      else if (rawPriority.includes("P2") || rawPriority.includes("HIGH")) priority = "P2";
      else if (rawPriority.includes("P4") || rawPriority.includes("LOW")) priority = "P4";

      // Robust due date extraction across variations
      let rawDueDate = "";
      for (const [k, v] of Object.entries(rowDict)) {
        if (!v) continue;
        if (
          k.includes("due") || 
          k.includes("deadline") || 
          k.includes("targetdate") || 
          k.includes("enddate") || 
          k === "date"
        ) {
          rawDueDate = v;
          break;
        }
      }

      // Check standard 4th column (index 3) if not found in headers
      if (!rawDueDate && values[3]) {
        rawDueDate = values[3];
      }

      // Scan all column values for date pattern
      if (!rawDueDate) {
        for (const val of values) {
          if (val && (/^\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}$/.test(val) || /^\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}$/.test(val))) {
            rawDueDate = val;
            break;
          }
        }
      }

      const dueDate = normalizeDateToISO(rawDueDate);
      
      const dueTime = rowDict["duetime"] || rowDict["time"] || "";
      const project = rowDict["project"] || rowDict["projectname"] || "";
      const assignedTo = rowDict["assignedto"] || rowDict["assignee"] || "";
      const type = rowDict["type"] || "";
      const platform = rowDict["platform"] || "";
      const estimatedEffort = rowDict["estimatedeffort"] || rowDict["effort"] || 3;
      const effortUnit = rowDict["effortunit"] || "hours";
      const isUrgent = ["true", "yes", "1"].includes((rowDict["isurgent"] || "").toLowerCase());
      const tags = rowDict["tags"] || "";

      const isValid = Boolean(topic && topic.trim().length > 0);

      parsedRows.push({
        id: `row-${Date.now()}-${index}`,
        topic: topic.trim(),
        description,
        priority,
        dueDate,
        dueTime,
        project,
        assignedTo,
        type,
        platform,
        estimatedEffort,
        effortUnit,
        isUrgent,
        tags,
        isValid,
        validationError: !isValid ? "Task Topic / Title is required" : undefined
      });
    });

    return parsedRows;
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please upload a valid .csv file");
      return;
    }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const parsed = parseCSV(content);
        setRows(parsed);
        if (parsed.length === 0) {
          toast.warning("The selected CSV file appears to have no data rows.");
        } else {
          toast.success(`Successfully parsed ${parsed.length} tasks from CSV with due dates!`);
        }
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleAddManualRow = () => {
    const newRow: BulkTaskRow = {
      id: `row-manual-${Date.now()}`,
      topic: "",
      description: "",
      priority: defaultPriority,
      dueDate: new Date().toISOString().split("T")[0],
      dueTime: "17:00",
      project: defaultProject && defaultProject !== "general" ? (availableProjects.find(p => p.id.toString() === defaultProject)?.name || defaultProject) : "",
      assignedTo: defaultAssignee !== "none" ? defaultAssignee : "",
      type: "Feature",
      platform: "Web",
      estimatedEffort: 3,
      effortUnit: "hours",
      isUrgent: false,
      tags: "",
      isValid: false,
      validationError: "Task Topic is required"
    };
    setRows([newRow, ...rows]);
  };

  const handleUpdateRow = (id: string, updates: Partial<BulkTaskRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, ...updates };
        if (updates.dueDate) {
          updated.dueDate = normalizeDateToISO(updates.dueDate);
        }
        updated.isValid = Boolean(updated.topic && updated.topic.trim().length > 0);
        updated.validationError = !updated.isValid ? "Task Topic is required" : undefined;
        return updated;
      }
      return r;
    }));
  };

  const handleDeleteRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    setExpandedRowIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleClear = () => {
    setFile(null);
    setRows([]);
    setUploadLogs([]);
    setCreatedTasksResult([]);
    setExpandedRowIds(new Set());
    setActiveView("prepare");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedRowIds.size === rows.length) {
      setExpandedRowIds(new Set());
    } else {
      setExpandedRowIds(new Set(rows.map(r => r.id)));
    }
  };

  const slideTable = (offset: number) => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const slideToPosition = (pos: number) => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTo({ left: pos, behavior: "smooth" });
    }
  };

  const handleTableScroll = () => {
    if (tableScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableScrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        setScrollPercent(Math.min(100, Math.max(0, Math.round((scrollLeft / maxScroll) * 100))));
      }
    }
  };

  const handleSliderScroll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setScrollPercent(val);
    if (tableScrollRef.current) {
      const { scrollWidth, clientWidth } = tableScrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      tableScrollRef.current.scrollLeft = (val / 100) * maxScroll;
    }
  };

  const handleStartBulkUpload = async () => {
    if (rows.length === 0) {
      toast.error("Please add or upload tasks first");
      return;
    }

    const validRows = rows.filter(r => r.topic && r.topic.trim().length > 0);
    if (validRows.length === 0) {
      toast.error("No valid tasks found. Please enter a task topic before uploading.");
      return;
    }

    setIsUploading(true);
    setProgress(15);
    setActiveView("logs");

    const startTime = new Date();
    const startLog: BulkUploadLog = {
      timestamp: startTime.toISOString(),
      time_display: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: "info",
      message: `[${startTime.toLocaleTimeString()}] Initializing bulk upload for ${validRows.length} tasks...`
    };
    setUploadLogs([startLog]);

    try {
      setProgress(40);

      // Build payload with guaranteed normalized due date from valid rows
      const payloadTasks = validRows.map(r => ({
        task_topic: r.topic.trim(),
        description: r.description || "",
        priority: r.priority || defaultPriority || "P3",
        due_date: r.dueDate || new Date().toISOString().split("T")[0],
        due_time: r.dueTime || null,
        project: r.project || (defaultProject && defaultProject !== "general" ? (availableProjects.find(p => p.id.toString() === defaultProject)?.name || defaultProject) : ""),
        assigned_to: r.assignedTo || (defaultAssignee !== "none" ? defaultAssignee : ""),
        type: r.type || "",
        platform: r.platform || "",
        estimated_effort: r.estimatedEffort || 3,
        effort_unit: r.effortUnit || "hours",
        is_urgent: !!r.isUrgent,
        tags: r.tags || ""
      }));

      const res = await bulkUploadTasks({
        tasks: payloadTasks,
        default_project_id: defaultProject && defaultProject !== "general" ? defaultProject : undefined,
        default_assigned_to_id: defaultAssignee !== "none" ? defaultAssignee : undefined,
        default_priority: defaultPriority
      });

      setProgress(85);

      const serverLogs: BulkUploadLog[] = (res.logs || []).map((l: any) => ({
        timestamp: l.timestamp || new Date().toISOString(),
        time_display: l.time_display || new Date().toLocaleTimeString(),
        status: l.status || "success",
        title: l.title,
        task_id: l.task_id,
        project: l.project,
        priority: l.priority,
        message: l.message
      }));

      const finalEndTime = new Date();
      const completionLog: BulkUploadLog = {
        timestamp: finalEndTime.toISOString(),
        time_display: finalEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: res.created_count > 0 ? "success" : "error",
        message: `[${finalEndTime.toLocaleTimeString()}] Bulk Upload Finished: ${res.created_count || 0} tasks created successfully, ${res.failed_count || 0} failed.`
      };

      const allLogs = [startLog, ...serverLogs, completionLog];
      setUploadLogs(allLogs);

      const created = res.created_tasks || [];
      setCreatedTasksResult(created);

      if (created.length > 0) {
        setTasks(prev => {
          const newMap = new Map(created.map((t: any) => [t.id.toString(), t]));
          const filteredOld = prev.filter(t => !newMap.has(t.id.toString()));
          return [...created, ...filteredOld];
        });

        if (fetchTasks) {
          fetchTasks({}, true);
        }

        window.dispatchEvent(new CustomEvent('tasks-updated'));
        created.forEach((t: any) => {
          window.dispatchEvent(new CustomEvent('task-created', { detail: t }));
        });

        toast.success(`Bulk upload complete! ${created.length} tasks created.`);
        if (onSuccess) {
          onSuccess(created);
        }
        // Auto-navigate to Created view so upload button is not visible
        setActiveView("created");
      } else {
        toast.error("Failed to create any tasks. Check the error log.");
      }

      setProgress(100);
    } catch (err: any) {
      console.error(err);
      const errTime = new Date();
      setUploadLogs(prev => [
        ...prev,
        {
          timestamp: errTime.toISOString(),
          time_display: errTime.toLocaleTimeString(),
          status: "error",
          message: `[${errTime.toLocaleTimeString()}] Error: ${err.message || "Bulk upload failed on server"}`
        }
      ]);
      toast.error(err.message || "Failed to process bulk upload");
      setProgress(100);
    } finally {
      setIsUploading(false);
    }
  };

  const copyLogsToClipboard = () => {
    const text = uploadLogs.map(l => l.message).join("\n");
    navigator.clipboard.writeText(text);
    setLogsCopied(true);
    setTimeout(() => setLogsCopied(false), 2000);
    toast.success("Logs copied to clipboard");
  };

  const successLogsCount = uploadLogs.filter(l => l.status === "success").length;
  const errorLogsCount = uploadLogs.filter(l => l.status === "error").length;
  const filteredLogs = uploadLogs.filter(l => {
    if (logFilter === "error") return l.status === "error";
    if (logFilter === "success") return l.status === "success";
    return true;
  });

  const validRowsCount = rows.filter(r => r.isValid).length;
  const invalidRowsCount = rows.length - validRowsCount;
  const defaultProjectName = defaultProject && defaultProject !== "general"
    ? (availableProjects.find(p => p.id.toString() === defaultProject)?.name || defaultProject)
    : (availableProjects.length > 0 ? availableProjects[0].name : "");

  return (
    <div className="flex flex-col space-y-4 animate-in fade-in duration-300">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 shadow-sm">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              Bulk Task Upload
              <Badge variant="secondary" className="text-[11px] font-semibold bg-primary/15 text-primary border-primary/20">
                CSV Mode
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Upload multiple tasks simultaneously using a CSV spreadsheet with pre-defined titles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Eye Toggle Option */}
          <Button
            type="button"
            variant={showProjectInfo ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowProjectInfo(!showProjectInfo)}
            className={`gap-1.5 text-xs font-semibold ${showProjectInfo ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300" : ""}`}
            title={showProjectInfo ? "Hide Multi-Project Info" : "Show Multi-Project Info"}
          >
            {showProjectInfo ? <EyeOff className="h-4 w-4 text-blue-600" /> : <Eye className="h-4 w-4" />}
            <span>Multi-Project Info</span>
          </Button>

          {/* Download CSV Template */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadTaskCsvTemplate(projects.map(p => p.name).filter(Boolean))}
            className="gap-2 border-primary/30 hover:bg-primary/10 text-primary font-semibold shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>Download CSV Template</span>
          </Button>
        </div>
      </div>

      {/* Multi-Project Guidance Note (Visible when clicking Eye option) */}
      {showProjectInfo && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-950 dark:text-blue-100 animate-in fade-in slide-in-from-top-1 duration-200 shadow-xs">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">Multi-Project Support:</span>
              <button 
                type="button" 
                onClick={() => setShowProjectInfo(false)} 
                className="text-blue-600 hover:text-blue-800 dark:text-blue-300 font-medium text-[11px] underline"
              >
                Hide
              </button>
            </div>
            <p className="text-xs leading-relaxed text-blue-900/90 dark:text-blue-200/90">
              You can add tasks to multiple different projects in a single upload! In your CSV's <strong>Project</strong> column, specify the project name for each row (e.g. <em>SDLCD</em>, <em>Test</em>{projects.length > 0 ? `, ${projects.slice(0, 2).map(p => p.name).join(', ')}` : ''}). The system automatically checks your workspace and assigns each task to its designated project, or creates the project if it's new. Rows with an empty project column will automatically use the <strong>Default Project</strong> configured below.
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Defaults Configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-muted/30 rounded-xl border border-border/60">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground">Default Project (Optional)</Label>
          <Popover open={projectSearchOpen} onOpenChange={setProjectSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={projectSearchOpen}
                className="w-full h-9 justify-between text-xs bg-background px-3 font-normal"
              >
                <span className="truncate">
                  {availableProjects.find(p => p.id.toString() === defaultProject)?.name || "Select Project..."}
                </span>
                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search project..." className="h-9 text-xs" />
                <CommandList className="max-h-[220px]">
                  <CommandEmpty className="py-2.5 text-xs text-center text-muted-foreground">
                    No project found.
                  </CommandEmpty>
                  <CommandGroup>
                    {availableProjects.map((p) => {
                      const isSelected = defaultProject === p.id.toString();
                      return (
                        <CommandItem
                          key={p.id}
                          value={p.name}
                          onSelect={() => {
                            setDefaultProject(p.id.toString());
                            setProjectSearchOpen(false);
                          }}
                          className="text-xs cursor-pointer flex items-center justify-between py-1.5 px-2"
                        >
                          <span className="truncate">{p.name}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground">Default Assignee (Optional)</Label>
          <Select value={defaultAssignee} onValueChange={setDefaultAssignee}>
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue placeholder="Assignee Fallback..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Assign to Self (Logged-in User)</SelectItem>
              {teamMembers.map(m => (
                <SelectItem key={m.id} value={m.id.toString()}>{m.name || m.username}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground">Default Priority</Label>
          <Select value={defaultPriority} onValueChange={setDefaultPriority}>
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="P1">P1 - Critical</SelectItem>
              <SelectItem value="P2">P2 - High</SelectItem>
              <SelectItem value="P3">P3 - Medium</SelectItem>
              <SelectItem value="P4">P4 - Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeView === "prepare" ? "default" : "ghost"}
            onClick={() => setActiveView("prepare")}
            className="h-8 text-xs font-semibold"
          >
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Prepare & Review ({rows.length})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeView === "logs" ? "default" : "ghost"}
            onClick={() => setActiveView("logs")}
            className="h-8 text-xs font-semibold relative"
          >
            <Terminal className="h-3.5 w-3.5 mr-1.5" />
            Live Logs
            {uploadLogs.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-primary/20 text-primary text-[10px] rounded-full font-bold">
                {uploadLogs.length}
              </span>
            )}
          </Button>

          {createdTasksResult.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant={activeView === "created" ? "default" : "ghost"}
              onClick={() => setActiveView("created")}
              className="h-8 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
              Created ({createdTasksResult.length})
            </Button>
          )}
        </div>

        {rows.length > 0 && activeView === "prepare" && createdTasksResult.length === 0 && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddManualRow}
              className="h-8 text-xs gap-1 border-dashed"
            >
              <Plus className="h-3.5 w-3.5" /> Add Row
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          </div>
        )}
      </div>

      {/* Prepare View: Drag & Drop + Data Grid with Slide Feature */}
      {activeView === "prepare" && (
        <div className="space-y-4">
          {rows.length === 0 ? (
            /* Dropzone */
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDragging
                  ? "border-primary bg-primary/10 scale-[0.99]"
                  : "border-border/80 hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-inner">
                <Upload className="h-7 w-7 animate-pulse" />
              </div>
              <p className="text-sm font-bold text-foreground">Click to upload or drag & drop CSV file</p>
              <p className="text-xs text-muted-foreground mt-1 text-center max-w-sm">
                Supported columns: Task Topic, Description, Priority, Due Date, Due Time, Project, Assigned To, Type, Platform, Estimated Effort, Urgent, Tags
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full text-xs font-semibold px-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Browse Files
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs font-semibold px-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddManualRow();
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Create Manually
                </Button>
              </div>
            </div>
          ) : (
            /* Data Grid with Slide Feature */
            <div className="space-y-3">
              {/* Slide Controls Bar */}
              <div className="flex flex-col gap-2.5 p-3 bg-muted/40 rounded-xl border border-border/70 text-xs shadow-xs">
                {/* Top Row: Total Counts + View Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">
                      Tasks: <strong className="text-primary">{rows.length}</strong>
                    </span>
                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 font-medium">
                      {validRowsCount} Ready
                    </Badge>
                    {invalidRowsCount > 0 && (
                      <Badge variant="outline" className="text-destructive bg-destructive/10 border-destructive/30 font-medium">
                        {invalidRowsCount} Missing Topic
                      </Badge>
                    )}
                  </div>

                  {/* View Mode Switcher: Table View vs Slide Cards View */}
                  <div className="inline-flex rounded-lg border border-border/80 bg-background p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                        viewMode === "table"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Table Slide View
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("slide_cards")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                        viewMode === "slide_cards"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      Slide Cards View
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Slide-Down Mode Selection & Interactive Controls */}
                {viewMode === "table" && (
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-border/50">
                    {/* Layout Mode Segmented Control */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold text-muted-foreground mr-0.5">Table Layout:</span>
                      <div className="inline-flex rounded-lg border border-border/80 bg-background p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setTableLayoutMode("compact")}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                            tableLayoutMode === "compact"
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                          title="Slide-down drawer for Type, Platform, Effort, Urgent, Description, Tags"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                          Slide-Down Other Fields
                        </button>
                        <button
                          type="button"
                          onClick={() => setTableLayoutMode("all_columns")}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                            tableLayoutMode === "all_columns"
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                          title="Display all 15 columns horizontally in a wide table"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          All Columns (Wide)
                        </button>
                      </div>

                      {/* Slide Down All Other Fields Toggle */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleExpandAll}
                        className="h-7 text-xs gap-1.5 font-semibold text-primary border-primary/30 hover:bg-primary/10 ml-1"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span>{expandedRowIds.size === rows.length ? "Collapse All Details" : `Slide Down All Other Fields (${rows.length})`}</span>
                        {expandedRowIds.size === rows.length ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>

                    {/* Controls specific to All Columns Wide mode */}
                    {tableLayoutMode === "all_columns" ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Interactive Slide Range Slider */}
                        <div className="flex items-center gap-2 bg-background/90 px-3 py-1 rounded-lg border border-border/80 shadow-2xs">
                          <Sliders className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-[11px] font-semibold text-foreground shrink-0 hidden sm:inline">
                            Slide Columns:
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={scrollPercent}
                            onChange={handleSliderScroll}
                            className="w-24 sm:w-36 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            title="Drag slider left/right to view all task columns"
                          />
                          <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">
                            {scrollPercent}%
                          </span>
                          <div className="flex items-center gap-0.5 ml-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => slideTable(-350)}
                              className="h-6 w-6 rounded hover:bg-muted"
                              title="Slide Left"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => slideTable(350)}
                              className="h-6 w-6 rounded hover:bg-muted"
                              title="Slide Right"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Column Quick Jump Presets */}
                        <div className="inline-flex rounded-lg border border-border/80 bg-background p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => slideToPosition(0)}
                            className="px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                          >
                            Basic
                          </button>
                          <button
                            type="button"
                            onClick={() => slideToPosition(380)}
                            className="px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                          >
                            Dates
                          </button>
                          <button
                            type="button"
                            onClick={() => slideToPosition(850)}
                            className="px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                          >
                            Type & Effort
                          </button>
                          <button
                            type="button"
                            onClick={() => slideToPosition(1450)}
                            className="px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                          >
                            More Details
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md border border-border/40">
                        💡 Click <strong className="text-foreground">Slide Down Fields</strong> or row <strong className="text-foreground">#</strong> to view Type, Platform, Effort, Urgent, Description & Tags.
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* View 1: Slide Cards View Mode (Full-width card per task) */}
              {viewMode === "slide_cards" && (
                <div className="space-y-4">
                  {rows.length > 0 && (
                    <div className="bg-background border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
                      {/* Slide Card Header with Navigation */}
                      <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            Slide Card: Task #{activeCardIndex + 1} of {rows.length}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              rows[activeCardIndex]?.isValid
                                ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300"
                                : "text-destructive bg-destructive/10 border-destructive/30"
                            }
                          >
                            {rows[activeCardIndex]?.isValid ? "Ready" : "Missing Title"}
                          </Badge>
                        </div>

                        {/* Slide Prev / Next Card Controls */}
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={activeCardIndex === 0}
                            onClick={() => setActiveCardIndex(prev => Math.max(0, prev - 1))}
                            className="h-8 text-xs gap-1"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" /> Previous Task
                          </Button>

                          <div className="text-xs font-mono text-muted-foreground px-1">
                            {activeCardIndex + 1} / {rows.length}
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={activeCardIndex >= rows.length - 1}
                            onClick={() => setActiveCardIndex(prev => Math.min(rows.length - 1, prev + 1))}
                            className="h-8 text-xs gap-1"
                          >
                            Next Task <ChevronRight className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              handleDeleteRow(rows[activeCardIndex].id);
                              setActiveCardIndex(prev => Math.max(0, Math.min(prev, rows.length - 2)));
                            }}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            title="Delete this task card"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Slide Card Content Form */}
                      {rows[activeCardIndex] && (() => {
                        const currentRow = rows[activeCardIndex];
                        return (
                          <div className="space-y-4">
                            {/* Task Topic */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold flex items-center justify-between">
                                <span>Task Topic <span className="text-destructive">*</span></span>
                                {!currentRow.isValid && (
                                  <span className="text-destructive text-[11px] font-normal">Topic is required</span>
                                )}
                              </Label>
                              <Input
                                value={currentRow.topic}
                                onChange={(e) => handleUpdateRow(currentRow.id, { topic: e.target.value })}
                                placeholder="Enter task topic / title..."
                                className={`text-sm font-medium ${!currentRow.isValid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                              />
                            </div>

                            {/* 3-Column Grid of Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                              {/* Priority */}
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold">Priority</Label>
                                <Select
                                  value={currentRow.priority}
                                  onValueChange={(val) => handleUpdateRow(currentRow.id, { priority: val })}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="P1">P1 Critical</SelectItem>
                                    <SelectItem value="P2">P2 High</SelectItem>
                                    <SelectItem value="P3">P3 Medium</SelectItem>
                                    <SelectItem value="P4">P4 Low</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Due Date with Clear Friendly Badge */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-semibold">Due Date <span className="text-destructive">*</span></Label>
                                  <span className="text-[11px] text-primary font-semibold flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatFriendlyDate(currentRow.dueDate || getTodayISO())}
                                  </span>
                                </div>
                                <Input
                                  type="date"
                                  value={currentRow.dueDate || getTodayISO()}
                                  onChange={(e) => handleUpdateRow(currentRow.id, { dueDate: e.target.value })}
                                  className="h-8 text-xs font-mono"
                                />
                              </div>

                              {/* Due Time */}
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold">Due Time</Label>
                                <Input
                                  value={currentRow.dueTime || ""}
                                  onChange={(e) => handleUpdateRow(currentRow.id, { dueTime: e.target.value })}
                                  placeholder="17:00 / EOD"
                                  className="h-8 text-xs font-mono"
                                />
                              </div>

                              {/* Project */}
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold">Project</Label>
                                <Input
                                  list="bulk-project-options-card"
                                  value={currentRow.project || ""}
                                  onChange={(e) => handleUpdateRow(currentRow.id, { project: e.target.value })}
                                  placeholder={`Default: ${defaultProjectName}`}
                                  className="h-8 text-xs"
                                />
                                <datalist id="bulk-project-options-card">
                                  {availableProjects.map(p => (
                                    <option key={p.id} value={p.name} />
                                  ))}
                                </datalist>
                              </div>

                              {/* Assignee */}
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold">Assignee</Label>
                                <Input
                                  value={currentRow.assignedTo || ""}
                                  onChange={(e) => handleUpdateRow(currentRow.id, { assignedTo: e.target.value })}
                                  placeholder={defaultAssignee !== "none" ? "Default selected" : "Self"}
                                  className="h-8 text-xs"
                                />
                              </div>

                              {/* Type */}
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold">Type</Label>
                                <Select
                                  value={currentRow.type || "none"}
                                  onValueChange={(val) => handleUpdateRow(currentRow.id, { type: val === "none" ? "" : val })}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Type..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="Feature">Feature</SelectItem>
                                    <SelectItem value="Issue">Issue</SelectItem>
                                    <SelectItem value="Enhancement">Enhancement</SelectItem>
                                    <SelectItem value="Change Request">Change Request</SelectItem>
                                    <SelectItem value="Bug">Bug</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Platform */}
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold">Platform</Label>
                                <Select
                                  value={currentRow.platform || "none"}
                                  onValueChange={(val) => handleUpdateRow(currentRow.id, { platform: val === "none" ? "" : val })}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Platform..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="Web">Web</SelectItem>
                                    <SelectItem value="App">App</SelectItem>
                                    <SelectItem value="Backend">Backend</SelectItem>
                                    <SelectItem value="Mobile">Mobile</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Estimated Effort */}
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold">Effort (Hours)</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={currentRow.estimatedEffort ?? 3}
                                  onChange={(e) => handleUpdateRow(currentRow.id, { estimatedEffort: e.target.value })}
                                  className="h-8 text-xs"
                                />
                              </div>

                              {/* Urgent Switch */}
                              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border">
                                <Label className="text-xs font-semibold">Mark Urgent</Label>
                                <Switch
                                  checked={!!currentRow.isUrgent}
                                  onCheckedChange={(checked) => handleUpdateRow(currentRow.id, { isUrgent: checked })}
                                />
                              </div>
                            </div>

                            {/* Description Textarea */}
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Description / Specifications</Label>
                              <Textarea
                                rows={3}
                                value={currentRow.description || ""}
                                onChange={(e) => handleUpdateRow(currentRow.id, { description: e.target.value })}
                                placeholder="Enter full task details, requirements, or acceptance criteria..."
                                className="text-xs resize-none"
                              />
                            </div>

                            {/* Tags Input */}
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Tags (comma separated)</Label>
                              <Input
                                value={currentRow.tags || ""}
                                onChange={(e) => handleUpdateRow(currentRow.id, { tags: e.target.value })}
                                placeholder="e.g. backend, auth, ui"
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* View 2: Slidable Table Container */}
              {viewMode === "table" && (
                <div className="border border-border/80 rounded-xl overflow-hidden shadow-xs bg-background">
                  <div 
                    ref={tableScrollRef}
                    onScroll={handleTableScroll}
                    className="overflow-x-auto max-h-[380px] overflow-y-auto scrollbar-thin scroll-smooth"
                  >
                    <table className={`${tableLayoutMode === "compact" ? "w-full" : "min-w-[1550px] w-full"} text-xs border-collapse`}>
                      <thead className="bg-muted/80 sticky top-0 z-20 text-muted-foreground uppercase tracking-wider font-semibold shadow-xs">
                        {tableLayoutMode === "compact" ? (
                          <tr className="border-b border-border">
                            <th className="py-2.5 px-3 text-center w-14 sticky left-0 bg-muted/95 z-30 shadow-r">#</th>
                            <th className="py-2.5 px-3 text-left min-w-[200px] sticky left-14 bg-muted/95 z-30">
                              Task Topic <span className="text-destructive">*</span>
                            </th>
                            <th className="py-2.5 px-3 text-left w-28">Priority</th>
                            <th className="py-2.5 px-3 text-left w-36">
                              Due Date <span className="text-destructive">*</span>
                            </th>
                            <th className="py-2.5 px-3 text-left w-24">Due Time</th>
                            <th className="py-2.5 px-3 text-left w-36">Project</th>
                            <th className="py-2.5 px-3 text-left w-32">Assignee</th>
                            <th className="py-2.5 px-3 text-center min-w-[160px]">Other Fields</th>
                            <th className="py-2.5 px-3 text-center w-12">Action</th>
                          </tr>
                        ) : (
                          <tr className="border-b border-border">
                            <th className="py-2.5 px-3 text-left w-14 sticky left-0 bg-muted/95 z-30 shadow-r">#</th>
                            <th className="py-2.5 px-3 text-left w-56 sticky left-14 bg-muted/95 z-30">
                              Task Topic <span className="text-destructive">*</span>
                            </th>
                            <th className="py-2.5 px-3 text-left w-28">Priority</th>
                            <th className="py-2.5 px-3 text-left w-40">
                              Due Date <span className="text-destructive">*</span>
                            </th>
                            <th className="py-2.5 px-3 text-left w-28">Due Time</th>
                            <th className="py-2.5 px-3 text-left w-44">Project</th>
                            <th className="py-2.5 px-3 text-left w-40">Assignee</th>
                            <th className="py-2.5 px-3 text-left w-32">Type</th>
                            <th className="py-2.5 px-3 text-left w-28">Platform</th>
                            <th className="py-2.5 px-3 text-left w-24">Effort (Hrs)</th>
                            <th className="py-2.5 px-3 text-center w-20">Urgent</th>
                            <th className="py-2.5 px-3 text-left w-52">Description</th>
                            <th className="py-2.5 px-3 text-left w-36">Tags</th>
                            <th className="py-2.5 px-center w-28">Slide Detail</th>
                            <th className="py-2.5 px-3 text-center w-12">Action</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {rows.map((row, idx) => {
                          const isExpanded = expandedRowIds.has(row.id);
                          return (
                            <React.Fragment key={row.id}>
                              <tr
                                className={`hover:bg-muted/30 transition-colors ${!row.isValid ? "bg-destructive/5" : ""} ${isExpanded ? "bg-primary/5 border-l-4 border-l-primary" : ""}`}
                              >
                                {/* # Row Number & Slide Down Chevron Toggle */}
                                <td className="py-2 px-2 text-center text-muted-foreground font-mono text-[11px] sticky left-0 bg-background z-10">
                                  <button
                                    type="button"
                                    onClick={() => toggleRowExpand(row.id)}
                                    className="inline-flex items-center justify-center gap-1 w-full px-1 py-1 rounded hover:bg-muted text-foreground transition-colors group cursor-pointer"
                                    title={isExpanded ? "Slide Up (Collapse)" : "Slide Down to view other fields"}
                                  >
                                    <span className="font-semibold text-xs">{idx + 1}</span>
                                    {isExpanded ? (
                                      <ChevronUp className="h-3.5 w-3.5 text-primary shrink-0" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                                    )}
                                  </button>
                                </td>

                                {/* Task Topic */}
                                <td className="py-2 px-3 sticky left-14 bg-background z-10">
                                  <Input
                                    value={row.topic}
                                    onChange={(e) => handleUpdateRow(row.id, { topic: e.target.value })}
                                    placeholder="Task topic (required)..."
                                    className={`h-7 text-xs ${!row.isValid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                  />
                                  {row.validationError && (
                                    <p className="text-[10px] text-destructive mt-0.5">{row.validationError}</p>
                                  )}
                                </td>

                                {/* Priority */}
                                <td className="py-2 px-3">
                                  <Select
                                    value={row.priority}
                                    onValueChange={(val) => handleUpdateRow(row.id, { priority: val })}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="P1">P1 Critical</SelectItem>
                                      <SelectItem value="P2">P2 High</SelectItem>
                                      <SelectItem value="P3">P3 Medium</SelectItem>
                                      <SelectItem value="P4">P4 Low</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>

                                {/* Due Date (Normalized with fallback & friendly preview) */}
                                <td className="py-2 px-3">
                                  <div className="space-y-1 min-w-[125px]">
                                    <Input
                                      type="date"
                                      value={row.dueDate || getTodayISO()}
                                      onChange={(e) => handleUpdateRow(row.id, { dueDate: e.target.value })}
                                      className="h-7 text-xs font-mono"
                                    />
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium truncate">
                                      <Calendar className="h-3 w-3 text-primary shrink-0" />
                                      <span className="truncate">{formatFriendlyDate(row.dueDate || getTodayISO())}</span>
                                    </div>
                                  </div>
                                </td>

                                {/* Due Time */}
                                <td className="py-2 px-3">
                                  <Input
                                    value={row.dueTime || ""}
                                    onChange={(e) => handleUpdateRow(row.id, { dueTime: e.target.value })}
                                    placeholder="17:00 / EOD"
                                    className="h-7 text-xs font-mono"
                                  />
                                </td>

                                {/* Project (with Datalist Autocomplete) */}
                                <td className="py-2 px-3">
                                  <Input
                                    list="bulk-project-options"
                                    value={row.project || ""}
                                    onChange={(e) => handleUpdateRow(row.id, { project: e.target.value })}
                                    placeholder={`Default: ${defaultProjectName}`}
                                    className="h-7 text-xs"
                                  />
                                  <datalist id="bulk-project-options">
                                    {availableProjects.map(p => (
                                      <option key={p.id} value={p.name} />
                                    ))}
                                  </datalist>
                                </td>

                                {/* Assignee */}
                                <td className="py-2 px-3">
                                  <Input
                                    value={row.assignedTo || ""}
                                    onChange={(e) => handleUpdateRow(row.id, { assignedTo: e.target.value })}
                                    placeholder={defaultAssignee !== "none" ? "Default selected" : "Self"}
                                    className="h-7 text-xs"
                                  />
                                </td>

                                {tableLayoutMode === "compact" ? (
                                  /* Slide Down Trigger Column in Compact Mode */
                                  <td className="py-2 px-3 text-center">
                                    <Button
                                      type="button"
                                      variant={isExpanded ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => toggleRowExpand(row.id)}
                                      className={`h-7 px-2.5 text-[11px] gap-1.5 font-semibold transition-all ${
                                        isExpanded
                                          ? "bg-primary text-primary-foreground shadow-xs"
                                          : "border-border/80 text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                                      }`}
                                      title="Slide down to view and edit Type, Platform, Effort, Urgent, Description, Tags"
                                    >
                                      <SlidersHorizontal className="h-3 w-3" />
                                      <span>{isExpanded ? "Hide Fields" : "Slide Down Fields"}</span>
                                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    </Button>
                                    {/* Visual badges of configured extra fields */}
                                    {!isExpanded && (row.type || row.platform || row.isUrgent || row.description || row.tags) && (
                                      <div className="flex items-center justify-center gap-1 mt-1 text-[9px] text-muted-foreground flex-wrap">
                                        {row.type && <span className="bg-muted px-1 py-0.2 rounded font-medium">{row.type}</span>}
                                        {row.platform && <span className="bg-muted px-1 py-0.2 rounded font-medium">{row.platform}</span>}
                                        {row.isUrgent && (
                                          <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold px-1 py-0.2 rounded">
                                            Urgent
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                ) : (
                                  /* All Columns Mode: 6 Individual Table Cells */
                                  <>
                                    {/* Type */}
                                    <td className="py-2 px-3">
                                      <Select
                                        value={row.type || "none"}
                                        onValueChange={(val) => handleUpdateRow(row.id, { type: val === "none" ? "" : val })}
                                      >
                                        <SelectTrigger className="h-7 text-xs">
                                          <SelectValue placeholder="Type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">None</SelectItem>
                                          <SelectItem value="Feature">Feature</SelectItem>
                                          <SelectItem value="Issue">Issue</SelectItem>
                                          <SelectItem value="Enhancement">Enhancement</SelectItem>
                                          <SelectItem value="Change Request">Change Request</SelectItem>
                                          <SelectItem value="Bug">Bug</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </td>

                                    {/* Platform */}
                                    <td className="py-2 px-3">
                                      <Select
                                        value={row.platform || "none"}
                                        onValueChange={(val) => handleUpdateRow(row.id, { platform: val === "none" ? "" : val })}
                                      >
                                        <SelectTrigger className="h-7 text-xs">
                                          <SelectValue placeholder="Platform..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">None</SelectItem>
                                          <SelectItem value="Web">Web</SelectItem>
                                          <SelectItem value="App">App</SelectItem>
                                          <SelectItem value="Backend">Backend</SelectItem>
                                          <SelectItem value="Mobile">Mobile</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </td>

                                    {/* Estimated Effort */}
                                    <td className="py-2 px-3">
                                      <Input
                                        type="number"
                                        min={0}
                                        value={row.estimatedEffort ?? 3}
                                        onChange={(e) => handleUpdateRow(row.id, { estimatedEffort: e.target.value })}
                                        className="h-7 text-xs"
                                      />
                                    </td>

                                    {/* Urgent */}
                                    <td className="py-2 px-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={!!row.isUrgent}
                                        onChange={(e) => handleUpdateRow(row.id, { isUrgent: e.target.checked })}
                                        className="h-4 w-4 rounded accent-rose-500 cursor-pointer"
                                      />
                                    </td>

                                    {/* Description */}
                                    <td className="py-2 px-3">
                                      <Input
                                        value={row.description || ""}
                                        onChange={(e) => handleUpdateRow(row.id, { description: e.target.value })}
                                        placeholder="Add description..."
                                        className="h-7 text-xs"
                                      />
                                    </td>

                                    {/* Tags */}
                                    <td className="py-2 px-3">
                                      <Input
                                        value={row.tags || ""}
                                        onChange={(e) => handleUpdateRow(row.id, { tags: e.target.value })}
                                        placeholder="e.g. auth, api"
                                        className="h-7 text-xs"
                                      />
                                    </td>

                                    {/* Slide Detail in All Columns Mode */}
                                    <td className="py-2 px-3 text-center">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleRowExpand(row.id)}
                                        className={`h-7 px-2 text-[11px] gap-1 font-semibold ${isExpanded ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                                        title="Slide open task detail card"
                                      >
                                        <SlidersHorizontal className="h-3 w-3" />
                                        <span>{isExpanded ? "Close" : "Slide"}</span>
                                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                      </Button>
                                    </td>
                                  </>
                                )}

                                {/* Delete Row Action */}
                                <td className="py-2 px-3 text-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteRow(row.id)}
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    title="Delete task row"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              </tr>

                              {/* Slide-Down Detail Panel for This Row */}
                              {isExpanded && (
                                <tr className="bg-muted/15 border-b-2 border-primary/20 transition-all">
                                  <td colSpan={tableLayoutMode === "compact" ? 9 : 15} className="p-3 sm:p-4">
                                    <div className="bg-background rounded-xl p-4 border border-border/80 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                      {/* Slide-Down Header */}
                                      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                                        <div className="flex items-center gap-2">
                                          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                                            <SlidersHorizontal className="h-3.5 w-3.5" />
                                          </div>
                                          <div>
                                            <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                              Task #{idx + 1} Additional Fields & Properties
                                            </span>
                                            <p className="text-[10px] text-muted-foreground">
                                              Configuring: &ldquo;<span className="font-medium text-foreground">{row.topic || "Untitled Task"}</span>&rdquo;
                                            </p>
                                          </div>
                                        </div>

                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleRowExpand(row.id)}
                                          className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                        >
                                          <span>Slide Up (Done)</span>
                                          <ChevronUp className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>

                                      {/* Top Grid: Classification & Effort Fields */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                        {/* 1. Type */}
                                        <div className="space-y-1">
                                          <Label className="text-xs font-semibold text-muted-foreground">Type</Label>
                                          <Select
                                            value={row.type || "none"}
                                            onValueChange={(val) => handleUpdateRow(row.id, { type: val === "none" ? "" : val })}
                                          >
                                            <SelectTrigger className="h-8 text-xs bg-muted/20">
                                              <SelectValue placeholder="Select type..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="none">None</SelectItem>
                                              <SelectItem value="Feature">Feature</SelectItem>
                                              <SelectItem value="Issue">Issue</SelectItem>
                                              <SelectItem value="Enhancement">Enhancement</SelectItem>
                                              <SelectItem value="Change Request">Change Request</SelectItem>
                                              <SelectItem value="Bug">Bug</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        {/* 2. Platform */}
                                        <div className="space-y-1">
                                          <Label className="text-xs font-semibold text-muted-foreground">Platform</Label>
                                          <Select
                                            value={row.platform || "none"}
                                            onValueChange={(val) => handleUpdateRow(row.id, { platform: val === "none" ? "" : val })}
                                          >
                                            <SelectTrigger className="h-8 text-xs bg-muted/20">
                                              <SelectValue placeholder="Select platform..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="none">None</SelectItem>
                                              <SelectItem value="Web">Web</SelectItem>
                                              <SelectItem value="App">App</SelectItem>
                                              <SelectItem value="Backend">Backend</SelectItem>
                                              <SelectItem value="Mobile">Mobile</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        {/* 3. Estimated Effort (Hours) */}
                                        <div className="space-y-1">
                                          <Label className="text-xs font-semibold text-muted-foreground">Effort (Hours)</Label>
                                          <Input
                                            type="number"
                                            min={0}
                                            value={row.estimatedEffort ?? 3}
                                            onChange={(e) => handleUpdateRow(row.id, { estimatedEffort: e.target.value })}
                                            className="h-8 text-xs bg-muted/20 font-mono"
                                            placeholder="e.g. 6"
                                          />
                                        </div>

                                        {/* 4. Urgent Switch */}
                                        <div className="space-y-1">
                                          <Label className="text-xs font-semibold text-muted-foreground">Urgency</Label>
                                          <div className="flex items-center justify-between h-8 px-3 rounded-md bg-muted/30 border border-border/60">
                                            <span className="text-xs font-medium flex items-center gap-1.5">
                                              {row.isUrgent ? (
                                                <span className="text-rose-500 font-bold flex items-center gap-1">
                                                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> Urgent
                                                </span>
                                              ) : (
                                                <span className="text-muted-foreground">Standard</span>
                                              )}
                                            </span>
                                            <Switch
                                              checked={!!row.isUrgent}
                                              onCheckedChange={(checked) => handleUpdateRow(row.id, { isUrgent: checked })}
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Bottom Grid: Description & Tags */}
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                                        {/* Description */}
                                        <div className="space-y-1 md:col-span-2">
                                          <Label className="text-xs font-semibold text-muted-foreground">Description & Notes</Label>
                                          <Textarea
                                            rows={2}
                                            value={row.description || ""}
                                            onChange={(e) => handleUpdateRow(row.id, { description: e.target.value })}
                                            placeholder="Add detailed task specifications, notes, links or criteria..."
                                            className="text-xs resize-y bg-muted/20"
                                          />
                                        </div>

                                        {/* Tags */}
                                        <div className="space-y-1">
                                          <Label className="text-xs font-semibold text-muted-foreground">Tags (comma separated)</Label>
                                          <Input
                                            value={row.tags || ""}
                                            onChange={(e) => handleUpdateRow(row.id, { tags: e.target.value })}
                                            placeholder="e.g. auth, api, ui"
                                            className="h-8 text-xs bg-muted/20"
                                          />
                                          {row.tags && (
                                            <div className="flex flex-wrap gap-1 mt-1 max-h-12 overflow-y-auto">
                                              {row.tags.split(",").map((t, i) => t.trim() && (
                                                <Badge key={i} variant="secondary" className="text-[10px] py-0 px-1.5 h-4 font-normal">
                                                  #{t.trim()}
                                                </Badge>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Upload Action Bar: Conditionally Hidden Once Upload is Successful */}
              {createdTasksResult.length > 0 ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-emerald-950 dark:text-emerald-200">
                        {createdTasksResult.length} Tasks Successfully Uploaded & Created
                      </span>
                      <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                        These tasks are now active in your workspace. Upload button has been locked to prevent duplicate submissions.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClear}
                      className="h-8 text-xs font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Upload New Batch
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => setActiveView("created")}
                      className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
                    >
                      View Created Tasks ({createdTasksResult.length}) →
                    </Button>
                    {onClose && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={onClose}
                        className="h-8 text-xs font-bold gradient-primary px-4 shadow-xs"
                      >
                        Done
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddManualRow}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Another Task
                  </Button>

                  <Button
                    type="button"
                    onClick={handleStartBulkUpload}
                    disabled={isUploading || rows.length === 0 || validRowsCount === 0}
                    className="gradient-primary text-primary-foreground font-bold text-xs px-6 shadow-md gap-2"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Uploading Tasks...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload {validRowsCount} Tasks
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Progress Bar when uploading */}
      {isUploading && (
        <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex justify-between text-xs font-semibold text-primary">
            <span>Processing batch upload & logging real-time timestamps...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Live Logs View - Senior Architect Redesign */}
      {activeView === "logs" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Total Batch */}
            <div className="p-3.5 rounded-xl bg-background border border-border/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span>Total Batch</span>
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold font-mono text-foreground">
                {validRowsCount || rows.length || uploadLogs.length}
              </div>
              <p className="text-[10px] text-muted-foreground">Tasks queued for server</p>
            </div>

            {/* 2. Successfully Created */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <span>Created</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {createdTasksResult.length}
              </div>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">Committed to database</p>
            </div>

            {/* 3. Errors / Warnings */}
            <div className={`p-3.5 rounded-xl border shadow-2xs space-y-1 ${
              errorLogsCount > 0 
                ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/60" 
                : "bg-background border-border/80"
            }`}>
              <div className={`flex items-center justify-between text-[11px] font-semibold ${
                errorLogsCount > 0 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground"
              }`}>
                <span>Errors</span>
                <AlertCircle className={`h-3.5 w-3.5 ${errorLogsCount > 0 ? "text-rose-500" : "text-muted-foreground"}`} />
              </div>
              <div className={`text-xl font-bold font-mono ${
                errorLogsCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
              }`}>
                {errorLogsCount}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {errorLogsCount > 0 ? "Issues detected" : "Zero errors"}
              </p>
            </div>

            {/* 4. Pipeline Status */}
            <div className="p-3.5 rounded-xl bg-background border border-border/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span>Pipeline</span>
                <Terminal className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                {isUploading ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                    Streaming...
                  </span>
                ) : errorLogsCount > 0 ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-rose-500">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Action Required
                  </span>
                ) : createdTasksResult.length > 0 ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Completed
                  </span>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">Ready</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">SQLite WAL Engine</p>
            </div>
          </div>

          {/* Contextual Action Hero Banner */}
          {errorLogsCount > 0 && !isUploading && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 shadow-xs">
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-rose-950 dark:text-rose-200">
                    Upload Incomplete — Attention Needed
                  </h5>
                  <p className="text-[11px] text-rose-800/90 dark:text-rose-300/90 mt-0.5">
                    One or more issues were reported during the batch transaction. You can retry immediately or return to the review table to inspect and update tasks.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveView("prepare")}
                  className="h-7 text-xs border-rose-300 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                >
                  ← Edit in Table
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleStartBulkUpload}
                  disabled={isUploading}
                  className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5 shadow-xs"
                >
                  <RefreshCw className="h-3 w-3" /> Retry Upload
                </Button>
              </div>
            </div>
          )}

          {createdTasksResult.length > 0 && !isUploading && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-xs">
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-emerald-950 dark:text-emerald-200">
                    Bulk Upload Successfully Completed!
                  </h5>
                  <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 mt-0.5">
                    Created {createdTasksResult.length} tasks and synchronized all projects in your workspace.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setActiveView("created")}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shrink-0"
              >
                View Created Tasks ({createdTasksResult.length}) →
              </Button>
            </div>
          )}

          {/* Developer-Grade Terminal Window Container */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-xl overflow-hidden">
            {/* Terminal Window Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
              {/* Left: Window Controls & Title */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <div className="h-3.5 w-px bg-slate-700 mx-1" />
                <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                  <Terminal className="h-3 w-3 text-primary" />
                  task-bulk-worker.log
                </span>
                {isUploading && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE STREAM
                  </span>
                )}
              </div>

              {/* Right: Filter Buttons & Copy */}
              <div className="flex items-center gap-1.5">
                {/* Filter Pills */}
                <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setLogFilter("all")}
                    className={`px-2 py-0.5 rounded font-mono transition-colors ${
                      logFilter === "all"
                        ? "bg-slate-800 text-white font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    All ({uploadLogs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogFilter("error")}
                    className={`px-2 py-0.5 rounded font-mono transition-colors flex items-center gap-1 ${
                      logFilter === "error"
                        ? "bg-rose-950 text-rose-300 font-bold"
                        : "text-slate-400 hover:text-rose-300"
                    }`}
                  >
                    {errorLogsCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                    Errors ({errorLogsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogFilter("success")}
                    className={`px-2 py-0.5 rounded font-mono transition-colors ${
                      logFilter === "success"
                        ? "bg-emerald-950 text-emerald-300 font-bold"
                        : "text-slate-400 hover:text-emerald-300"
                    }`}
                  >
                    Success ({successLogsCount})
                  </button>
                </div>

                {/* Copy Button */}
                {uploadLogs.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyLogsToClipboard}
                    className="h-6 px-2 text-[11px] gap-1 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800"
                    title="Copy full console logs"
                  >
                    {logsCopied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Terminal Body */}
            <ScrollArea className="h-[260px] w-full p-3 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-center">
                  <Terminal className="h-8 w-8 mb-2 opacity-40 text-slate-400" />
                  <p className="text-xs">No logs matching the current filter.</p>
                  <span className="text-[10px] text-slate-600 mt-0.5">Switch filter to &ldquo;All&rdquo; to view complete pipeline stream.</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredLogs.map((log, index) => {
                    const isSuccess = log.status === "success";
                    const isError = log.status === "error";
                    const isInfo = log.status === "info";

                    return (
                      <div
                        key={index}
                        className={`flex items-start gap-2.5 p-2 rounded-lg leading-relaxed border transition-all ${
                          isSuccess
                            ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-200"
                            : isError
                            ? "bg-rose-950/30 border-rose-900/50 text-rose-200"
                            : "bg-slate-900/50 border-slate-800/80 text-slate-300"
                        }`}
                      >
                        {/* Line Number */}
                        <span className="text-[10px] text-slate-500 select-none font-mono pt-0.5 w-5 text-right shrink-0">
                          {String(index + 1).padStart(2, '0')}
                        </span>

                        {/* Timestamp Pill */}
                        <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                          {log.time_display}
                        </span>

                        {/* Severity Pill */}
                        <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded uppercase shrink-0 ${
                          isSuccess
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : isError
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                        }`}>
                          {log.status}
                        </span>

                        {/* Task ID if present */}
                        {log.task_id && (
                          <Badge variant="outline" className="text-[10px] font-mono border-emerald-700 bg-emerald-900/40 text-emerald-300 shrink-0">
                            ID: #{log.task_id}
                          </Badge>
                        )}

                        {/* Message */}
                        <span className="font-sans text-xs flex-1 break-words">
                          {log.message}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Action Footer Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveView("prepare")}
              className="text-xs gap-1.5 font-medium"
            >
              ← Back to Review Table
            </Button>

            <div className="flex items-center gap-2">
              {errorLogsCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStartBulkUpload}
                  disabled={isUploading}
                  className="text-xs gap-1.5 border-rose-300 text-rose-600 hover:bg-rose-50 font-semibold"
                >
                  <RefreshCw className="h-3 w-3" /> Retry Failed Upload
                </Button>
              )}

              {createdTasksResult.length > 0 && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => setActiveView("created")}
                  className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  View Created Tasks ({createdTasksResult.length}) →
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Created Tasks View */}
      {activeView === "created" && createdTasksResult.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Created Tasks with Live Server Timestamps</span>
            </h4>
            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-none">
              {createdTasksResult.length} Added to Workspace
            </Badge>
          </div>

          <div className="border border-border/80 rounded-xl overflow-hidden shadow-xs">
            <ScrollArea className="max-h-[280px] w-full">
              <table className="w-full text-xs">
                <thead className="bg-muted/70 sticky top-0 z-10 text-muted-foreground uppercase font-semibold">
                  <tr className="border-b border-border">
                    <th className="py-2 px-3 text-left">Task ID</th>
                    <th className="py-2 px-3 text-left">Title</th>
                    <th className="py-2 px-3 text-left">Project</th>
                    <th className="py-2 px-3 text-left">Priority</th>
                    <th className="py-2 px-3 text-left">Created Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {createdTasksResult.map((t: any) => (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="py-2 px-3 font-mono font-bold text-primary">#{t.id}</td>
                      <td className="py-2 px-3 font-medium text-foreground">{t.title}</td>
                      <td className="py-2 px-3 text-muted-foreground">{t.project || defaultProjectName || "Project"}</td>
                      <td className="py-2 px-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            t.priority === 'P1' ? 'border-rose-400 text-rose-500 bg-rose-50' :
                            t.priority === 'P2' ? 'border-amber-400 text-amber-500 bg-amber-50' :
                            'border-blue-400 text-blue-500 bg-blue-50'
                          }`}
                        >
                          {t.priority}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                        {t.created_at ? new Date(t.created_at).toLocaleString() : new Date().toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="text-xs"
            >
              Upload More Tasks
            </Button>
            {onClose && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onClose}
                className="gradient-primary text-primary-foreground text-xs font-bold px-5"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
