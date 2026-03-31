import { Folder, Settings, Bot, TerminalSquare, FileText, RefreshCw, Plus, ChevronDown, Search, Replace, Zap } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useWorkspace } from '@/src/context/WorkspaceContext';
import { motion } from 'motion/react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { ContextMenu } from '@/src/components/ui/ContextMenu';
import { FileTree } from '@/src/components/layout/FileTree';
import { SearchView } from '@/src/components/layout/SearchView';
import { QwenResourceManager } from '@/src/components/layout/QwenResourceManager';

export function Sidebar({ className }: { className?: string }) {
  const { files, tree, activeFile, selectFile, refreshFiles, openTab, activeTabId, workspaces, currentWorkspace, switchWorkspace, createWorkspace, gitStatus, recentFiles, refreshGitStatus } = useWorkspace();
  const [activeView, setActiveView] = useState<'explorer' | 'search' | 'skills' | 'agents'>('explorer');
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [fileSearch, setFileSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; filename: string } | null>(null);

  const handleFileAction = async (action: 'rename' | 'delete' | 'duplicate' | 'mkdir' | 'copy', filename?: string, source?: string) => {
    let url = `/api/files/${filename ? encodeURIComponent(filename) : ''}`;
    let method = 'POST';
    let body: any = {};

    if (action === 'delete') {
      url = `/api/files/${encodeURIComponent(filename!)}`;
      method = 'DELETE';
    } else if (action === 'rename') {
      const newName = prompt('Enter new filename:', filename);
      if (!newName) return;
      url += '/rename';
      body = { newName };
    } else if (action === 'duplicate') {
      url += '/duplicate';
    } else if (action === 'mkdir') {
      const folderName = prompt('Enter folder name:');
      if (!folderName) return;
      url = '/api/files/mkdir';
      body = { folderName };
    } else if (action === 'copy') {
      const destination = prompt('Enter destination path:', source);
      if (!destination) return;
      url = '/api/files/copy';
      body = { source, destination };
    }

    try {
      const res = await fetch(`${url}?workspace=${encodeURIComponent(currentWorkspace)}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        refreshFiles();
      }
    } catch (error) {
      console.error(`Failed to ${action} file:`, error);
    }
  };

  const handleGitAction = async (action: 'commit' | 'push' | 'pull') => {
    let message = '';
    if (action === 'commit') {
      message = prompt('Enter commit message:') || '';
      if (!message) return;
    }

    try {
      const res = await fetch(`/api/git/${action}?workspace=${encodeURIComponent(currentWorkspace)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        refreshGitStatus();
        alert(`Git ${action} successful!`);
      } else {
        const error = await res.json();
        alert(`Git ${action} failed: ${error.error}`);
      }
    } catch (error) {
      console.error(`Failed to ${action} git:`, error);
      alert(`Failed to ${action} git.`);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowWorkspaceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected index when dropdown opens
  useEffect(() => {
    if (showWorkspaceDropdown) setSelectedIndex(0);
  }, [showWorkspaceDropdown]);

  const handleWorkspaceKeyDown = (e: React.KeyboardEvent) => {
    if (!showWorkspaceDropdown) {
      if (e.key === 'Enter' || e.key === ' ') setShowWorkspaceDropdown(true);
      return;
    }

    if (e.key === 'Escape') {
      setShowWorkspaceDropdown(false);
    } else if (e.key === 'ArrowDown') {
      setSelectedIndex((prev) => (prev + 1) % workspaces.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex((prev) => (prev - 1 + workspaces.length) % workspaces.length);
    } else if (e.key === 'Enter') {
      switchWorkspace(workspaces[selectedIndex]);
      setShowWorkspaceDropdown(false);
    }
  };

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

  const fileStatuses = useMemo(() => {
    const statuses: Record<string, string> = {};
    gitStatus?.status?.files.forEach(f => {
      statuses[f.path] = f.working_dir !== ' ' ? f.working_dir : f.index;
    });
    return statuses;
  }, [gitStatus]);

  return (
    <aside className={cn("w-full lg:w-64 h-full glass-panel flex-col border-r border-y-0 border-l-0 shrink-0", className)}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center text-primary">
            <TerminalSquare size={18} />
          </div>
          <h1 className="font-semibold text-sm tracking-wide">Qwen Code CLI</h1>
        </div>
        <div className="flex items-center gap-2">
          {gitStatus?.isRepo && (
            <div className="text-xs text-muted-foreground" title={`Git: ${gitStatus.status?.current}`}>
              {gitStatus.status?.current}
            </div>
          )}
          <button 
            onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-muted-foreground hover:text-white"
            title="Command Palette (Ctrl+P)"
          >
            <Search size={16} />
          </button>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/50 bg-black/20">
        <button
          onClick={() => setActiveView('explorer')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all",
            activeView === 'explorer' ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-gray-300"
          )}
          title="Explorer"
        >
          <Folder size={14} />
          <span className="hidden xl:inline">Files</span>
        </button>
        <button
          onClick={() => setActiveView('search')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all",
            activeView === 'search' ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-gray-300"
          )}
          title="Search"
        >
          <Search size={14} />
          <span className="hidden xl:inline">Search</span>
        </button>
        <button
          onClick={() => setActiveView('skills')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all",
            activeView === 'skills' ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-gray-300"
          )}
          title="Skills"
        >
          <Zap size={14} />
          <span className="hidden xl:inline">Skills</span>
        </button>
        <button
          onClick={() => setActiveView('agents')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all",
            activeView === 'agents' ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-gray-300"
          )}
          title="Agents"
        >
          <Bot size={14} />
          <span className="hidden xl:inline">Agents</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {activeView === 'search' ? (
          <SearchView />
        ) : activeView === 'skills' ? (
          <QwenResourceManager type="skills" />
        ) : activeView === 'agents' ? (
          <QwenResourceManager type="agents" />
        ) : (
          <>
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
                <div className="relative mb-4" ref={dropdownRef}>
                  <button 
                    onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                    onKeyDown={handleWorkspaceKeyDown}
                    className="w-full flex items-center justify-between bg-black/20 border border-border rounded px-2 py-1.5 text-sm text-white hover:bg-white/5 transition-colors"
                  >
                    <span className="truncate">{currentWorkspace}</span>
                    <ChevronDown size={14} className="text-muted-foreground" />
                  </button>
                  
                  {showWorkspaceDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e1e] border border-border rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                      {workspaces.map((ws, index) => (
                        <button
                          key={ws}
                          onClick={() => {
                            switchWorkspace(ws);
                            setShowWorkspaceDropdown(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors",
                            selectedIndex === index ? "text-primary font-medium bg-primary/10" : "text-gray-300"
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
            ) : (
              <FileTree 
                nodes={tree}
                activeFile={activeFile}
                gitStatus={gitStatus}
                onFileClick={(path) => selectFile(path)}
                onContextMenu={(e, path) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, filename: path });
                }}
              />
            )}
          </>
        )}
        
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={[
              { label: 'New Folder', onClick: () => handleFileAction('mkdir') },
              { label: 'Rename', onClick: () => handleFileAction('rename', contextMenu.filename) },
              { label: 'Duplicate', onClick: () => handleFileAction('duplicate', contextMenu.filename) },
              { label: 'Copy', onClick: () => handleFileAction('copy', undefined, contextMenu.filename) },
              { label: 'Delete', onClick: () => handleFileAction('delete', contextMenu.filename) },
            ]}
          />
        )}
        
        {recentFiles.length > 0 && (
          <>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-2 mt-4">
              Recent Files
            </div>
            {recentFiles.map((file) => (
              <SidebarItem 
                key={file}
                icon={<FileText size={16} />} 
                label={file} 
                active={activeFile === file}
                status={fileStatuses[file]}
                onClick={() => selectFile(file)}
              />
            ))}
          </>
        )}
        
        {gitStatus?.isRepo && (
          <>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-2 mt-4">
              Git
            </div>
            <div className="px-2 space-y-1">
              <button onClick={() => handleGitAction('commit')} className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-300 hover:bg-white/5 hover:text-white">Commit</button>
              <button onClick={() => handleGitAction('push')} className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-300 hover:bg-white/5 hover:text-white">Push</button>
              <button onClick={() => handleGitAction('pull')} className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-300 hover:bg-white/5 hover:text-white">Pull</button>
            </div>
          </>
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
  onClick,
  onContextMenu,
  status
}: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  status?: string;
}) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors duration-200",
        active 
          ? "bg-primary/15 text-primary font-medium" 
          : "text-gray-300 hover:bg-white/5 hover:text-white"
      )}
    >
      {icon}
      <span className="truncate flex-1 text-left">{label}</span>
      {status && (
        <span className={cn(
          "text-[10px] font-mono px-1.5 py-0.5 rounded",
          status === 'M' ? "bg-yellow-500/20 text-yellow-500" :
          status === 'A' ? "bg-green-500/20 text-green-500" :
          status === 'D' ? "bg-red-500/20 text-red-500" :
          "bg-gray-500/20 text-gray-400"
        )}>
          {status}
        </span>
      )}
    </motion.button>
  );
}
