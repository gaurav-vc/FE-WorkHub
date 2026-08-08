import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Mail, ArrowRight, Check, X, RefreshCw, Sparkles, Inbox as InboxIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Inbox() {
  const { token } = useAuth();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmails();
  }, [token]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/integrations/emails/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load emails");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await fetch(`${API_BASE}/integrations/microsoft/login/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Could not initiate connection");
      }
    } catch (e) {
      toast.error("Connection error");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="p-8 max-w-6xl mx-auto w-full flex-1">
        
        {/* Premium Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-xl shadow-sm border border-blue-200">
              <InboxIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Inbox</h1>
              <p className="text-sm text-slate-500 font-medium">Sync and manage your Microsoft Outlook emails</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchEmails} disabled={loading} className="bg-white shadow-sm border-slate-200">
              <RefreshCw className={cn("h-4 w-4 mr-2 text-slate-500", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button onClick={handleConnect} className="bg-[#0078D4] hover:bg-[#0078D4]/90 text-white shadow-md">
              <Mail className="h-4 w-4 mr-2" />
              Connect Outlook
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 mb-4">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              </div>
              <p className="text-sm font-medium text-slate-500">Syncing your emails...</p>
            </div>
          ) : emails.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 bg-white/50 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 border border-blue-100">
                  <Mail className="h-10 w-10 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">No emails synced yet</h3>
                <p className="text-slate-500 text-center max-w-sm mt-3 leading-relaxed">
                  Connect your Outlook account to securely sync your recent emails. They will automatically refresh in the background.
                </p>
                <Button onClick={handleConnect} className="mt-8 bg-[#0078D4] hover:bg-[#0078D4]/90 text-white rounded-full px-8 shadow-md">
                  Connect Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {emails.map(email => (
                <Card key={email.id} className={cn(
                  "transition-all duration-200 hover:shadow-md border-l-4 group overflow-hidden bg-white", 
                  !email.is_read ? 'border-l-blue-500' : 'border-l-slate-200'
                )}>
                  <CardContent className="p-5 flex flex-col sm:flex-row items-start gap-4">
                    <div className="mt-0.5 bg-slate-100 p-2.5 rounded-full shrink-0 group-hover:bg-blue-50 transition-colors">
                      <Mail className={cn("h-4 w-4", !email.is_read ? "text-blue-500" : "text-slate-400")} />
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                        <h4 className={cn(
                          "text-base truncate pr-4", 
                          !email.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                        )}>
                          {email.subject || '(No Subject)'}
                        </h4>
                        <span className="text-xs font-medium text-slate-400 whitespace-nowrap bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 shrink-0">
                          {email.received_date ? format(new Date(email.received_date), 'MMM d, yyyy h:mm a') : ''}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-slate-600 mb-2 truncate">
                        {email.sender_name} <span className="text-slate-400 font-normal">&lt;{email.sender_email}&gt;</span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                        {email.body_preview}
                      </p>
                    </div>
                    {email.web_link && (
                      <Button variant="outline" size="sm" asChild className="shrink-0 mt-4 sm:mt-0 opacity-0 group-hover:opacity-100 transition-opacity self-center rounded-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200">
                        <a href={email.web_link} target="_blank" rel="noopener noreferrer">
                          View in Outlook <ArrowRight className="h-4 w-4 ml-1.5" />
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
