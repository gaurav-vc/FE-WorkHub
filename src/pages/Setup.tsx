import React, { useState, useEffect } from "react";
import RoleBaseAccessPage from "./RoleAccess";
import UsersRoles from "./UsersRoles";
import SetupCourses from "./SetupCourses";
import SetupCertificates from "./SetupCertificates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Check, X, ShieldAlert, UserPlus, Calendar,
  CheckCircle2, Users, Shield, GraduationCap, FileBadge, Clock, Settings2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_BASE } from "@/config";

interface PendingUser { id: number; username: string; email: string; date_joined: string; }
interface RoleObj { id: number; name: string; description: string; }

function AccessRequestsTab() {
  const { token } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [rolesObjList, setRolesObjList] = useState<RoleObj[]>([]);
  const [approvalRoles, setApprovalRoles] = useState<Record<number, string>>({});
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPendingUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/pending-users/`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPendingUsers(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_BASE}/rbac/roles/`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data: RoleObj[] = await res.json();
        setRolesObjList(data.filter(r => r.name.toLowerCase() !== 'admin'));
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchPendingUsers(), fetchRoles()]);
      setLoading(false);
    };
    init();
    const interval = setInterval(() => { fetchPendingUsers(); }, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const handleApproveUser = async (userId: number) => {
    const roleId = approvalRoles[userId];
    if (!roleId) { toast.error('Please select a role'); return; }
    setApprovingId(userId);
    const res = await fetch(`${API_BASE}/auth/approve-user/${userId}/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', role_id: roleId })
    });
    if (res.ok) {
      toast.success('User approved & role assigned!');
      fetchPendingUsers();
      setApprovalRoles(p => { const n = { ...p }; delete n[userId]; return n; });
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to approve');
    }
    setApprovingId(null);
  };

  const handleDeclineUser = async (userId: number) => {
    const res = await fetch(`${API_BASE}/auth/approve-user/${userId}/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline' })
    });
    if (res.ok) { toast.success('User declined'); fetchPendingUsers(); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading registrations...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Pending Registrations</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Review and approve new employee account requests</p>
        </div>
        {pendingUsers.length > 0 && (
          <Badge className="bg-amber-100 text-amber-700 border border-amber-200 font-semibold">
            {pendingUsers.length} Pending
          </Badge>
        )}
      </div>

      {pendingUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-xl bg-muted/20">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <CheckCircle2 className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">All caught up!</h3>
          <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">No pending account registrations waiting for approval.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pendingUsers.map(u => (
            <Card key={u.id} className="border border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-11 w-11 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-amber-700">{u.username.substring(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{u.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mb-4">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>Requested {new Date(u.date_joined).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Assign Role
                  </label>
                  <Select value={approvalRoles[u.id] || ''} onValueChange={val => setApprovalRoles(p => ({ ...p, [u.id]: val }))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rolesObjList.map(r => <SelectItem key={r.id} value={String(r.id)} className="capitalize">{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!approvalRoles[u.id] || approvingId === u.id}
                    onClick={() => handleApproveUser(u.id)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    {approvingId === u.id ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/5"
                    onClick={() => handleDeclineUser(u.id)}
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const tabs = [
  { value: "users-roles",  label: "Users & Roles",          icon: Users },
  { value: "permissions",  label: "Role Permissions",        icon: Shield },
  { value: "requests",     label: "Pending Registrations",   icon: Clock },
  { value: "courses",      label: "Courses",                 icon: GraduationCap },
  { value: "certificates", label: "Certificates",            icon: FileBadge },
  { value: "settings",     label: "System Settings",         icon: Settings2 },
];

export default function SetupPage() {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border bg-background shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage access control, roles, pending approvals, courses and certificates
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users-roles" className="flex flex-col flex-1 min-h-0">
        {/* Tab Bar */}
        <div className="px-6 pt-4 border-b border-border bg-background shrink-0 overflow-x-auto">
          <TabsList className="h-auto bg-transparent p-0 gap-0 w-auto inline-flex">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="
                  relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-none border-b-2
                  border-transparent text-muted-foreground bg-transparent
                  data-[state=active]:border-primary data-[state=active]:text-primary
                  data-[state=active]:bg-transparent hover:text-foreground
                  transition-all duration-150 whitespace-nowrap
                "
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab Content — fills remaining height */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <TabsContent value="users-roles" className="m-0 p-6">
            <UsersRoles />
          </TabsContent>
          <TabsContent value="permissions" className="m-0 p-6">
            <RoleBaseAccessPage />
          </TabsContent>
          <TabsContent value="requests" className="m-0 p-6">
            <AccessRequestsTab />
          </TabsContent>
          <TabsContent value="courses" className="m-0 p-6">
            <SetupCourses />
          </TabsContent>
          <TabsContent value="certificates" className="m-0 p-6">
            <SetupCertificates />
          </TabsContent>
          <TabsContent value="settings" className="m-0 p-6">
            <SystemSettingsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function SystemSettingsTab() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    max_active_tasks: 4
  });
  const [departmentLimits, setDepartmentLimits] = useState<{ [key: string]: number }>({});
  const [employeeLimits, setEmployeeLimits] = useState<{ [key: string]: number }>({});
  
  // For new entries
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptLimit, setNewDeptLimit] = useState(4);
  const [newEmpId, setNewEmpId] = useState("");
  const [newEmpLimit, setNewEmpLimit] = useState(4);

  useEffect(() => {
    // Fetch employees for department/user lists
    fetch(`${API_BASE}/calendar/employees/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setEmployees(data))
      .catch(console.error);

    fetch(`${API_BASE}/auth/organizations/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) {
          setOrgId(data[0].id);
          const adv = data[0].advanced_settings || {};
          setSettings({
            max_active_tasks: adv.max_active_tasks || 4
          });
          setDepartmentLimits(adv.department_task_limits || {});
          setEmployeeLimits(adv.employee_task_limits || {});
        }
      })
      .catch(console.error);
  }, [token]);

  const uniqueDepartments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

  const handleSave = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/auth/organizations/${orgId}/`, { headers: { Authorization: `Bearer ${token}` } });
      const org = await r.json();
      
      const newSettings = { 
        ...org.advanced_settings, 
        max_active_tasks: Number(settings.max_active_tasks),
        department_task_limits: departmentLimits,
        employee_task_limits: employeeLimits
      };
      
      const res = await fetch(`${API_BASE}/auth/organizations/${orgId}/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ advanced_settings: newSettings })
      });
      if (res.ok) {
        toast.success("Settings saved successfully!");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-base font-semibold text-foreground">System Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Configure global application behaviors and limits.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task Queue Configuration</CardTitle>
          <CardDescription>Manage how many active tasks a user can have before they are queued.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-2">
            <Label htmlFor="maxTasks">Global Max Active Tasks Limit</Label>
            <Input 
              id="maxTasks" 
              type="number" 
              min={1} 
              max={50}
              value={settings.max_active_tasks} 
              onChange={e => setSettings({...settings, max_active_tasks: parseInt(e.target.value) || 1})}
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">Default limit for all users. If assigned more, tasks are queued.</p>
          </div>

          <div className="space-y-3">
            <Label>Department Overrides</Label>
            <div className="flex gap-2 max-w-md items-center">
              <Select value={newDeptName} onValueChange={setNewDeptName}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Select Dept" /></SelectTrigger>
                <SelectContent>
                  {uniqueDepartments.map(d => (
                    <SelectItem key={d as string} value={d as string}>{d as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" min={1} value={newDeptLimit} onChange={e => setNewDeptLimit(parseInt(e.target.value) || 1)} className="w-20" />
              <Button size="sm" variant="outline" onClick={() => {
                if (newDeptName) {
                  setDepartmentLimits(p => ({ ...p, [newDeptName]: newDeptLimit }));
                  setNewDeptName("");
                }
              }}>Add</Button>
            </div>
            {Object.entries(departmentLimits).length > 0 && (
              <div className="flex flex-wrap gap-2 max-w-md mt-2">
                {Object.entries(departmentLimits).map(([dept, limit]) => (
                  <Badge key={dept} variant="secondary" className="px-2 py-1 flex items-center gap-2">
                    {dept}: {limit}
                    <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => {
                      const newLimits = { ...departmentLimits };
                      delete newLimits[dept];
                      setDepartmentLimits(newLimits);
                    }} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Employee Overrides</Label>
            <div className="flex gap-2 max-w-md items-center">
              <Select value={newEmpId} onValueChange={setNewEmpId}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Select Employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" min={1} value={newEmpLimit} onChange={e => setNewEmpLimit(parseInt(e.target.value) || 1)} className="w-20" />
              <Button size="sm" variant="outline" onClick={() => {
                if (newEmpId) {
                  setEmployeeLimits(p => ({ ...p, [newEmpId]: newEmpLimit }));
                  setNewEmpId("");
                }
              }}>Add</Button>
            </div>
            {Object.entries(employeeLimits).length > 0 && (
              <div className="flex flex-wrap gap-2 max-w-md mt-2">
                {Object.entries(employeeLimits).map(([empId, limit]) => {
                  const emp = employees.find(e => e.id.toString() === empId);
                  return (
                    <Badge key={empId} variant="secondary" className="px-2 py-1 flex items-center gap-2">
                      {emp ? emp.name : `User #${empId}`}: {limit}
                      <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => {
                        const newLimits = { ...employeeLimits };
                        delete newLimits[empId];
                        setEmployeeLimits(newLimits);
                      }} />
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
          
          <Button onClick={handleSave} disabled={loading || !orgId}>
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
