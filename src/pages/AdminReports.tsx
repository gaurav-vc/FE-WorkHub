import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Radar, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, 
  RadialBarChart, RadialBar, Legend, CartesianGrid 
} from 'recharts';
import { 
  Download, FileText, CheckCircle, Clock, AlertTriangle, Users, 
  LineChart as LineChartIcon, TrendingUp, Target, Zap, Award, Search, Filter 
} from 'lucide-react';
import { fetchEmployeeReport, EmployeeStats } from '@/api/reports';
import { getUserTaskGraph } from '@/api/tasks';
import { apiClient } from '@/api/client';
import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const processRadarData = (tasks: any[]) => {
  if (!tasks || tasks.length === 0) return [];
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'done' || t.status === 'completed').length;
  const delayed = tasks.filter(t => t.status === 'delayed').length;
  const issues = tasks.filter(t => t.status === 'blocked').length;

  return [
    { subject: 'Volume', A: Math.min(100, (total / 20) * 100), fullMark: 100 },
    { subject: 'Efficiency', A: (completed / total) * 100, fullMark: 100 },
    { subject: 'Reliability', A: 100 - ((delayed / total) * 100), fullMark: 100 },
    { subject: 'Resolution', A: 100 - ((issues / total) * 100), fullMark: 100 },
  ];
};

const processPriorityData = (tasks: any[]) => {
  if (!tasks || tasks.length === 0) return [];
  const priorities: any = { P1: 0, P2: 0, P3: 0, P4: 0, Unassigned: 0 };
  tasks.forEach(t => {
    const p = (t.priority || '').toUpperCase();
    if (priorities[p] !== undefined) priorities[p]++;
    else priorities.Unassigned++;
  });
  return Object.keys(priorities).map(key => ({ name: key, value: priorities[key] })).filter(p => p.value > 0);
};

const processMultiUserComparison = (tasks: any[]) => {
  if (!tasks || tasks.length === 0) return [];
  const userMap: Record<string, { name: string, completed: number, delayed: number, total: number }> = {};
  
  tasks.forEach(t => {
    const assignee = t.assignee || 'Unassigned';
    if (!userMap[assignee]) userMap[assignee] = { name: assignee, completed: 0, delayed: 0, total: 0 };
    userMap[assignee].total++;
    if (t.status === 'done' || t.status === 'completed') userMap[assignee].completed++;
    if (t.status === 'delayed') userMap[assignee].delayed++;
  });
  
  return Object.values(userMap).sort((a,b) => b.completed - a.completed);
};

