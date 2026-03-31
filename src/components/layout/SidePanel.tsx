import { MessageSquare, Terminal, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { ChatInterface } from '../panel/ChatInterface';
import { TerminalEmulator } from '../panel/TerminalEmulator';
import { useWorkspace } from '@/src/context/WorkspaceContext';
import { cn } from '@/src/lib/utils';

export function SidePanel({ className }: { className?: string }) {
  const [activeTab, setActiveTab] = useState<'chat' | 'terminal'>('chat');
  const { terminalTabs, activeTerminalTabId, addTerminalTab, closeTerminalTab, setActiveTerminalTabId } = useWorkspace();

  return (
    <aside className={cn("w-full lg:w-96 h-full glass-panel flex-col border-l border-y-0 border-r-0 shadow-2xl z-20 shrink-0", className)}>
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
        <div className={`absolute inset-0 ${activeTab === 'terminal' ? 'flex flex-col' : 'hidden'}`}>
          {/* Terminal Tabs */}
          <div className="flex items-center bg-[#1e1e1e] border-b border-[#333] shrink-0 overflow-x-auto">
            {terminalTabs.map((tabId) => (
              <div
                key={tabId}
                onClick={() => setActiveTerminalTabId(tabId)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 min-w-[100px] border-r border-[#333] cursor-pointer select-none text-xs transition-colors",
                  activeTerminalTabId === tabId 
                    ? "bg-[#1e1e1e] text-white border-t-2 border-t-primary" 
                    : "bg-[#2d2d2d] text-[#888888] hover:bg-[#252526] hover:text-gray-300 border-t-2 border-t-transparent"
                )}
              >
                <span className="truncate flex-1">{tabId}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminalTab(tabId);
                  }}
                  className="p-0.5 rounded-md hover:bg-white/10"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={addTerminalTab}
              className="p-2 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          
          {/* Terminal Instances */}
          <div className="flex-1 relative">
            {terminalTabs.map((tabId) => (
              <div key={tabId} className={`absolute inset-0 ${activeTerminalTabId === tabId ? 'block' : 'hidden'}`}>
                <TerminalEmulator tabId={tabId} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
