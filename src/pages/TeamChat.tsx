import { useState, useEffect, useRef } from "react";
import {
  Hash,
  Send,
  Smile,
  Paperclip,
  MessageCircle,
  Search,
  Plus,
  Users,
  Image as ImageIcon,
  CheckCheck
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getChatChannels, getAllUsersChannels, getChatMessages, sendChatMessage, createChannel, addMemberToChannel, getOrCreateDM, markChannelRead } from "@/api/collaboration";
import { toast } from "sonner";
import { API_BASE } from "@/config";
import { Download } from "lucide-react";
export default function TeamChat() {
  const { token, username, fullName } = useAuth();
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showChannels, setShowChannels] = useState(true);
  const [channelSearch, setChannelSearch] = useState("");

  const [chatChannels, setChatChannels] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<Record<string, any[]>>({});
  
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");

  const [showAddMember, setShowAddMember] = useState(false);
  const [globalUsers, setGlobalUsers] = useState<any[]>([]);
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([]);
  const [fileAttachment, setFileAttachment] = useState<File | null>(null);

  const [showStartDM, setShowStartDM] = useState(false);
  const [selectedUserForDM, setSelectedUserForDM] = useState<string>("");
  const [dmSearch, setDmSearch] = useState("");

  const [typingUsers, setTypingUsers] = useState<Record<string, Record<string, {user: string, timeout: NodeJS.Timeout}>>>({});
  const wsRef = useRef<WebSocket | null>(null);

  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [editingGroupName, setEditingGroupName] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const EMOJIS = ["😀","😂","😍","🙌","👍","🔥","🎉","💡"];

  const fetchChannels = async () => {
    if (token) {
      try {
        const data = await getChatChannels();
        const channels = data.results || data;
        setChatChannels(channels);
        if (channels.length > 0 && !activeChannel) {
          setActiveChannel(channels[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    fetchChannels();
    
    if (token) {
      getAllUsersChannels()
        .then(setGlobalUsers)
        .catch(console.error);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsHost = window.location.host;
    if (API_BASE.startsWith('http')) {
       const url = new URL(API_BASE);
       wsHost = url.host;
    }
    const wsUrl = `${wsProtocol}//${wsHost}/ws/chat/?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_message') {
          const msg = data.message;
          const channelId = String(data.channel_id);
          
          setChatMessages(prev => {
            const prevMsgs = prev[channelId] || [];
            if (prevMsgs.find(m => m.id === msg.id)) return prev;
            return { ...prev, [channelId]: [...prevMsgs, msg] };
          });
        } else if (data.type === 'new_channel') {
           fetchChannels();
        } else if (data.type === 'typing') {
          const cId = String(data.channel_id);
          const u = data.user;
          if (u !== username && u !== fullName) {
            setTypingUsers(prev => {
              const current = prev[cId] || {};
              if (current[u]) clearTimeout(current[u].timeout);
              const timeout = setTimeout(() => {
                setTypingUsers(p => {
                  const newCurrent = { ...p[cId] };
                  delete newCurrent[u];
                  return { ...p, [cId]: newCurrent };
                });
              }, 3000);
              return { ...prev, [cId]: { ...current, [u]: { user: u, timeout } } };
            });
          }
        }
      } catch (e) {
        console.error("WS Message Error:", e);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token]);

  // Initial fetch for active channel
  useEffect(() => {
    if (!token || !activeChannel) return;
    
    const fetchMessages = async () => {
      try {
        const data = await getChatMessages(activeChannel.toString());
        setChatMessages(prev => ({ ...prev, [activeChannel]: data.results || data }));
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();
    
    // Mark channel as read
    markChannelRead(activeChannel.toString()).then(() => {
      setChatChannels(prev => prev.map(c => c.id === activeChannel ? { ...c, unread: 0 } : c));
    }).catch(console.error);
  }, [token, activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, activeChannel]);

  const handleSendMessage = async () => {
    if ((!message.trim() && !fileAttachment) || !activeChannel) return;
    
    const msgText = message.trim();
    const attachedFile = fileAttachment;
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic UI update
    const optimisticMsg = {
      id: tempId,
      content: msgText,
      user: username || fullName || "You",
      initials: (username || fullName || "Y")?.substring(0, 2).toUpperCase(),
      timestamp: new Date().toISOString(),
      isOptimistic: true,
      file: attachedFile ? URL.createObjectURL(attachedFile) : null,
      file_name: attachedFile ? attachedFile.name : null
    };

    setMessage("");
    setFileAttachment(null);
    
    setChatMessages(prev => {
      const channelMsgs = prev[activeChannel] || [];
      return { ...prev, [activeChannel]: [...channelMsgs, optimisticMsg] };
    });

    try {
      const newMessage = await sendChatMessage(activeChannel.toString(), msgText, attachedFile);
      
      if (newMessage) {
        setChatMessages(prev => {
          const channelMsgs = prev[activeChannel] || [];
          // Replace temp message with actual message
          const filtered = channelMsgs.filter(m => m.id !== tempId);
          if (filtered.some((m: any) => m.id === newMessage.id)) return prev;
          return { ...prev, [activeChannel]: [...filtered, newMessage] };
        });
      }
    } catch (e) {
      console.error(e);
      // Revert optimistic message on failure
      setChatMessages(prev => {
        const channelMsgs = prev[activeChannel] || [];
        return { ...prev, [activeChannel]: channelMsgs.filter(m => m.id !== tempId) };
      });
      toast.error("Failed to send message");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setFileAttachment(file);
          e.preventDefault();
        }
      }
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      await createChannel(newChannelName.trim(), "public"); // default to public for now
      setShowCreateChannel(false);
      setNewChannelName("");
      setNewChannelDesc("");
      fetchChannels();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMember = async () => {
    if (selectedUsersToAdd.length === 0 || !activeChannel) return;
    try {
      await addMemberToChannel(activeChannel.toString(), selectedUsersToAdd);
      setShowAddMember(false);
      setSelectedUsersToAdd([]);
      toast.success("Members added!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to add member");
    }
  };

  const handleStartDM = async () => {
    if (!selectedUserForDM) return;
    try {
      const data = await getOrCreateDM(selectedUserForDM);
      setShowStartDM(false);
      setSelectedUserForDM("");
      setDmSearch("");
      await fetchChannels();
      setActiveChannel(data.id);
      setShowChannels(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to start direct message");
    }
  };

  const handleRenameGroup = async () => {
    if (!editingGroupName.trim() || !activeChannel) return;
    try {
      const res = await fetch(`${API_BASE}/chat/channels/${activeChannel}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ name: editingGroupName.trim() })
      });
      if (res.ok) {
        toast.success("Group renamed");
        fetchChannels();
      } else {
        toast.error("Failed to rename group");
      }
    } catch (e) {
      toast.error("Error renaming group");
    }
  };

  const channel = chatChannels.find((c) => c.id === activeChannel) || { name: "Loading...", display_name: "Loading...", description: "", is_group: false };
  const messages = activeChannel ? (chatMessages[activeChannel] || []) : [];
  
  const filteredChannels = chatChannels.filter(c => (c?.display_name || c?.name || "").toLowerCase().includes(channelSearch.toLowerCase()));
  const groupChannels = filteredChannels.filter(c => c.is_group);
  const dmChannels = filteredChannels.filter(c => !c.is_group);

  return (
    <div className="h-[calc(100vh-8rem)] flex animate-fade-in">
      {/* Channel List */}
      <div className={cn(
        "w-64 shrink-0 border-r border-border bg-card flex flex-col rounded-l-lg",
        showChannels ? "block" : "hidden md:block"
      )}>
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-sm text-foreground">Chat</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Search chats..." 
              className="pl-8 h-8 text-xs" 
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-4">
            
            {/* Direct Messages */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                <span>Direct Messages</span>
                <Button size="icon" variant="ghost" className="h-5 w-5 hover:text-foreground" onClick={() => setShowStartDM(true)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {dmChannels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => { setActiveChannel(ch.id); setShowChannels(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors text-left",
                    activeChannel === ch.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                      {ch.display_name?.substring(0,2).toUpperCase() || "DM"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">{ch.display_name || ch.name}</span>
                  {ch.unread > 0 && (
                    <Badge className="h-4 min-w-4 px-1 text-[9px] gradient-primary text-primary-foreground border-0">
                      {ch.unread}
                    </Badge>
                  )}
                </button>
              ))}
              {dmChannels.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1">No direct messages</p>
              )}
            </div>

            {/* Groups */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                <span>Groups</span>
                <Button size="icon" variant="ghost" className="h-5 w-5 hover:text-foreground" onClick={() => setShowCreateChannel(true)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {groupChannels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => { setActiveChannel(ch.id); setShowChannels(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors text-left",
                    activeChannel === ch.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{ch.name}</span>
                  {ch.unread > 0 && (
                    <Badge className="h-4 min-w-4 px-1 text-[9px] gradient-primary text-primary-foreground border-0">
                      {ch.unread}
                    </Badge>
                  )}
                </button>
              ))}
              {groupChannels.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1">No groups</p>
              )}
            </div>

          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-card rounded-r-lg">
        {/* Channel Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <button className="md:hidden" onClick={() => setShowChannels(true)}>
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
          </button>
          {channel.is_group ? (
            <Users className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {channel.display_name?.substring(0,2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground cursor-pointer hover:underline" onClick={() => {
              if (channel.is_group) {
                setEditingGroupName(channel.name);
                fetch(`${API_BASE}/chat/channels/${activeChannel}/`, {
                  headers: { "Authorization": `Bearer ${token}` }
                }).then(r=>r.json()).then(data=>{
                  if (data.members) setGroupMembers(data.members);
                  else if (data.member_details) setGroupMembers(data.member_details);
                  else setGroupMembers(globalUsers.filter((u:any) => channel.members?.includes(u.id) || channel.members?.includes(u.id.toString())));
                }).catch(() => {
                  setGroupMembers(globalUsers.filter((u:any) => channel.members?.includes(u.id) || channel.members?.includes(u.id.toString())));
                });
                setShowGroupInfo(true);
              }
            }}>{channel.display_name || channel.name}</h3>
            <p className="text-[11px] text-muted-foreground">{channel.description || (channel.is_group ? "" : "Direct Message")}</p>
          </div>
          {channel.is_group && (
            <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs text-muted-foreground h-7" onClick={() => setShowAddMember(true)}>
              <Users className="h-3.5 w-3.5" />
              <span>Add Member</span>
            </Button>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg, i) => {
              if (!msg) return null;
              const isCurrentUser = msg.user === username || msg.user === fullName;
              
              return (
              <div key={msg.id} className={cn("flex items-start gap-3 group", isCurrentUser ? "flex-row-reverse" : "")}>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {msg.initials}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("flex flex-col", isCurrentUser ? "items-end" : "items-start")}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground">{msg.user}</span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : msg.time}
                      {isCurrentUser && <CheckCheck className="h-3 w-3 text-blue-500" />}
                    </span>
                  </div>
                  <div className={`p-3 rounded-lg max-w-[85%] ${isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    <p className="text-sm">{msg.content || msg.message}</p>
                    {msg.file && (() => {
                      const fileUrlStr = msg.file.startsWith('/') ? msg.file : `/${msg.file}`;
                      const url = msg.file.startsWith('http') ? msg.file : `${API_BASE.replace('/api', '')}${fileUrlStr}`;
                      return (
                        <div className="mt-2 text-xs flex flex-col items-start gap-1">
                          {msg.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img src={url} alt={msg.file_name} className="max-w-[200px] rounded" />
                          ) : (
                            <div className="flex items-center gap-2">
                              <a href={url} target="_blank" rel="noreferrer" className="underline text-blue-300">
                                📎 {msg.file_name || "Attachment"}
                              </a>
                            </div>
                          )}
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-6 mt-1 text-[10px] gap-1 px-2 py-0"
                            onClick={() => window.open(url, '_blank')}
                          >
                            <Download className="h-3 w-3" /> Download
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.reactions.map((r, i) => (
                        <button
                          key={i}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs hover:bg-muted/80 transition-colors border border-border"
                        >
                          <span>{r.emoji}</span>
                          <span className="text-muted-foreground">{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Thread indicator */}
                  {msg.replies > 0 && (
                    <button className="flex items-center gap-1.5 mt-2 text-xs text-primary hover:underline">
                      <MessageCircle className="h-3 w-3" />
                      {msg.replies} replies
                    </button>
                  )}
                </div>
              </div>
            )})}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" asChild>
                <span><Paperclip className="h-4 w-4" /></span>
              </Button>
              <input type="file" className="hidden" onChange={(e) => setFileAttachment(e.target.files?.[0] || null)} />
            </label>
            <Input 
              placeholder={fileAttachment ? `File: ${fileAttachment.name}` : `Message ${channel.display_name || channel.name}...`}
              className="h-9 text-sm" 
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeChannel) {
                  wsRef.current.send(JSON.stringify({ type: 'typing', channel_id: activeChannel, user: username || fullName || "Someone" }));
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              onPaste={handlePaste}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 bg-white" side="top">
                <div className="grid grid-cols-4 gap-2">
                  {EMOJIS.map(emoji => (
                    <button key={emoji} className="text-2xl hover:bg-slate-100 rounded p-1" onClick={() => setMessage(prev => prev + emoji)}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={handleSendMessage} size="icon" className="h-8 w-8 shrink-0 gradient-primary text-primary-foreground">
              <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Typing Indicator */}
          {activeChannel && typingUsers[activeChannel] && Object.keys(typingUsers[activeChannel]).length > 0 && (
            <div className="px-4 pb-2 text-[10px] text-muted-foreground italic flex items-center gap-1 border-t border-border bg-muted/20 pt-1">
              <span className="flex gap-0.5">
                <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></span>
                <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
              </span>
              {Object.keys(typingUsers[activeChannel]).join(", ")} {Object.keys(typingUsers[activeChannel]).length > 1 ? "are" : "is"} typing...
            </div>
          )}
        </div>
      
      {/* Create Channel Modal */}
      <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Channel</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Channel Name</label>
              <Input value={newChannelName} onChange={e => setNewChannelName(e.target.value)} placeholder="e.g. general" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)} placeholder="Optional description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateChannel(false)}>Cancel</Button>
            <Button onClick={handleCreateChannel} disabled={!newChannelName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Modal */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Member to {channel.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Select Users</label>
              <ScrollArea className="h-[200px] border border-border rounded-md p-2">
                {globalUsers.map(u => (
                  <div key={u.id} className="flex items-center space-x-2 py-2 border-b border-border last:border-0">
                    <Checkbox 
                      id={`user-${u.id}`}
                      checked={selectedUsersToAdd.includes(u.id.toString())}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUsersToAdd(prev => [...prev, u.id.toString()]);
                        } else {
                          setSelectedUsersToAdd(prev => prev.filter(id => id !== u.id.toString()));
                        }
                      }}
                    />
                    <label htmlFor={`user-${u.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {u.name}
                    </label>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={selectedUsersToAdd.length === 0}>Add Members</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Start DM Modal */}
      <Dialog open={showStartDM} onOpenChange={setShowStartDM}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New Direct Message</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Select User</label>
              <Input 
                placeholder="Search user..." 
                className="h-9 text-sm mb-2" 
                value={dmSearch}
                onChange={(e) => setDmSearch(e.target.value)}
              />
              <ScrollArea className="h-[250px] border border-border rounded-md p-2">
                {globalUsers.filter(u => u.name !== username && u.name.toLowerCase().includes(dmSearch.toLowerCase())).map(u => (
                  <button 
                    key={u.id} 
                    className={cn(
                      "w-full flex items-center gap-3 p-3 mb-2 rounded-lg hover:bg-muted transition-colors text-left border",
                      selectedUserForDM === u.id.toString() ? "bg-primary/10 border-primary text-primary font-medium" : "border-transparent text-foreground"
                    )}
                    onClick={() => setSelectedUserForDM(u.id.toString())}
                  >
                    <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center shrink-0", selectedUserForDM === u.id.toString() ? "border-primary bg-primary" : "border-slate-300")}>
                      {selectedUserForDM === u.id.toString() && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-base">{u.name}</span>
                  </button>
                ))}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDM(false)}>Cancel</Button>
            <Button onClick={handleStartDM} disabled={!selectedUserForDM}>Start Chat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Group Info Modal */}
      <Dialog open={showGroupInfo} onOpenChange={setShowGroupInfo}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Group Info</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Group Name</label>
              <div className="flex gap-2">
                <Input value={editingGroupName} onChange={e => setEditingGroupName(e.target.value)} />
                <Button onClick={handleRenameGroup} disabled={editingGroupName === channel.name}>Rename</Button>
              </div>
            </div>
            <div className="grid gap-2 mt-2">
              <label className="text-sm font-medium">Members</label>
              <ScrollArea className="h-[200px] border border-border rounded-md p-2 bg-muted/20">
                {groupMembers.length > 0 ? groupMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md text-sm">
                    <span className="font-medium text-foreground">{m.name || m.username}</span>
                    <span className="text-[10px] text-muted-foreground">{m.date_joined ? new Date(m.date_joined).toLocaleDateString() : 'N/A'}</span>
                  </div>
                )) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">Loading members...</div>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
