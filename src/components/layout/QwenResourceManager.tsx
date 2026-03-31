import { useState, useEffect } from 'react';
import { Bot, Plus, Trash2, Globe, Folder, FileText, Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import { useWorkspace } from '@/src/context/WorkspaceContext';
import { cn } from '@/src/lib/utils';

interface Resource {
  name: string;
  path: string;
  type: string;
}

interface QwenResourceManagerProps {
  type: 'skills' | 'agents';
}

export function QwenResourceManager({ type }: QwenResourceManagerProps) {
  const { currentWorkspace, selectQwenResource } = useWorkspace();
  const [resources, setResources] = useState<{ global: Resource[], project: Resource[] }>({ global: [], project: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState<{ scope: 'global' | 'project' } | null>(null);
  const [newName, setNewName] = useState('');

  const fetchResources = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/qwen/resources?workspace=${encodeURIComponent(currentWorkspace)}`);
      const data = await res.json();
      setResources({
        global: data[type].global,
        project: data[type].project
      });
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [type, currentWorkspace]);

  const handleCreate = async (scope: 'global' | 'project') => {
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/qwen/resource/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace: currentWorkspace,
          type,
          scope,
          name: newName.trim()
        })
      });
      if (res.ok) {
        setNewName('');
        setIsCreating(null);
        fetchResources();
      }
    } catch (error) {
      console.error('Failed to create resource:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, scope: 'global' | 'project', name: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/qwen/resource/delete?workspace=${encodeURIComponent(currentWorkspace)}&type=${type}&scope=${scope}&name=${name}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchResources();
      }
    } catch (error) {
      console.error('Failed to delete resource:', error);
    }
  };

  const ResourceSection = ({ scope, title, icon: Icon }: { scope: 'global' | 'project', title: string, icon: any }) => (
    <div className="mb-6">
      <div className="flex items-center justify-between px-2 py-1 mb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Icon size={14} />
          <span>{title}</span>
        </div>
        <button 
          onClick={() => setIsCreating({ scope })}
          className="p-1 hover:text-white hover:bg-white/10 rounded transition-colors"
          title={`New ${type.slice(0, -1)}`}
        >
          <Plus size={14} />
        </button>
      </div>

      {isCreating?.scope === scope && (
        <div className="px-2 mb-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate(scope)}
              placeholder="Name..."
              className="flex-1 bg-black/20 border border-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-primary"
            />
            <button 
              onClick={() => handleCreate(scope)}
              className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded font-bold"
            >
              ADD
            </button>
            <button 
              onClick={() => setIsCreating(null)}
              className="text-[10px] text-muted-foreground hover:text-white"
            >
              ESC
            </button>
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {resources[scope].length === 0 ? (
          <div className="px-4 py-2 text-xs text-muted-foreground italic">
            No {type} found.
          </div>
        ) : (
          resources[scope].map((res) => (
            <button
              key={res.name}
              onClick={() => selectQwenResource(type, scope, res.name)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors group"
            >
              <FileText size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="truncate flex-1 text-left">{res.name.replace('.md', '')}</span>
              <button 
                onClick={(e) => handleDelete(e, scope, res.name)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </button>
          ))
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-2 overflow-y-auto">
      <div className="px-2 py-4 mb-4 border-b border-border/50">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 capitalize">
          <Bot className="text-primary" size={20} />
          {type === 'agents' ? 'Agents' : type}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Manage your {type} definitions. These are markdown files that define the behavior and capabilities of your agents.
        </p>
      </div>

      <ResourceSection scope="project" title="Project Level" icon={Folder} />
      <ResourceSection scope="global" title="Global Level" icon={Globe} />
    </div>
  );
}
