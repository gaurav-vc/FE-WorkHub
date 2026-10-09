import { useEffect, useState } from "react";
import {
  PartyPopper,
  Cake,
  Heart,
  Star,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

interface Kudos {
  id: string;
  from: string;
  fromInitials: string;
  to: string;
  toInitials: string;
  message: string;
  category: string;
  reactions: number;
  time: string;
}

interface Birthday {
  id: string;
  name: string;
  initials: string;
  department: string;
  date_string: string;
  day: number;
}

const categoryIcons: Record<string, React.ReactNode> = {
  "Team Player": <Heart className="h-4 w-4 text-destructive" />,
  "Innovation": <Star className="h-4 w-4 text-warning" />,
  "Above & Beyond": <PartyPopper className="h-4 w-4 text-primary" />,
  "Mentorship": <Heart className="h-4 w-4 text-accent" />,
};



export default function RecognitionBirthdays() {
  const { token, username } = useAuth();
  const [kudos, setKudos] = useState<Kudos[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [recipientFilter, setRecipientFilter] = useState<string>("All");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ to: "", message: "", category: "Team Player" });

  const fetchData = async () => {
    try {
      const kRes = await fetch(`${API_BASE}/recognition/kudos/`, { headers: { Authorization: `Bearer ${token}` } });
      if (kRes.ok) {
        const kData = await kRes.json();
        const mappedKudos = kData.map((k: any) => ({
          id: k.id.toString(),
          from: k.fromName,
          fromInitials: k.fromInitials,
          to: k.toName,
          toInitials: k.toInitials,
          message: k.message,
          category: k.category,
          reactions: k.reactions,
          time: k.time
        }));
        setKudos(mappedKudos);
      }
      const bRes = await fetch(`${API_BASE}/recognition/birthdays/`, { headers: { Authorization: `Bearer ${token}` } });
      if (bRes.ok) {
        setBirthdays(await bRes.json());
      }
      const eRes = await fetch(`${API_BASE}/directory/employees/`, { headers: { Authorization: `Bearer ${token}` } });
      if (eRes.ok) {
        setEmployees(await eRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const sendKudos = async () => {
    if (!form.to.trim() || !form.message.trim()) return;
    
    const payload = {
      fromName: username || "User",
      fromInitials: username ? username.substring(0, 2).toUpperCase() : "U",
      toName: form.to,
      toInitials: form.to.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
      message: form.message,
      category: form.category
    };

    try {
      const res = await fetch(`${API_BASE}/recognition/kudos/`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fromName: payload.fromName,
          fromInitials: payload.fromInitials,
          toName: payload.toName,
          toInitials: payload.toInitials,
          message: payload.message,
          category: payload.category
        })
      });
      if (res.ok) {
        toast.success("Kudos sent!");
        setShowCreate(false);
        setForm({ to: "", message: "", category: "Team Player" });
        fetchData();
      } else {
        toast.error("Failed to send kudos");
      }
    } catch (err) {
      toast.error("Error occurred");
    }
  };

  const reactToKudos = async (id: string) => {
    const kudo = kudos.find(k => k.id === id);
    if (!kudo) return;
    try {
      const res = await fetch(`${API_BASE}/recognition/kudos/${id}/`, {
        method: "PATCH",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reactions: kudo.reactions + 1 })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {}
  };

  const deleteKudos = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/recognition/kudos/${id}/`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {}
  };

  return (
    <div className="space-y-8 animate-fade-in p-2 sm:p-6 lg:p-8 relative max-w-7xl mx-auto">
      {/* Ambient background light */}
      <div className="fixed top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse delay-1000" />

      {/* Header */}
      <div className="relative rounded-3xl p-8 overflow-hidden bg-gradient-to-br from-card/80 to-background/50 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-indigo-500 flex items-center gap-3">
              <PartyPopper className="h-10 w-10 text-primary animate-bounce-slow" /> Recognition & Birthdays
            </h1>
            <p className="text-muted-foreground font-medium pl-14 text-lg">Celebrate achievements and team birthdays</p>
          </div>
          <PermissionGuard requires="create">
            <Button size="lg" className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white gap-2 px-8 h-14 text-lg font-semibold rounded-2xl shadow-lg shadow-primary/25 hover:-translate-y-1 transition-all w-full sm:w-auto" onClick={() => setShowCreate(true)}>
              <Send className="h-5 w-5" /> Send Kudos
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Kudos Wall */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-white/10 shadow-sm">
            <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Star className="h-6 w-6 text-warning" /> Recognition Wall
            </h2>
            <Select value={recipientFilter} onValueChange={setRecipientFilter}>
              <SelectTrigger className="w-full sm:w-[220px] h-11 bg-background/50 border-white/10 rounded-xl focus-visible:ring-primary/50"><SelectValue placeholder="Filter by Recipient" /></SelectTrigger>
              <SelectContent className="rounded-xl border-white/10 backdrop-blur-xl">
                <SelectItem value="All">All Recipients</SelectItem>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pr-2 space-y-5">
            {kudos.filter(k => recipientFilter === "All" || k.to === recipientFilter).map((k, index) => (
              <Card key={k.id} className="group relative bg-card/60 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-500 overflow-hidden rounded-3xl animate-in fade-in slide-in-from-bottom-8" style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}>
                <div className="absolute top-0 left-0 w-1.5 bg-gradient-to-b from-primary via-purple-500 to-transparent h-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row gap-5 items-start">
                    <Avatar className="h-14 w-14 shrink-0 border-2 border-primary/20 shadow-sm group-hover:scale-110 transition-transform duration-500">
                      <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary to-purple-600 text-white">{k.fromInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap bg-background/50 p-3 rounded-2xl border border-white/5 w-fit">
                        <span className="text-base font-bold text-foreground">{k.from}</span>
                        <span className="text-sm font-medium text-muted-foreground italic">recognized</span>
                        <span className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">{k.to}</span>
                        <Badge variant="secondary" className="text-xs px-2.5 py-1 gap-1.5 ml-2 bg-card border-border shadow-sm rounded-full">{categoryIcons[k.category]} {k.category}</Badge>
                      </div>
                      <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-medium pl-1">
                        "{k.message}"
                      </p>
                      <div className="flex items-center gap-4 pt-2">
                        <Button size="sm" variant="outline" className="text-sm gap-2 h-9 rounded-xl hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-colors" onClick={() => reactToKudos(k.id)}>
                          <Heart className="h-4 w-4 text-destructive" /> {k.reactions}
                        </Button>
                        <span className="text-xs font-medium text-muted-foreground/70">{k.time}</span>
                        <PermissionGuard requires="delete">
                          <Button size="sm" variant="ghost" className="text-xs h-9 rounded-xl opacity-0 group-hover:opacity-100 ml-auto text-destructive hover:bg-destructive/10" onClick={() => deleteKudos(k.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Birthday Sidebar */}
        <div className="space-y-6">
          <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-white/10 bg-card/60 backdrop-blur-xl rounded-3xl overflow-hidden sticky top-6">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent to-pink-500"></div>
            <CardHeader className="pb-4 pt-6 bg-gradient-to-b from-accent/5 to-transparent">
              <CardTitle className="text-xl font-display font-bold flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-xl">
                  <Cake className="h-5 w-5 text-accent animate-bounce-slow" />
                </div>
                Upcoming Birthdays
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6">
              {birthdays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm font-medium">No upcoming birthdays</div>
              ) : (
                birthdays.map((b) => (
                  <div key={b.id} className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-background/50 border border-transparent hover:border-white/5 transition-all duration-300">
                    <Avatar className="h-12 w-12 border-2 border-accent/20 shadow-sm group-hover:scale-110 transition-transform">
                      <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-accent to-pink-500 text-white">{b.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{b.name}</p>
                      <p className="text-xs font-medium text-muted-foreground truncate">{b.department}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent border-accent/20 shrink-0">{b.date_string}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md rounded-3xl border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">Send Recognition</DialogTitle></DialogHeader>
          <div className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Recipient</Label>
              <Select value={form.to} onValueChange={(v) => setForm({ ...form, to: v })}>
                <SelectTrigger className="w-full h-12 rounded-xl bg-background/50 border-white/10 focus-visible:ring-primary/50"><SelectValue placeholder="Who do you want to recognize?" /></SelectTrigger>
                <SelectContent className="rounded-xl border-white/10 backdrop-blur-xl">
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.name} className="rounded-lg">{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="w-full h-12 rounded-xl bg-background/50 border-white/10 focus-visible:ring-primary/50"><SelectValue placeholder="Select Category" /></SelectTrigger>
                <SelectContent className="rounded-xl border-white/10 backdrop-blur-xl">
                  <SelectItem value="Team Player">Team Player</SelectItem>
                  <SelectItem value="Innovation">Innovation</SelectItem>
                  <SelectItem value="Above & Beyond">Above & Beyond</SelectItem>
                  <SelectItem value="Mentorship">Mentorship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Message</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="What did they do that's awesome?" rows={4} className="rounded-xl bg-background/50 border-white/10 focus-visible:ring-primary/50 text-base" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <DialogClose asChild><Button variant="outline" className="rounded-xl h-11 px-6">Cancel</Button></DialogClose>
            <Button className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white rounded-xl h-11 px-6 shadow-lg shadow-primary/25" onClick={sendKudos}>Send Kudos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
