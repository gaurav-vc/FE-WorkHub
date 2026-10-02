import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Reply, Send, CornerUpLeft } from "lucide-react";
import { API_BASE } from "@/config";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface EmailViewerPanelProps {
  emailId: string | null;
  onClose: () => void;
  onReplied: () => void;
}

export function EmailViewerPanel({ emailId, onClose, onReplied }: EmailViewerPanelProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [replyMode, setReplyMode] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (emailId) {
      fetchDetails();
    } else {
      setDetails(null);
      setReplyMode(false);
      setReplyBody("");
    }
  }, [emailId]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/integrations/emails/${emailId}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDetails(data);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to load email details");
        onClose();
      }
    } catch (e) {
      toast.error("Network error");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/integrations/emails/${emailId}/reply/`, {
        method: "POST",
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: replyBody.replace(/\n/g, "<br>"),
          message_id_header: details.message_id_header,
          references: details.references,
          subject: details.subject,
          to: details.from, // replying back to the sender
          thread_id: details.thread_id
        })
      });
      
      if (res.ok) {
        toast.success("Reply sent successfully!");
        setReplyMode(false);
        setReplyBody("");
        onReplied();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to send reply");
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={!!emailId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl p-0 flex flex-col bg-white overflow-hidden shadow-2xl">
        {loading || !details ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            <SheetHeader className="p-6 border-b bg-slate-50/50">
              <SheetTitle className="text-xl font-bold leading-tight">{details.subject}</SheetTitle>
              <div className="flex items-start justify-between mt-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-slate-200 shadow-sm">
                    <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">
                      {(details.from.match(/([a-zA-Z])/)?.[1] || "?").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 text-sm">{details.from.split('<')[0]}</span>
                    <span className="text-xs text-slate-500">{details.from.match(/<([^>]+)>/)?.[1] || details.from}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs font-medium text-slate-400 bg-white px-2 py-1 rounded-md border shadow-sm">
                    {format(new Date(), 'MMM d, yyyy h:mm a')}
                  </span>
                  {!replyMode && (
                    <Button size="sm" onClick={() => setReplyMode(true)} className="bg-blue-600 hover:bg-blue-700 shadow-sm h-8 rounded-full px-4">
                      <Reply className="h-3.5 w-3.5 mr-1.5" /> Reply
                    </Button>
                  )}
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto bg-white relative group">
              {/* Using iframe to sandbox the HTML and prevent CSS bleeding */}
              <iframe
                title="Email Body"
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta charset="utf-8">
                      <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 24px; font-size: 14px; background: transparent; }
                        a { color: #2563eb; text-decoration: none; }
                        a:hover { text-decoration: underline; }
                        img { max-width: 100%; height: auto; }
                      </style>
                    </head>
                    <body>
                      ${details.html_body}
                    </body>
                  </html>
                `}
                className="w-full h-full min-h-[400px] border-0 bg-transparent"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
              />
            </div>

            {replyMode && (
              <div className="p-4 border-t bg-slate-50 animate-in slide-in-from-bottom-4 duration-300">
                <div className="bg-white border rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all p-1">
                  <div className="px-3 py-2 border-b flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50/50 rounded-t-lg">
                    <CornerUpLeft className="h-3 w-3" /> Replying to {details.from.match(/<([^>]+)>/)?.[1] || details.from}
                  </div>
                  <Textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Write your reply here..."
                    className="min-h-[120px] border-0 focus-visible:ring-0 resize-none rounded-b-lg shadow-none text-sm"
                    autoFocus
                  />
                  <div className="flex justify-between items-center p-2 border-t">
                    <Button variant="ghost" size="sm" onClick={() => setReplyMode(false)} className="text-slate-500 hover:text-slate-700 h-8 rounded-full">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSendReply} disabled={sending || !replyBody.trim()} className="bg-blue-600 hover:bg-blue-700 h-8 rounded-full px-5 shadow-sm">
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
