import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Copy, Trash2, Calendar, MapPin, Clock } from 'lucide-react';
import { safeFormat as format } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_BASE } from "@/config";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

interface MOM {
  id: number;
  title: string;
  description: string;
  meeting_date: string;
  tags: string[];
  created_by_details: any;
  created_at: string;
}

export default function MOMList() {
  const [moms, setMoms] = useState<MOM[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [newClientName, setNewClientName] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newMeetingType, setNewMeetingType] = useState('');
  const [newPreparedBy, setNewPreparedBy] = useState('');
  const [newMeetingStatus, setNewMeetingStatus] = useState('scheduled');
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMOMs();
    fetchEmployees();
  }, [token]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/employees/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) { console.error("Error fetching employees:", error); }
  };

  const fetchMOMs = async () => {
    try {
      const res = await fetch(`${API_BASE}/mom/moms/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMoms(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/mom/moms/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          meeting_date: newDate,
          client_name: newClientName,
          site_name: newSiteName,
          location: newLocation,
          start_time: newStartTime || null,
          end_time: newEndTime || null,
          meeting_type: newMeetingType,
          prepared_by: newPreparedBy,
          meeting_status: newMeetingStatus,
          tags: []
        })
      });
      if (res.ok) {
        toast({ title: 'MOM created successfully' });
        setIsCreateOpen(false);
        setNewTitle('');
        setNewDesc('');
        setNewDate('');
        setNewClientName('');
        setNewSiteName('');
        setNewLocation('');
        setNewStartTime('');
        setNewEndTime('');
        setNewMeetingType('');
        setNewPreparedBy('');
        setNewMeetingStatus('scheduled');
        fetchMOMs();
      } else {
        toast({ title: 'Failed to create MOM', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error creating MOM', variant: 'destructive' });
    }
  };

  const handleClone = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/mom/moms/${id}/clone/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: 'MOM cloned successfully' });
        fetchMOMs();
      } else {
        toast({ title: 'Failed to clone MOM', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error cloning MOM', variant: 'destructive' });
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this MOM?')) return;
    try {
      const res = await fetch(`${API_BASE}/mom/moms/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: 'MOM deleted' });
        fetchMOMs();
      } else {
        toast({ title: 'Failed to delete MOM', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error deleting MOM', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Minutes of Meeting
          </h1>
          <p className="text-muted-foreground mt-1">Track and manage meeting outcomes and action items.</p>
        </div>
        
        <PermissionGuard requires="create">
          <Button className="gap-1.5 gradient-primary text-primary-foreground shadow-sm hover:shadow-md transition-shadow" onClick={() => navigate('/collaboration/moms/create')}>
            <Plus className="h-4 w-4" /> New MOM
          </Button>
        </PermissionGuard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {moms.map(mom => (
          <Card key={mom.id} className="shadow-card hover:shadow-md transition-all cursor-pointer overflow-hidden border-border group" onClick={() => navigate(`/collaboration/moms/${mom.id}`)}>
            <div className="h-1.5 w-full gradient-primary"></div>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display flex justify-between items-start group-hover:text-primary transition-colors">
                <span className="truncate pr-2">{mom.title}</span>
                <div className="flex gap-1 -mt-1 -mr-2">
                  <PermissionGuard requires="create">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleClone(e, mom.id)} title="Clone MOM">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                  <PermissionGuard requires="delete">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleDelete(e, mom.id)} title="Delete MOM">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                </div>
              </CardTitle>
              <div className="flex items-center text-xs text-muted-foreground gap-1 mt-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(mom.meeting_date + 'T12:00:00'), 'PP')}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {mom.description || "No description provided."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {mom.tags && mom.tags.length > 0 ? mom.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[10px]">{tag}</Badge>
                )) : (
                  <span className="text-xs text-muted-foreground/70 italic">No tags</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {moms.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/20">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-foreground">No Minutes of Meetings found.</p>
            <p className="text-sm mt-1">Create one to get started and track your actions.</p>
          </div>
        )}
      </div>
    </div>
  );
}
