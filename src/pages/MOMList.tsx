import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Copy, Trash2, Calendar, MapPin, Clock, Search } from 'lucide-react';
import { safeFormat as format } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_BASE } from "@/config";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PagedPagination } from "@/components/ui/PagedPagination";

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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
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

  const filteredMoms = moms.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredMoms.length / itemsPerPage) || 1;
  const currentMoms = filteredMoms.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-8 animate-fade-in p-4 md:p-8 w-full max-w-7xl mx-auto">
      {/* Header Section with subtle animated gradient background */}
      <div className="relative rounded-2xl p-6 overflow-hidden bg-gradient-to-br from-card/80 to-background/50 border border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-purple-600 flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary animate-bounce-slow" /> 
              Minutes of Meeting
            </h1>
            <p className="text-muted-foreground font-medium pl-11">Track and manage meeting outcomes and action items beautifully.</p>
          </div>
        
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-72 group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-xl blur-md transition-all duration-500 group-hover:blur-lg opacity-0 group-hover:opacity-100" />
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search MOMs..." 
                value={searchQuery} 
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
                className="relative pl-10 bg-background/50 border-white/10 shadow-inner h-11 rounded-xl focus-visible:ring-primary/50 transition-all backdrop-blur-sm" 
              />
            </div>
            <PermissionGuard requires="create">
              <Button 
                className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all duration-300 h-11 px-6 rounded-xl relative overflow-hidden group" 
                onClick={() => navigate('/collaboration/moms/create')}
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <Plus className="h-5 w-5 relative z-10 group-hover:rotate-90 transition-transform duration-300" /> 
                <span className="relative z-10 font-semibold">New MOM</span>
              </Button>
            </PermissionGuard>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {currentMoms.map((mom, index) => (
          <Card 
            key={mom.id} 
            className="group relative bg-card/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-500 cursor-pointer overflow-hidden rounded-2xl animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
            onClick={() => navigate(`/collaboration/moms/${mom.id}`)}
          >
            {/* Animated top border gradient */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-purple-500 to-blue-500 opacity-70 group-hover:opacity-100 group-hover:h-2 transition-all duration-300"></div>
            
            {/* Subtle background glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <CardHeader className="pb-3 pt-6 relative z-10">
              <CardTitle className="text-xl font-display flex justify-between items-start group-hover:text-primary transition-colors duration-300">
                <span className="truncate pr-2 font-bold">{mom.title}</span>
                <div className="flex gap-1 -mt-1 -mr-2 bg-background/50 rounded-full p-1 backdrop-blur-md border border-white/5 shadow-sm opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                  <PermissionGuard requires="create">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" onClick={(e) => handleClone(e, mom.id)} title="Clone MOM">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </PermissionGuard>
                  <PermissionGuard requires="delete">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={(e) => handleDelete(e, mom.id)} title="Delete MOM">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </PermissionGuard>
                </div>
              </CardTitle>
              <div className="flex items-center text-xs font-medium text-muted-foreground gap-2 mt-2 bg-muted/50 w-fit px-2.5 py-1 rounded-md border border-white/5">
                <Calendar className="h-3.5 w-3.5 text-primary/70" />
                {format(new Date(mom.meeting_date + 'T12:00:00'), 'PP')}
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <p className="text-sm text-muted-foreground/90 line-clamp-2 mb-5 leading-relaxed">
                {mom.description || "No description provided."}
              </p>
              <div className="flex flex-wrap gap-2">
                {mom.tags && mom.tags.length > 0 ? mom.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                    {tag}
                  </Badge>
                )) : (
                  <span className="text-xs text-muted-foreground/50 italic px-1">No tags</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredMoms.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/20">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-foreground">No Minutes of Meetings found.</p>
            <p className="text-sm mt-1">Create one to get started and track your actions.</p>
          </div>
        )}
      </div>

      <PagedPagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
}
