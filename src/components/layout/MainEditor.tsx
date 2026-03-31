import { FileCode2, Save, Play, Loader2, Zap, Code2, X, Settings, Bot, ChevronRight } from 'lucide-react';
import { useWorkspace } from '@/src/context/WorkspaceContext';
import { useState, useEffect } from 'react';
import { MonacoEditorComponent } from '../editor/MonacoEditor';
import { LightweightEditorComponent } from '../editor/LightweightEditor';
import { Configuration } from '../panel/Configuration';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { cn } from '@/src/lib/utils';

export function MainEditor({ className }: { className?: string }) {
  const { activeFile, activeLine, fileContent, isLoading, isSaving, saveFile, saveQwenResource, openTabs, activeTabId, setActiveTabId, closeTab } = useWorkspace();
  const [localContent, setLocalContent] = useState('');
  const [editorMode, setEditorMode] = useState<'monaco' | 'lightweight'>('monaco');

  useEffect(() => {
    setLocalContent(fileContent);
  }, [fileContent]);

  const activeTab = openTabs.find(t => t.id === activeTabId);

  const handleSave = () => {
    if (activeTab?.type === 'qwen-resource') {
      saveQwenResource(localContent);
    } else {
      saveFile(localContent);
    }
  };

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      default:
        return 'plaintext';
    }
  };

  return (
    <main className={cn("flex-1 h-full flex-col bg-background/50 relative flex", className)}>
      {/* Tab Bar */}
      <div className="flex overflow-x-auto bg-[#1e1e1e] border-b border-[#333333] shrink-0 scrollbar-hide">
        {openTabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={cn(
              "group flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px] border-r border-[#333333] cursor-pointer select-none text-sm transition-colors",
              activeTabId === tab.id 
                ? "bg-[#1e1e1e] text-white border-t-2 border-t-primary" 
                : "bg-[#2d2d2d] text-[#888888] hover:bg-[#252526] hover:text-gray-300 border-t-2 border-t-transparent"
            )}
          >
            {tab.type === 'config' ? (
              <Settings size={14} className={activeTabId === tab.id ? "text-primary" : ""} />
            ) : (
              <FileCode2 size={14} className={activeTabId === tab.id ? "text-[#569cd6]" : ""} />
            )}
            <span className="truncate flex-1">{tab.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className={cn(
                "p-0.5 rounded-md hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity",
                activeTabId === tab.id && "opacity-100"
              )}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Editor Header (Only show if a file or resource is active) */}
      {(activeTab?.type === 'file' || activeTab?.type === 'qwen-resource') && (
        <header className="h-12 border-b border-border flex items-center justify-between px-2 sm:px-4 glass-panel-elevated z-10 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            {activeTab.type === 'file' ? (
              <Breadcrumbs path={activeFile || 'No file'} onNavigate={() => {}} />
            ) : (
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Bot size={14} className="text-primary" />
                <span>{activeTab.metadata?.scope === 'global' ? 'Global' : 'Project'}</span>
                <ChevronRight size={14} />
                <span>{activeTab.metadata?.type === 'skills' ? 'Skill' : 'Agent'}</span>
                <ChevronRight size={14} />
                <span className="text-white">{activeTab.metadata?.name}</span>
              </div>
            )}
            {activeFile && (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-muted-foreground border border-border shrink-0">
                {activeFile.split('.').pop()?.toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Editor Mode Toggle */}
            <div className="flex items-center bg-black/20 rounded-md p-0.5 border border-border mr-1 sm:mr-2">
              <button
                onClick={() => setEditorMode('lightweight')}
                className={`p-1.5 rounded-sm flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  editorMode === 'lightweight' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-foreground hover:text-gray-300'
                }`}
                title="Lightweight Editor (Fast)"
              >
                <Zap size={14} />
                <span className="hidden sm:inline">Fast</span>
              </button>
              <button
                onClick={() => setEditorMode('monaco')}
                className={`p-1.5 rounded-sm flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  editorMode === 'monaco' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-foreground hover:text-gray-300'
                }`}
                title="Monaco Editor (Advanced)"
              >
                <Code2 size={14} />
                <span className="hidden sm:inline">Pro</span>
              </button>
            </div>

            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            </button>
            {activeTab.type === 'file' && (
              <button 
                disabled={!activeFile}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm font-medium border border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={14} />
                <span className="hidden sm:inline">Run</span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col bg-[#1e1e1e]">
        {!activeTab ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4 bg-background/50">
            <FileCode2 size={48} className="opacity-20" />
            <p>Select a file from the workspace to start editing.</p>
          </div>
        ) : activeTab.type === 'config' ? (
          <Configuration />
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background/50">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : (
          editorMode === 'monaco' ? (
            <MonacoEditorComponent 
              content={localContent} 
              language={getLanguage(activeFile || '')} 
              activeLine={activeLine}
              onChange={(val) => setLocalContent(val || '')} 
            />
          ) : (
            <LightweightEditorComponent 
              content={localContent} 
              onChange={setLocalContent} 
              language={getLanguage(activeFile || '')}
            />
          )
        )}
      </div>
    </main>
  );
}
