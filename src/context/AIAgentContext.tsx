import React, { createContext, useContext, useState } from 'react';

interface AIAgentContextType {
  isAgentOpen: boolean;
  openAgent: () => void;
  closeAgent: () => void;
  toggleAgent: () => void;
}

const AIAgentContext = createContext<AIAgentContextType | undefined>(undefined);

export function AIAgentProvider({ children }: { children: React.ReactNode }) {
  const [isAgentOpen, setIsAgentOpen] = useState(false);

  const openAgent = () => setIsAgentOpen(true);
  const closeAgent = () => setIsAgentOpen(false);
  const toggleAgent = () => setIsAgentOpen(prev => !prev);

  return (
    <AIAgentContext.Provider value={{ isAgentOpen, openAgent, closeAgent, toggleAgent }}>
      {children}
    </AIAgentContext.Provider>
  );
}

export function useAIAgent() {
  const context = useContext(AIAgentContext);
  if (context === undefined) {
    throw new Error('useAIAgent must be used within an AIAgentProvider');
  }
  return context;
}
