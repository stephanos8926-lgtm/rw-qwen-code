import { MessageSquare, Terminal } from 'lucide-react';
import { useState } from 'react';
import { ChatInterface } from '../panel/ChatInterface';
import { TerminalEmulator } from '../panel/TerminalEmulator';

export function SidePanel() {
  const [activeTab, setActiveTab] = useState<'chat' | 'terminal'>('chat');

  return (
    <aside className="w-96 h-full glass-panel flex flex-col border-l border-y-0 border-r-0 shadow-2xl z-20">
      {/* Panel Tabs */}
      <div className="flex border-b border-border h-12 shrink-0">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
            activeTab === 'chat' 
              ? 'border-b-2 border-primary text-primary bg-white/5' 
              : 'text-muted-foreground hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageSquare size={16} />
          Chat
        </button>
        <button 
          onClick={() => setActiveTab('terminal')}
          className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
            activeTab === 'terminal' 
              ? 'border-b-2 border-primary text-primary bg-white/5' 
              : 'text-muted-foreground hover:text-white hover:bg-white/5'
          }`}
        >
          <Terminal size={16} />
          Terminal
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* We keep both mounted but hidden to preserve state (especially terminal connection) */}
        <div className={`absolute inset-0 ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
          <ChatInterface />
        </div>
        <div className={`absolute inset-0 ${activeTab === 'terminal' ? 'block' : 'hidden'}`}>
          <TerminalEmulator />
        </div>
      </div>
    </aside>
  );
}
