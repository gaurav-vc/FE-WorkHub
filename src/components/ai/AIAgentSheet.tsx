import React, { useState, useRef, useEffect } from "react";
import { useAIAgent } from "@/context/AIAgentContext";
import { Bot, Sparkles, Send, Loader2, X, Maximize2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE } from "@/config";
import { useNavigate } from "react-router-dom";

export function AIAgentSheet() {
  const { isAgentOpen, closeAgent } = useAIAgent();
  const [messages, setMessages] = useState<{ role: 'user' | 'agent', text: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAgentOpen]);

  if (!isAgentOpen) return null;

  const startNewChat = () => {
    setMessages([]);
    setInput("");
  };

  const handleSend = async (messageText: string = input) => {
    if (!messageText.trim()) return;
    
    const newMsg = { role: 'user' as const, text: messageText };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/ai_agents/agents/invoke/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          agent: "chat",
          message: messageText,
        }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'agent', text: data.response || "Something went wrong." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'agent', text: "Network error occurred." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "What are my due tasks?",
    "Show my upcoming meetings",
    "Any new tasks assigned to me?",
    "Show pending tasks"
  ];

  return (
    <div className="fixed bottom-28 right-6 z-[100] w-[380px] h-[600px] max-h-[80vh] bg-[#F8FAFC] rounded-[24px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border border-slate-200/60 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 p-4 pb-5 flex items-center justify-between shrink-0 relative overflow-hidden">
        {/* Subtle background pattern/glow */}
        <div className="absolute top-[-50%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-[-50%] left-[-10%] w-24 h-24 bg-purple-400/20 rounded-full blur-xl"></div>
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-10 w-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[16px] text-white tracking-tight">WorkHub AI</h3>
            <p className="text-[12px] text-indigo-100 font-medium">Your intelligent assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1 relative z-10">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all" onClick={startNewChat} title="New Chat">
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all" onClick={closeAgent}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
      `}</style>
      
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 bg-[#F8FAFC] relative" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-500 pt-4">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-indigo-400 blur-xl opacity-30 rounded-full animate-pulse"></div>
              <div className="relative h-16 w-16 bg-gradient-to-br from-indigo-100 to-purple-50 rounded-2xl flex items-center justify-center border border-white shadow-sm rotate-3 hover:rotate-6 transition-transform">
                <Sparkles className="h-8 w-8 text-indigo-500" />
              </div>
            </div>
            <p className="text-slate-600 font-medium text-[14px] mb-8 max-w-[240px] leading-relaxed">
              Ask me about your tasks or upcoming meetings!
            </p>
            <div className="flex flex-col gap-3 w-full">
              {suggestions.map((s, i) => (
                <button 
                  key={i}
                  onClick={() => handleSend(s)}
                  className="group flex items-center gap-3 text-left bg-white border border-slate-200/60 px-4 py-3.5 rounded-2xl text-[13px] font-medium text-slate-700 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 hover:text-indigo-700 transition-all"
                >
                  <div className="bg-indigo-50 p-1.5 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
                  </div>
                  <span className="truncate">{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isHtml = msg.text.trim().startsWith('<');
            const isUser = msg.role === 'user';
            return (
              <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                {isUser ? (
                  <div className="max-w-[85%] rounded-[20px] p-3.5 text-[13px] shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-sm">
                    {msg.text}
                  </div>
                ) : isHtml ? (
                  <div 
                    className="max-w-[85%] rounded-[20px] p-4 text-[13px] shadow-sm bg-white border border-slate-200/60 text-slate-700 rounded-bl-sm"
                    dangerouslySetInnerHTML={{ __html: msg.text }}
                  />
                ) : (
                  <div className="max-w-[85%] rounded-[20px] p-3.5 text-[13px] shadow-sm bg-white border border-slate-200/60 text-slate-700 rounded-bl-sm whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </div>
                )}
              </div>
            );
          })
        )}
        {isLoading && (
          <div className="flex justify-start animate-in fade-in">
            <div className="bg-white border border-slate-200/60 rounded-[20px] rounded-bl-sm p-4 shadow-sm">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)] relative z-20">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <Input 
            placeholder="Ask AI Agent..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-slate-50 border-slate-200 shadow-inner rounded-full px-5 text-[13px] h-11 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all placeholder:text-slate-400"
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon" className="shrink-0 h-11 w-11 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all group">
            <Send className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
          </Button>
        </form>
      </div>
    </div>
  );
}
