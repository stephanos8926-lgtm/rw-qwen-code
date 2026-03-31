import React, { useState } from 'react';
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export function FileTree({ 
  nodes, 
  activeFile, 
  gitStatus,
  onFileClick, 
  onContextMenu 
}: { 
  nodes: FileNode[]; 
  activeFile: string | null;
  gitStatus?: any;
  onFileClick: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string) => void;
}) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <TreeNode 
          key={node.path} 
          node={node} 
          activeFile={activeFile} 
          gitStatus={gitStatus}
          onFileClick={onFileClick} 
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}

function TreeNode({ 
  node, 
  activeFile, 
  gitStatus,
  onFileClick, 
  onContextMenu 
}: { 
  node: FileNode; 
  activeFile: string | null;
  gitStatus?: any;
  onFileClick: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isDirectory = node.type === 'directory';

  const getGitStatus = (path: string) => {
    if (!gitStatus?.status?.files) return null;
    const file = gitStatus.status.files.find((f: any) => f.path === path);
    if (!file) return null;
    
    if (file.working_dir === 'M' || file.index === 'M') return 'modified';
    if (file.working_dir === 'A' || file.index === 'A' || file.working_dir === '??') return 'added';
    if (file.working_dir === 'D' || file.index === 'D') return 'deleted';
    return null;
  };

  const status = getGitStatus(node.path);

  return (
    <div>
      <button
        onClick={() => isDirectory ? setIsOpen(!isOpen) : onFileClick(node.path)}
        onContextMenu={(e) => onContextMenu(e, node.path)}
        className={cn(
          "w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors duration-200",
          activeFile === node.path
            ? "bg-primary/15 text-primary font-medium"
            : "text-gray-300 hover:bg-white/5 hover:text-white"
        )}
      >
        {isDirectory && (
          <span className="text-muted-foreground">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        {!isDirectory && <span className="w-4" />}
        
        {isDirectory ? (
          isOpen ? <FolderOpen size={16} className="text-blue-400" /> : <Folder size={16} className="text-blue-400" />
        ) : (
          <FileText size={16} className={cn(
            "text-gray-400",
            status === 'modified' && "text-amber-400",
            status === 'added' && "text-emerald-400",
            status === 'deleted' && "text-rose-400"
          )} />
        )}
        <span className={cn(
          "truncate flex-1 text-left",
          status === 'modified' && "text-amber-400/90",
          status === 'added' && "text-emerald-400/90",
          status === 'deleted' && "text-rose-400/90"
        )}>
          {node.name}
        </span>
        {status && (
          <span className={cn(
            "text-[10px] font-bold px-1 rounded",
            status === 'modified' && "text-amber-400",
            status === 'added' && "text-emerald-400",
            status === 'deleted' && "text-rose-400"
          )}>
            {status === 'modified' ? 'M' : status === 'added' ? 'A' : 'D'}
          </span>
        )}
      </button>
      
      {isDirectory && isOpen && node.children && (
        <div className="pl-4">
          <FileTree 
            nodes={node.children} 
            activeFile={activeFile} 
            gitStatus={gitStatus}
            onFileClick={onFileClick} 
            onContextMenu={onContextMenu}
          />
        </div>
      )}
    </div>
  );
}
