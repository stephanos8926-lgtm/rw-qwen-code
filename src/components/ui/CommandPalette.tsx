import { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '@/src/context/WorkspaceContext';
import { Search, FileText, Settings, Plus, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { 
    files, 
    selectFile, 
    refreshFiles, 
    openTab, 
    createWorkspace,
    currentWorkspace
  } = useWorkspace();

  // Fetch search results when search query changes
  useEffect(() => {
    if (search.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(search)}&workspace=${encodeURIComponent(currentWorkspace)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, currentWorkspace]);

  // Handle keyboard shortcuts to open/close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleCustomEvent = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomEvent);
    };
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const commands = [
    {
      id: 'open-settings',
      title: 'Open Settings',
      icon: <Settings size={16} />,
      action: () => openTab('config', 'config', 'Configuration'),
      type: 'command'
    },
    {
      id: 'new-workspace',
      title: 'New Workspace',
      icon: <Plus size={16} />,
      action: () => {
        const name = prompt('Enter workspace name:');
        if (name) createWorkspace(name);
      },
      type: 'command'
    },
    {
      id: 'refresh-files',
      title: 'Refresh Files',
      icon: <RefreshCw size={16} />,
      action: () => refreshFiles(),
      type: 'command'
    }
  ];

  const fileItems = files.map(file => ({
    id: `file-${file}`,
    title: file,
    icon: <FileText size={16} />,
    action: () => selectFile(file),
    type: 'file'
  }));

  const searchItems = searchResults.map((res, i) => ({
    id: `search-${i}`,
    title: `${res.file}:${res.line}`,
    icon: <Search size={16} />,
    action: () => {
      selectFile(res.file, true, parseInt(res.line));
    },
    type: 'search',
    content: res.content
  }));

  const allItems: { id: string, title: string, icon: React.ReactNode, action: () => void, type: string, content?: string }[] = [...commands, ...fileItems, ...searchItems];

  const filteredItems = allItems.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) || 
    (item.type === 'search' && item.content.toLowerCase().includes(search.toLowerCase()))
  );

  // Handle keyboard navigation within the palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh]">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />

        {/* Palette */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-xl bg-[#1e1e1e] border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center px-4 py-3 border-b border-border">
            <Search size={18} className="text-muted-foreground mr-3" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search commands or files..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-muted-foreground text-base"
            />
            <div className="text-xs text-muted-foreground bg-white/10 px-2 py-1 rounded">ESC</div>
          </div>

          <div 
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto p-2"
          >
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            ) : (
              filteredItems.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm",
                    index === selectedIndex 
                      ? "bg-primary/20 text-primary" 
                      : "text-gray-300 hover:bg-white/5"
                  )}
                >
                  <div className="mr-3 flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 truncate">
                    <div className="text-sm">{item.title}</div>
                    {item.type === 'search' && (
                      <div className="text-xs text-muted-foreground truncate">{item.content}</div>
                    )}
                  </div>
                  {item.type === 'file' && (
                    <span className="text-xs text-muted-foreground ml-2">File</span>
                  )}
                  {item.type === 'search' && (
                    <span className="text-xs text-muted-foreground ml-2">Search</span>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
