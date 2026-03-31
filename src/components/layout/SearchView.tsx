import { useState, useEffect } from 'react';
import { Search, Replace, ChevronRight, ChevronDown, FileText, Loader2, Check, X } from 'lucide-react';
import { useWorkspace } from '@/src/context/WorkspaceContext';
import { cn } from '@/src/lib/utils';

interface SearchResult {
  file: string;
  line: string;
  content: string;
}

export function SearchView() {
  const { currentWorkspace, selectFile } = useWorkspace();
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [results, setResults] = useState<Record<string, SearchResult[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  const handleSearch = async () => {
    if (!query) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&workspace=${encodeURIComponent(currentWorkspace)}`);
      const data = await res.json();
      
      // Group results by file
      const grouped: Record<string, SearchResult[]> = {};
      data.results.forEach((res: SearchResult) => {
        if (!grouped[res.file]) grouped[res.file] = [];
        grouped[res.file].push(res);
      });
      
      setResults(grouped);
      // Expand all by default
      const expanded: Record<string, boolean> = {};
      Object.keys(grouped).forEach(file => expanded[file] = true);
      setExpandedFiles(expanded);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplaceAll = async () => {
    if (!query || !replaceText) return;
    if (!confirm(`Are you sure you want to replace all occurrences of "${query}" with "${replaceText}"?`)) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace: currentWorkspace,
          search: query,
          replace: replaceText
        })
      });
      
      if (res.ok) {
        alert('Replacement complete!');
        handleSearch(); // Refresh results
      }
    } catch (error) {
      console.error('Replace error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFile = (file: string) => {
    setExpandedFiles(prev => ({ ...prev, [file]: !prev[file] }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 border-b border-border">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search..."
            className="w-full bg-black/20 border border-border rounded pl-8 pr-2 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
          />
        </div>
        <div className="relative">
          <Replace size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replace..."
            className="w-full bg-black/20 border border-border rounded pl-8 pr-2 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSearch}
            disabled={isLoading || !query}
            className="flex-1 bg-primary/20 text-primary hover:bg-primary/30 py-1.5 rounded text-xs font-medium border border-primary/30 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Search'}
          </button>
          <button 
            onClick={handleReplaceAll}
            disabled={isLoading || !query || !replaceText}
            className="flex-1 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 py-1.5 rounded text-xs font-medium border border-amber-500/30 transition-colors disabled:opacity-50"
          >
            Replace All
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {Object.keys(results).length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground italic">
            {query ? 'No results found.' : 'Enter a search query above.'}
          </div>
        ) : (
          Object.entries(results).map(([file, fileResults]) => (
            <div key={file} className="mb-1">
              <button 
                onClick={() => toggleFile(file)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-white/5 rounded text-sm text-gray-300 transition-colors"
              >
                <span className="text-muted-foreground">
                  {expandedFiles[file] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <FileText size={14} className="text-blue-400" />
                <span className="truncate flex-1 text-left">{file}</span>
                <span className="text-[10px] bg-white/10 px-1.5 rounded text-muted-foreground">
                  {fileResults.length}
                </span>
              </button>
              
              {expandedFiles[file] && (
                <div className="ml-6 space-y-0.5 mt-0.5">
                  {fileResults.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => selectFile(res.file, true, parseInt(res.line))}
                      className="w-full text-left px-2 py-1 rounded hover:bg-white/5 text-xs text-muted-foreground transition-colors group flex items-start gap-2"
                    >
                      <span className="text-[10px] text-primary/70 shrink-0 mt-0.5">{res.line}</span>
                      <span className="truncate">{res.content}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
