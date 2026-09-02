import React, { useState, useEffect } from 'react';
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, FileText, CheckCircle, Clock, AlertTriangle, Users } from 'lucide-react';
import { fetchEmployeeReport, EmployeeStats } from '@/api/reports';
import { apiClient } from '@/api/client';
import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';

const AdminReports = () => {
  const [employees, setEmployees] = useState<{id: number, name: string}[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [reportData, setReportData] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('30d'); // '30d', '6m', '1y', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
      filename: `employee_report_${selectedEmployees.join('_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
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
    link.setAttribute('download', `employee_report_${selectedEmployees.join('_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // Pagination Logic
  const totalTasks = reportData?.raw_tasks?.length || 0;
  const totalPages = Math.ceil(totalTasks / itemsPerPage);
  
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const indexOfLastTask = currentPage * itemsPerPage;
  const indexOfFirstTask = indexOfLastTask - itemsPerPage;
  const currentTasks = reportData?.raw_tasks?.slice(indexOfFirstTask, indexOfLastTask) || [];

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
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

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Employee Performance Reports
          </h1>
          <p className="text-muted-foreground mt-1">Analyze productivity and identify bottlenecks for specific team members.</p>
        </div>
        
        {reportData && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex items-center gap-2 shadow-md">
                <Download className="h-4 w-4" /> Download Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadPdf}>
                Download as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadCsv}>
                Download as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Card className="shadow-md border-t-4 border-t-primary">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2 md:col-span-1">
              <Label>Select Employee(s)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal text-left h-10 px-3">
                    {selectedEmployees.length === 0 ? "Select employees..." : `${selectedEmployees.length} selected`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="select-all" 
                        checked={selectedEmployees.length === employees.length && employees.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEmployees(employees.map(e => e.id.toString()));
                          } else {
                            setSelectedEmployees([]);
                          }
                        }}
                      />
                      <label htmlFor="select-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        Select All
                      </label>
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto p-2">
                    {employees.map((emp) => {
                      const empId = emp.id.toString();
                      return (
                        <div key={empId} className="flex items-center space-x-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
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
              <Label>Quick Filters</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="1y">Last 1 Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            )}
            
            {dateFilter === 'custom' && (
              <Button onClick={loadReport} disabled={loading} className="w-full">
                {loading ? 'Loading...' : 'Apply Filter'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <div id="report-dashboard" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-primary/5 border-primary/20 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tasks Assigned</p>
                    <h3 className="text-3xl font-bold text-foreground mt-1">{reportData.kpis.total_assigned}</h3>
                  </div>
                  <div className="p-3 bg-primary/20 rounded-full text-primary">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-500/5 border-green-500/20 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <h3 className="text-3xl font-bold text-foreground mt-1">{reportData.kpis.total_completed}</h3>
                  </div>
                  <div className="p-3 bg-green-500/20 rounded-full text-green-600 dark:text-green-400">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-500/5 border-amber-500/20 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Delayed</p>
                    <h3 className="text-3xl font-bold text-foreground mt-1">{reportData.kpis.total_delayed}</h3>
                  </div>
                  <div className="p-3 bg-amber-500/20 rounded-full text-amber-600 dark:text-amber-400">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-500/5 border-red-500/20 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Blocked / Issues</p>
                    <h3 className="text-3xl font-bold text-foreground mt-1">{reportData.kpis.total_issues}</h3>
                  </div>
                  <div className="p-3 bg-red-500/20 rounded-full text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm border-border">
              <CardHeader>
                <CardTitle>Completion Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.trend_data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                      />
                      <Line type="monotone" dataKey="completed" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border-border">
              <CardHeader>
                <CardTitle>Task Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: reportData.kpis.total_completed },
                          { name: 'Delayed', value: reportData.kpis.total_delayed },
                          { name: 'Issues', value: reportData.kpis.total_issues },
                          { name: 'Pending', value: reportData.kpis.total_assigned - reportData.kpis.total_completed - reportData.kpis.total_delayed - reportData.kpis.total_issues }
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[0,1,2,3].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle>Detailed Task Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Task ID</th>
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Assignee</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Priority</th>
                      <th className="px-4 py-3 font-medium">Created Date</th>
                      <th className="px-4 py-3 font-medium">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTasks.map((task: any) => (
                      <tr key={task.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">#{task.id}</td>
                        <td className="px-4 py-3 font-medium">{task.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{task.assignee || 'Unassigned'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold
                            ${task.status === 'done' || task.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              task.status === 'blocked' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              task.status === 'delayed' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}
                          `}>
                            {task.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">{task.priority}</td>
                        <td className="px-4 py-3">{task.created_at}</td>
                        <td className="px-4 py-3 text-muted-foreground">{task.due_date || 'N/A'}</td>
                      </tr>
                    ))}
                    {currentTasks.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          No tasks found for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground font-medium">
                    Showing {indexOfFirstTask + 1} to {Math.min(indexOfLastTask, totalTasks)} of {totalTasks} tasks
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) setCurrentPage(p => p - 1);
                            }}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
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
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(pageNum as number);
                                }}
                              >
                                {pageNum}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        ))}

                        <PaginationItem>
                          <PaginationNext 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) setCurrentPage(p => p + 1);
                            }}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>

                    <div className="hidden sm:flex items-center gap-2 border-l border-border pl-4">
                      <Select value={itemsPerPage.toString()} onValueChange={(val) => {
                        setItemsPerPage(Number(val));
                        setCurrentPage(1);
                      }}>
                        <SelectTrigger className="w-[110px] h-9 bg-background">
                          <SelectValue placeholder="10 per page" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 per page</SelectItem>
                          <SelectItem value="20">20 per page</SelectItem>
                          <SelectItem value="50">50 per page</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
