import { Folder, Settings, Bot, TerminalSquare, FileText, RefreshCw } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useWorkspace } from '@/src/context/WorkspaceContext';

export function Sidebar() {
  const { files, activeFile, selectFile, refreshFiles } = useWorkspace();

  return (
    <aside className="w-64 h-full glass-panel flex flex-col border-r border-y-0 border-l-0">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center text-primary">
            <TerminalSquare size={18} />
          </div>
          <h1 className="font-semibold text-sm tracking-wide">Qwen Code CLI</h1>
        </div>
        <button 
          onClick={refreshFiles}
          className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 rounded-md transition-colors"
          title="Refresh Workspace"
        >
          <RefreshCw size={14} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-2 mt-2">
          Workspace
        </div>
        
        {files.length === 0 ? (
          <div className="px-2 py-4 text-sm text-gray-500 italic text-center">
            No files found.
          </div>
        ) : (
          files.map((file) => (
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
        <SidebarItem icon={<Settings size={16} />} label="Settings" />
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
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all duration-200",
        active 
          ? "bg-primary/15 text-primary font-medium" 
          : "text-gray-300 hover:bg-white/5 hover:text-white"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