const AdminReports = () => {
  const [employees, setEmployees] = useState<{id: number, name: string}[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [reportData, setReportData] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [employeeSearch, setEmployeeSearch] = useState('');
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const [graphModalOpen, setGraphModalOpen] = useState(false);
  const [graphUser, setGraphUser] = useState<{id: string, name: string} | null>(null);
  const [graphData, setGraphData] = useState<any[]>([]);
  const [graphStartDate, setGraphStartDate] = useState('');
  const [graphEndDate, setGraphEndDate] = useState('');

  const openEmployeeGraph = async (id: string, name: string, sDate = graphStartDate, eDate = graphEndDate) => {
    setGraphUser({ id, name });
    setGraphModalOpen(true);
    try {
      const res: any = await getUserTaskGraph(id, { start_date: sDate, end_date: eDate });
      setGraphData([
        { name: 'Completed', value: res.completed, fill: '#10b981' },
        { name: 'In Progress', value: res.in_progress, fill: '#3b82f6' },
        { name: 'Open', value: res.open, fill: '#f59e0b' }
      ]);
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    if (graphModalOpen && graphUser) {
      openEmployeeGraph(graphUser.id, graphUser.name, graphStartDate, graphEndDate);
    }
  }, [graphStartDate, graphEndDate]);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await apiClient('/auth/employees/');
        const formatted = (res || []).map((u: any) => ({
          id: u.id,
          name: u.full_name || u.username
        }));
        setEmployees(formatted);
      } catch (err) {
        toast.error("Failed to load employees");
      }
    };
    loadEmployees();
  }, []);

  const loadReport = async () => {
    if (selectedEmployees.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }
    setLoading(true);
    try {
      let filter = dateFilter;
      let sDate = startDate;
      let eDate = endDate;
      if (dateFilter === 'custom' && (!startDate || !endDate)) {
        toast.error("Please select both start and end dates");
        setLoading(false);
        return;
      }
      if (dateFilter === 'custom') {
        filter = '';
      } else {
        sDate = '';
        eDate = '';
      }
      
      const data = await fetchEmployeeReport(selectedEmployees, filter, sDate, eDate);
      setReportData(data);
      setCurrentPage(1);
    } catch (err) {
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEmployees.length > 0 && dateFilter !== 'custom') {
      loadReport();
    }
  }, [selectedEmployees, dateFilter]);

  const handleDownloadPdf = () => {
    const element = document.getElementById('report-dashboard');
    if (!element) return;
    
    const opt = {
      margin: 0.5,
      filename: `premium_report_${selectedEmployees.join('_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' as const }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  const handleDownloadCsv = () => {
    if (!reportData || !reportData.raw_tasks) return;
    
    const summaryHeaders = ['Metric', 'Count'];
    const summaryRows = [
      ['Total Assigned', reportData.kpis.total_assigned],
      ['Total Completed', reportData.kpis.total_completed],
      ['Total Delayed', reportData.kpis.total_delayed],
      ['Total Issues', reportData.kpis.total_issues],
      [],
    ];

    const headers = ['Task ID', 'Title', 'Assignee', 'Status', 'Priority', 'Created Date', 'Due Date'];
    const rows = reportData.raw_tasks.map((task: any) => [
      task.id,
      `"${task.title.replace(/"/g, '""')}"`,
      `"${task.assignee || 'Unassigned'}"`,
      task.status.toUpperCase(),
      task.priority,
      `"\t${task.created_at}"`,
      task.due_date ? `"\t${task.due_date}"` : '"N/A"'
    ]);
    
    const csvContent = [
      summaryHeaders.join(','),
      ...summaryRows.map(row => row.join(',')),
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `premium_report_${selectedEmployees.join('_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const PRIORITY_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#888888'];
  
  const filteredTasks = useMemo(() => {
    if (!reportData?.raw_tasks) return [];
    return reportData.raw_tasks.filter(t => {
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || (t.priority || '').toLowerCase() === priorityFilter.toLowerCase();
      return matchStatus && matchPriority;
    });
  }, [reportData, statusFilter, priorityFilter]);

  const totalTasks = filteredTasks.length;
  const totalPages = Math.ceil(totalTasks / itemsPerPage) || 1;
  
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const indexOfLastTask = currentPage * itemsPerPage;
  const indexOfFirstTask = indexOfLastTask - itemsPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('ellipsis');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip-blur">
          <p className="font-semibold text-sm mb-1">{label}</p>
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
              <span className="text-muted-foreground">{p.name}:</span>
              <span className="font-medium">{p.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const radarData = useMemo(() => processRadarData(reportData?.raw_tasks || []), [reportData]);
  const priorityData = useMemo(() => processPriorityData(reportData?.raw_tasks || []), [reportData]);
  const comparisonData = useMemo(() => processMultiUserComparison(reportData?.raw_tasks || []), [reportData]);
  
  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 text-primary rounded-xl backdrop-blur-md border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.3)] animate-pulse-soft">
              <Zap className="h-7 w-7" />
            </div>
            <span className="gradient-text">Performance Intelligence</span>
          </h1>
          <p className="text-muted-foreground ml-1">Deep analytics and behavioral insights for your team.</p>
        </div>
        
        {reportData && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex items-center gap-2 shadow-lg hover-glow bg-gradient-to-r from-primary to-accent border-0 text-white transition-all duration-300">
                <Download className="h-4 w-4" /> Export Intelligence
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-panel border-border/50">
              <DropdownMenuItem onClick={handleDownloadPdf} className="cursor-pointer hover:bg-primary/20">
                Generate Premium PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadCsv} className="cursor-pointer hover:bg-primary/20">
                Export Raw Data (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Card className="glass-panel-heavy border-primary/10 overflow-hidden relative z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <CardContent className="p-6 relative">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2 md:col-span-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Target Personnel</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-medium text-left h-11 px-4 bg-background/50 border-border/50 hover:bg-background/80 transition-colors">
                    {selectedEmployees.length === 0 ? "Select targets..." : `${selectedEmployees.length} personnel selected`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0 glass-panel border-border/50" align="start">
                  <div className="p-2 border-b border-border/50 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search..." 
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        className="h-8 pl-8 text-xs bg-background/50 border-border/50"
                      />
                    </div>
                    <div className="flex items-center space-x-2 px-1 pb-1">
                      <Checkbox 
                        id="select-all" 
                        checked={
                          employees.filter(e => e.name.toLowerCase().includes(employeeSearch.toLowerCase())).length > 0 && 
                          employees.filter(e => e.name.toLowerCase().includes(employeeSearch.toLowerCase()))
                            .every(emp => selectedEmployees.includes(emp.id.toString()))
                        }
                        onCheckedChange={(checked) => {
                          const filteredIds = employees.filter(e => e.name.toLowerCase().includes(employeeSearch.toLowerCase())).map(e => e.id.toString());
                          if (checked) {
                            const newSelections = new Set([...selectedEmployees, ...filteredIds]);
                            setSelectedEmployees(Array.from(newSelections));
                          } else {
                            setSelectedEmployees(selectedEmployees.filter(id => !filteredIds.includes(id)));
                          }
                        }}
                      />
                      <label htmlFor="select-all" className="text-sm font-medium leading-none cursor-pointer">
                        Select All
                      </label>
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto p-2 custom-scrollbar">
                    {employees.filter(e => e.name.toLowerCase().includes(employeeSearch.toLowerCase())).map((emp) => {
                      const empId = emp.id.toString();
                      return (
                        <div key={empId} className="flex items-center space-x-2 p-1.5 rounded hover:bg-primary/10 cursor-pointer transition-colors">
                          <Checkbox 
                            id={`emp-${empId}`} 
                            checked={selectedEmployees.includes(empId)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedEmployees([...selectedEmployees, empId]);
                              } else {
                                setSelectedEmployees(selectedEmployees.filter(id => id !== empId));
                              }
                            }}
                          />
                          <label htmlFor={`emp-${empId}`} className="text-sm cursor-pointer flex-1 select-none truncate">
                            {emp.name}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2 md:col-span-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Time Horizon</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="h-11 bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-panel border-border/50">
                  <SelectItem value="30d">Trailing 30 Days</SelectItem>
                  <SelectItem value="6m">Trailing 6 Months</SelectItem>
                  <SelectItem value="1y">Trailing 1 Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Start</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 bg-background/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">End</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11 bg-background/50 border-border/50" />
                </div>
              </>
            )}
            
            {dateFilter === 'custom' && (
              <Button onClick={loadReport} disabled={loading} className="w-full h-11 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 transition-colors">
                {loading ? 'Processing...' : 'Apply Matrix'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <div id="report-dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-panel hover-lift border-primary/20 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Target className="w-24 h-24 text-primary" />
              </div>
              <CardContent className="p-6 relative z-10">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Total Volume</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-5xl font-black gradient-text">{reportData.kpis.total_assigned}</h3>
                  <span className="text-sm text-primary font-medium mb-1 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> tasks
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-panel hover-lift border-green-500/20 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <CheckCircle className="w-24 h-24 text-green-500" />
              </div>
              <CardContent className="p-6 relative z-10">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Efficiency</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-5xl font-black text-green-500 dark:text-green-400">{reportData.kpis.total_completed}</h3>
                  <span className="text-sm text-green-500 font-medium mb-1">resolved</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel hover-lift border-amber-500/20 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock className="w-24 h-24 text-amber-500" />
              </div>
              <CardContent className="p-6 relative z-10">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Friction</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-5xl font-black text-amber-500 dark:text-amber-400">{reportData.kpis.total_delayed}</h3>
                  <span className="text-sm text-amber-500 font-medium mb-1">delayed</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel hover-lift border-red-500/20 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <AlertTriangle className="w-24 h-24 text-red-500" />
              </div>
              <CardContent className="p-6 relative z-10">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Critical Blockers</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-5xl font-black text-red-500 dark:text-red-400">{reportData.kpis.total_issues}</h3>
                  <span className="text-sm text-red-500 font-medium mb-1">issues</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 glass-panel border-border/50 hover-glow">
              <CardHeader className="pb-2 border-b border-border/30">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" /> Velocity Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportData.trend_data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="completed" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorCompleted)" 
                        activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-border/50 hover-glow flex flex-col">
              <CardHeader className="pb-2 border-b border-border/30">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-accent" /> Competency Matrix
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 flex-1 flex flex-col items-center justify-center relative">
                {radarData.length > 0 ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-radial from-accent/10 to-transparent pointer-events-none rounded-full blur-xl scale-75" />
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Score" dataKey="A" stroke="hsl(var(--accent))" strokeWidth={2} fill="hsl(var(--accent))" fillOpacity={0.4} />
                          <Tooltip content={<CustomTooltip />} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground text-sm flex items-center justify-center h-full">Insufficient data for matrix</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="glass-panel border-border/50 hover-glow">
              <CardHeader className="pb-2 border-b border-border/30">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="h-5 w-5 text-amber-500" /> Priority Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[280px] w-full flex justify-center items-center">
                  {priorityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={priorityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={95}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                          cornerRadius={4}
                        >
                          {priorityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[index % PRIORITY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-muted-foreground text-sm flex justify-center items-center h-full">No priority data</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 glass-panel border-border/50 hover-glow">
              <CardHeader className="pb-2 border-b border-border/30">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" /> Personnel Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[280px] w-full">
                  {comparisonData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} opacity={0.3} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
                        <Tooltip cursor={{fill: 'hsl(var(--muted)/0.4)'}} content={<CustomTooltip />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={24} />
                        <Bar dataKey="delayed" name="Delayed" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm space-y-3">
                      <Users className="h-10 w-10 opacity-20" />
                      <p>Select multiple personnel to enable comparison</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-panel-heavy border-primary/20 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-6 w-6 text-primary" /> Intelligence Grid
                </CardTitle>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2 bg-background/50 border border-border/50 rounded-lg p-1">
                    <Filter className="w-4 h-4 text-muted-foreground ml-2" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8 w-[130px] border-0 bg-transparent shadow-none focus:ring-0 text-xs font-medium">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="glass-panel">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                        <SelectItem value="delayed">Delayed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 bg-background/50 border border-border/50 rounded-lg p-1">
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="h-8 w-[110px] border-0 bg-transparent shadow-none focus:ring-0 text-xs font-medium">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent className="glass-panel">
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="p1">P1 - Critical</SelectItem>
                        <SelectItem value="p2">P2 - High</SelectItem>
                        <SelectItem value="p3">P3 - Medium</SelectItem>
                        <SelectItem value="p4">P4 - Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border/50 bg-background/30">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-5 py-4 font-semibold tracking-wider">Reference</th>
                      <th className="px-5 py-4 font-semibold tracking-wider">Objective</th>
                      <th className="px-5 py-4 font-semibold tracking-wider">Operative</th>
                      <th className="px-5 py-4 font-semibold tracking-wider">State</th>
                      <th className="px-5 py-4 font-semibold tracking-wider">Level</th>
                      <th className="px-5 py-4 font-semibold tracking-wider">Initiated</th>
                      <th className="px-5 py-4 font-semibold tracking-wider">Deadline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {currentTasks.map((task: any) => (
                      <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">#{task.id}</td>
                        <td className="px-5 py-3 font-medium">{task.title}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                              {(task.assignee || 'U')[0].toUpperCase()}
                            </div>
                            <span className="text-muted-foreground">{task.assignee || 'Unassigned'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border
                            ${task.status === 'done' || task.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                              task.status === 'blocked' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                              task.status === 'delayed' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                              'bg-blue-500/10 text-blue-500 border-blue-500/20'}
                          `}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant="outline" className={`
                            ${task.priority?.toLowerCase() === 'p1' ? 'border-red-500/50 text-red-500' : 
                              task.priority?.toLowerCase() === 'p2' ? 'border-orange-500/50 text-orange-500' :
                              task.priority?.toLowerCase() === 'p3' ? 'border-amber-500/50 text-amber-500' :
                              'border-blue-500/50 text-blue-500'}
                          `}>
                            {task.priority || 'N/A'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{task.created_at}</td>
                        <td className="px-5 py-3 text-muted-foreground">{task.due_date || 'N/A'}</td>
                      </tr>
                    ))}
                    {currentTasks.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <Search className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-medium">No matching intelligence found.</p>
                            <p className="text-xs opacity-70 mt-1">Adjust your filters to see more results.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border/30">
                  <div className="text-xs text-muted-foreground font-medium bg-background/50 px-3 py-1.5 rounded-md border border-border/50">
                    Displaying {indexOfFirstTask + 1} - {Math.min(indexOfLastTask, totalTasks)} of {totalTasks}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(p => p - 1); }}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "hover:bg-primary/10"}
                          />
                        </PaginationItem>
                        
                        {getPageNumbers().map((pageNum, idx) => (
                          <PaginationItem key={idx}>
                            {pageNum === 'ellipsis' ? (
                              <PaginationEllipsis />
                            ) : (
                              <PaginationLink
                                href="#"
                                isActive={currentPage === pageNum}
                                onClick={(e) => { e.preventDefault(); setCurrentPage(pageNum as number); }}
                                className={currentPage === pageNum ? "bg-primary text-primary-foreground border-primary" : "hover:bg-primary/10"}
                              >
                                {pageNum}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        ))}

                        <PaginationItem>
                          <PaginationNext 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setCurrentPage(p => p - 1); }}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "hover:bg-primary/10"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={graphModalOpen} onOpenChange={setGraphModalOpen}>
        <DialogContent className="sm:max-w-[600px] glass-panel-heavy border-primary/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold gradient-text">
              <LineChartIcon className="h-6 w-6 text-primary" />
              Operative Analysis: {graphUser?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-wrap items-center gap-4 bg-background/40 p-4 rounded-xl border border-border/50">
              <div className="space-y-1.5 flex-1 min-w-[120px]">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Start Horizon</Label>
                <Input type="date" className="h-9 text-xs bg-background/50 border-border/50" value={graphStartDate} onChange={e => setGraphStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5 flex-1 min-w-[120px]">
                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">End Horizon</Label>
                <Input type="date" className="h-9 text-xs bg-background/50 border-border/50" value={graphEndDate} onChange={e => setGraphEndDate(e.target.value)} />
              </div>
              <div className="mt-6">
                {(graphStartDate || graphEndDate) && (
                  <Button variant="outline" size="sm" className="h-9 text-xs border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => { setGraphStartDate(''); setGraphEndDate(''); }}>Clear</Button>
                )}
              </div>
            </div>
            <div className="h-[300px] w-full p-2 bg-background/20 rounded-xl border border-border/30">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} dx={-10} />
                  <Tooltip cursor={{fill: 'hsl(var(--muted)/0.3)'}} content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60}>
                    {graphData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReports;
