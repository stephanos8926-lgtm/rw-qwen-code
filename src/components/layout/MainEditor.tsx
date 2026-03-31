import { FileCode2, Save, Play, Loader2, Zap, Code2 } from 'lucide-react';
import { useWorkspace } from '@/src/context/WorkspaceContext';
import { useState, useEffect } from 'react';
import { MonacoEditorComponent } from '../editor/MonacoEditor';
import { LightweightEditorComponent } from '../editor/LightweightEditor';

export function MainEditor() {
  const { activeFile, fileContent, isLoading, isSaving, saveFile } = useWorkspace();
  const [localContent, setLocalContent] = useState('');
  const [editorMode, setEditorMode] = useState<'monaco' | 'lightweight'>('monaco');

  useEffect(() => {
    setLocalContent(fileContent);
  }, [fileContent]);

  const handleSave = () => {
    saveFile(localContent);
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
    <main className="flex-1 h-full flex flex-col bg-background/50 relative">
      {/* Editor Header */}
      <header className="h-12 border-b border-border flex items-center justify-between px-4 glass-panel-elevated z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
            <FileCode2 size={16} className="text-primary" />
            <span>{activeFile || 'No file selected'}</span>
          </div>
          {activeFile && (
            <span className="px-2 py-0.5 rounded-full bg-white/5 text-xs text-muted-foreground border border-border">
              {activeFile.split('.').pop()?.toUpperCase()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Editor Mode Toggle */}
          <div className="flex items-center bg-black/20 rounded-md p-0.5 border border-border mr-2">
            <button
              onClick={() => setEditorMode('lightweight')}
              className={`p-1.5 rounded-sm flex items-center gap-1.5 text-xs font-medium transition-colors ${
                editorMode === 'lightweight' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-foreground hover:text-gray-300'
              }`}
              title="Lightweight Editor (Fast)"
            >
              <Zap size={14} />
              Fast
            </button>
            <button
              onClick={() => setEditorMode('monaco')}
              className={`p-1.5 rounded-sm flex items-center gap-1.5 text-xs font-medium transition-colors ${
                editorMode === 'monaco' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-foreground hover:text-gray-300'
              }`}
              title="Monaco Editor (Advanced)"
            >
              <Code2 size={14} />
              Pro
            </button>
          </div>

          <button 
            onClick={handleSave}
            disabled={!activeFile || isSaving}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save File"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          </button>
          <button 
            disabled={!activeFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm font-medium border border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={14} />
            Run
          </button>
        </div>
      </header>

      {/* Editor Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col bg-[#1e1e1e]">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background/50">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : !activeFile ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4 bg-background/50">
            <FileCode2 size={48} className="opacity-20" />
            <p>Select a file from the workspace to start editing.</p>
          </div>
        ) : (
          editorMode === 'monaco' ? (
            <MonacoEditorComponent 
              content={localContent} 
              language={getLanguage(activeFile)} 
              onChange={(val) => setLocalContent(val || '')} 
            />
          ) : (
            <LightweightEditorComponent 
              content={localContent} 
              onChange={setLocalContent} 
            />
          )
        )}
      </div>
    </main>
  );
}
