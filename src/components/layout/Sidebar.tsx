import { Folder, Settings, Bot, TerminalSquare, FileText, RefreshCw, Plus, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useWorkspace } from '@/src/context/WorkspaceContext';
import { motion } from 'motion/react';
import { useState, useMemo } from 'react';

export function Sidebar({ className }: { className?: string }) {
  const { files, activeFile, selectFile, refreshFiles, openTab, activeTabId, workspaces, currentWorkspace, switchWorkspace, createWorkspace } = useWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [fileSearch, setFileSearch] = useState('');

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newWorkspaceName.trim()) {
      await createWorkspace(newWorkspaceName.trim());
      setNewWorkspaceName('');
      setIsCreating(false);
      setShowWorkspaceDropdown(false);
    }
  };

  const filteredFiles = useMemo(() => {
    return files.filter(file => file.toLowerCase().includes(fileSearch.toLowerCase()));
  }, [files, fileSearch]);

  return (
    <aside className={cn("w-full lg:w-64 h-full glass-panel flex-col border-r border-y-0 border-l-0 shrink-0", className)}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center text-primary">
            <TerminalSquare size={18} />
          </div>
          <h1 className="font-semibold text-sm tracking-wide">Qwen Code CLI</h1>
        </div>
        <button 
          onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-muted-foreground hover:text-white"
          title="Command Palette (Ctrl+P)"
        >
          <Search size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-2 py-2 mt-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <span>Workspace</span>
            <button 
              onClick={() => setIsCreating(true)}
              className="p-1 hover:text-white hover:bg-white/10 rounded transition-colors"
              title="New Workspace"
            >
              <Plus size={14} />
            </button>
          </div>
          
          {isCreating ? (
            <form onSubmit={handleCreateWorkspace} className="flex items-center gap-2 mb-4">
              <input
                type="text"
                autoFocus
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Workspace name..."
                className="flex-1 bg-black/20 border border-border rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-primary"
              />
              <button type="submit" className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Add</button>
              <button type="button" onClick={() => setIsCreating(false)} className="text-xs text-muted-foreground hover:text-white">Cancel</button>
            </form>
          ) : (
            <div className="relative mb-4">
              <button 
                onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                className="w-full flex items-center justify-between bg-black/20 border border-border rounded px-2 py-1.5 text-sm text-white hover:bg-white/5 transition-colors"
              >
                <span className="truncate">{currentWorkspace}</span>
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>
              
              {showWorkspaceDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e1e] border border-border rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                  {workspaces.map(ws => (
                    <button
                      key={ws}
                      onClick={() => {
                        switchWorkspace(ws);
                        setShowWorkspaceDropdown(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors",
                        currentWorkspace === ws ? "text-primary font-medium bg-primary/10" : "text-gray-300"
                      )}
                    >
                      {ws}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-2 mt-2">
          <span>Files</span>
          <button 
            onClick={refreshFiles}
            className="p-1 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Refresh Files"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="px-2 mb-2">
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-black/20 border border-border rounded pl-7 pr-2 py-1 text-xs text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        
        {files.length === 0 ? (
          <div className="px-2 py-4 text-sm text-gray-500 italic text-center">
            No files found.
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="px-2 py-4 text-sm text-gray-500 italic text-center">
            No files match search.
          </div>
        ) : (
          filteredFiles.map((file) => (
            <SidebarItem 
              key={file}
              icon={<FileText size={16} />} 
              label={file} 
              active={activeFile === file}
              onClick={() => selectFile(file)}
            />
          ))
        )}
        
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-2 mt-4">
          Configuration
        </div>
        <SidebarItem 
          icon={<Settings size={16} />} 
          label="Settings" 
          active={activeTabId === 'config'}
          onClick={() => openTab('config', 'config', 'Configuration')}
        />
        <SidebarItem icon={<Bot size={16} />} label="Subagents" />
      </div>
      
      <div className="p-4 border-t border-border text-xs text-muted-foreground flex justify-between items-center">
        <span>v1.0.0-beta</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Connected
        </span>
      </div>
    </aside>
  );
}

function SidebarItem({ 
  icon, 
  label, 
  active,
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors duration-200",
        active 
          ? "bg-primary/15 text-primary font-medium" 
          : "text-gray-300 hover:bg-white/5 hover:text-white"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </motion.button>
  );
}
