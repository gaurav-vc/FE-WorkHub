import { useState, useEffect } from "react";
import {
  Search,
  Users,
  MapPin,
  Mail,
  Phone,
  Building,
  ArrowLeft,
  Download,
  MessageCircle,
  Grid3X3,
  List,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  status: "active" | "away" | "busy" | "offline";
  joinedDate: string;
  date_of_birth?: string;
  manager: string;
  skills: string[];
}

// Departments will be fetched dynamically from backend

const statusColors: Record<string, string> = {
  active: "bg-success",
  away: "bg-warning",
  busy: "bg-destructive",
  offline: "bg-muted-foreground",
};

export default function EmployeeDirectory() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<string[]>(["All"]);

  
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    name: "", role: "", department: "Engineering", email: "", phone: "", location: "", joinedDate: "", date_of_birth: "", manager: "", skills: ""
  });

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE}/directory/employees/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((e: any) => ({
          id: e.id.toString(),
          name: e.name,
          initials: e.initials || e.name.substring(0, 2).toUpperCase(),
          role: e.role,
          department: e.department,
          email: e.email,
          phone: e.phone,
          location: e.location,
          status: e.status || "active",
          joinedDate: e.joined_date || e.joinedDate,
          manager: e.manager,
          skills: e.skills || []
        }));
        setEmployees(mapped);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, [token]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE}/rbac/roles/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const deptNames = data.map((d: any) => d.name);
        setDepartments(["All", ...deptNames]);
      }
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  const handleAddEmployee = async () => {
    if (!form.name || !form.email) {
      toast.error("Name and Email are required");
      return;
    }
    const initials = form.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
    const payload = {
      name: form.name,
      initials: initials,
      role: form.role || "Employee",
      department: form.department || "General",
      email: form.email,
      phone: form.phone || "N/A",
      location: form.location || "Remote",
      joinedDate: form.joinedDate || new Date().toISOString().split('T')[0],
      date_of_birth: form.date_of_birth || null,
      manager: form.manager,
      skills: form.skills.split(",").map(s => s.trim()).filter(s => s),
      status: "active"
    };

    try {
      const res = await fetch(`${API_BASE}/directory/employees/`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success("Employee added to directory");
        setShowAddForm(false);
        setForm({ name: "", role: "", department: "Engineering", email: "", phone: "", location: "", joinedDate: "", date_of_birth: "", manager: "", skills: "" });
        fetchEmployees();
      } else {
        const errData = await res.json();
        toast.error(errData.detail || "Failed to add employee");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleDownloadVCard = (e: Employee) => {
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${e.name}
N:${e.name.split(" ").reverse().join(";")};;;
EMAIL;TYPE=INTERNET;TYPE=WORK:${e.email}
TEL;TYPE=CELL:${e.phone}
TITLE:${e.role}
ORG:${e.department}
END:VCARD`;

    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${e.name.replace(/\\s+/g, '_')}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filtered = employees.filter((e) => {
    const matchDept = department === "All" || (e.role || "").toLowerCase() === department.toLowerCase();
    const matchSearch = !search || (e.name || "").toLowerCase().includes(search.toLowerCase()) || (e.role || "").toLowerCase().includes(search.toLowerCase()) || (e.department || "").toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSearch;
  });

  if (selectedEmployee) {
    const e = selectedEmployee;
    return (
      <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
        <Button variant="ghost" onClick={() => setSelectedEmployee(null)} className="gap-1.5 text-muted-foreground -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back to directory
        </Button>
        <Card className="shadow-card overflow-hidden">
          <div className="h-24 gradient-primary" />
          <CardContent className="p-6 -mt-12">
            <div className="flex items-end gap-4 mb-6">
              <Avatar className="h-20 w-20 border-4 border-card shadow-lg">
                <AvatarFallback className="text-2xl font-display font-bold gradient-primary text-primary-foreground">{e.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-display font-bold text-foreground">{e.name}</h1>
                  <div className={`h-2.5 w-2.5 rounded-full ${statusColors[e.status]}`} />
                </div>
                <p className="text-sm text-muted-foreground">{e.role} · {e.department}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleDownloadVCard(e)} className="gradient-primary text-primary-foreground gap-1.5 text-xs"><Download className="h-3.5 w-3.5" /> vCard</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                  <p className="text-sm text-foreground">{e.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</p>
                  <p className="text-sm text-foreground">{e.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</p>
                  <p className="text-sm text-foreground">{e.location}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Building className="h-3 w-3" /> Department</p>
                  <p className="text-sm text-foreground">{e.department}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Users className="h-3 w-3" /> Reports to</p>
                  <p className="text-sm text-foreground">{e.manager}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Joined</p>
                  <p className="text-sm text-foreground">{e.joinedDate}</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {e.skills.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shadow-sm">
              <Users className="h-6 w-6" />
            </div>
            Employee Directory
          </h1>
          <p className="text-slate-500 mt-2 text-[15px] font-medium ml-1">Find and connect with colleagues across the organization</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-2 shadow-lg shadow-blue-500/25 h-11 px-6 rounded-full transition-all hover:scale-105" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4" /> Add Employee
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in duration-700 delay-150">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search by name, role, or department..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-11 h-12 bg-slate-50/50 border-0 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl text-[15px]" />
        </div>
        <div className="h-8 w-px bg-slate-200 self-center hidden sm:block" />
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-full sm:w-[220px] h-12 bg-transparent border-0 focus:ring-0 shadow-none font-medium text-slate-700">
            <div className="flex items-center gap-2 text-slate-500"><Building className="h-4 w-4" /><SelectValue /></div>
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d} value={d} className="font-medium">{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="h-8 w-px bg-slate-200 self-center hidden sm:block" />
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl self-center">
          <Button size="icon" variant="ghost" className={`h-10 w-10 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`} onClick={() => setViewMode("grid")}><Grid3X3 className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className={`h-10 w-10 rounded-lg transition-all ${viewMode === "list" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`} onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      <p className="text-sm font-semibold text-slate-500 px-1 animate-in fade-in duration-700 delay-200">{filtered.length} employees found</p>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((emp, i) => (
            <Card key={emp.id} className="relative overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-0 ring-1 ring-slate-200 transition-all duration-300 cursor-pointer group hover:-translate-y-1.5 animate-in zoom-in-95 fade-in slide-in-from-bottom-6" style={{ animationDelay: `${i * 70}ms`, animationFillMode: "both" }} onClick={() => setSelectedEmployee(emp)}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-6 text-center flex flex-col items-center">
                <div className="relative inline-block mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Avatar className="h-20 w-20 mx-auto border-4 border-white shadow-md">
                    <AvatarFallback className="text-xl font-display font-black bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700">{emp.initials}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white shadow-sm ${statusColors[emp.status]}`} />
                </div>
                <h3 className="text-[17px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{emp.name}</h3>
                <p className="text-[13px] font-medium text-slate-500 mt-1">{emp.role}</p>
                <Badge variant="secondary" className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] uppercase font-bold tracking-wider mt-3 px-3 py-1 shadow-sm">{emp.department}</Badge>
                <div className="flex items-center justify-center gap-1.5 mt-4 text-[12px] font-medium text-slate-400 bg-slate-50/50 w-full py-2 rounded-lg border border-slate-100/50">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />{emp.location}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="flex flex-col gap-3">
          {filtered.map((emp, i) => (
            <div key={emp.id} className="flex items-center gap-4 px-5 py-4 bg-white border border-slate-200/60 rounded-2xl hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5 transition-all duration-300 cursor-pointer group hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }} onClick={() => setSelectedEmployee(emp)}>
              <div className="relative group-hover:scale-105 transition-transform">
                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                  <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700">{emp.initials}</AvatarFallback>
                </Avatar>
                <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white shadow-sm ${statusColors[emp.status]}`} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p className="text-[15px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{emp.name}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[13px] font-medium text-slate-500">
                  <span>{emp.role}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span>{emp.department}</span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-[12px] font-semibold text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />{emp.location}
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors ml-2">
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="jane@company.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} placeholder="e.g. Software Engineer" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={form.department} onValueChange={(v) => setForm({...form, department: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {departments.filter(d => d !== "All").map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="e.g. New York, NY" />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({...form, date_of_birth: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Manager</Label>
              <Input value={form.manager} onChange={(e) => setForm({...form, manager: e.target.value})} placeholder="Manager Name" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Skills (comma separated)</Label>
              <Input value={form.skills} onChange={(e) => setForm({...form, skills: e.target.value})} placeholder="React, Node.js, Design" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAddEmployee}>Add Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
