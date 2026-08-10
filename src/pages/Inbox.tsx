import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Mail, ArrowRight, RefreshCw, Inbox as InboxIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Inbox() {
  const { token } = useAuth();
  const [emails, setEmails] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, [token]);

  useEffect(() => {
    fetchEmails(selectedAccountId);
  }, [selectedAccountId, token]);

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_BASE}/integrations/connected-accounts/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data[0].id.toString());
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmails = async (accountId: string) => {
    setLoading(true);
    try {
      const url = accountId ? `${API_BASE}/integrations/emails/?account_id=${accountId}` : `${API_BASE}/integrations/emails/`;
      const res = await fetch(url, {
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

  const handleConnect = async (provider: 'microsoft' | 'google') => {
    try {
      const res = await fetch(`${API_BASE}/integrations/${provider}/login/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || `Could not initiate ${provider} connection`);
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
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Unified Inbox</h1>
              <p className="text-sm text-slate-500 font-medium">Sync and manage all your connected email accounts</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {accounts.length > 0 && (
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-full sm:w-[250px] bg-white shadow-sm border-slate-200">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Accounts</SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      <div className="flex items-center gap-2">
                        {acc.provider === 'google' ? (
                          <span className="text-red-500 text-xs font-bold bg-red-50 px-1 rounded">G</span>
                        ) : (
                          <span className="text-blue-500 text-xs font-bold bg-blue-50 px-1 rounded">M</span>
                        )}
                        <span className="truncate max-w-[150px]">{acc.account_email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button variant="outline" onClick={() => fetchEmails(selectedAccountId)} disabled={loading} className="bg-white shadow-sm border-slate-200 hidden sm:flex shrink-0">
              <RefreshCw className={cn("h-4 w-4 mr-2 text-slate-500", loading && "animate-spin")} />
              Refresh
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-[#0f172a] hover:bg-[#1e293b] text-white shadow-md shrink-0">
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleConnect('google')} className="cursor-pointer py-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-50 p-1.5 rounded-md">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0112 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z" />
                        <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 01-6.723-4.823l-4.04 3.067A11.965 11.965 0 0012 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z" />
                        <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z" />
                        <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 014.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 000 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z" />
                      </svg>
                    </div>
                    <span className="font-medium text-slate-700">Google Workspace</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnect('microsoft')} className="cursor-pointer py-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-1.5 rounded-md">
                      <Mail className="w-4 h-4 text-[#0078D4]" />
                    </div>
                    <span className="font-medium text-slate-700">Microsoft Outlook</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                  <InboxIcon className="h-10 w-10 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">No emails found</h3>
                <p className="text-slate-500 text-center max-w-sm mt-3 leading-relaxed">
                  {accounts.length === 0 
                    ? "Connect your Google or Microsoft account to securely sync your recent emails." 
                    : "No recent emails found in this account."}
                </p>
                {accounts.length === 0 && (
                  <Button onClick={() => handleConnect('google')} className="mt-8 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-full px-8 shadow-md">
                    Connect Account
                  </Button>
                )}
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
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            "text-base truncate", 
                            !email.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                          )}>
                            {email.subject || '(No Subject)'}
                          </h4>
                          {/* Optional indicator of which account this belongs to if "All Accounts" is selected */}
                          {!selectedAccountId && accounts.find(a => a.id === email.account_id) && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {accounts.find(a => a.id === email.account_id)?.provider === 'google' ? 'Google' : 'Outlook'}
                            </span>
                          )}
                        </div>
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
                          View Email <ArrowRight className="h-4 w-4 ml-1.5" />
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
