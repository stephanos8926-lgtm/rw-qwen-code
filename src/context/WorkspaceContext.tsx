import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Tab {
  id: string;
  type: 'file' | 'config' | 'qwen-resource';
  title: string;
  metadata?: {
    type: 'skills' | 'agents';
    scope: 'global' | 'project';
    name: string;
  };
}

export interface GitStatus {
  isRepo: boolean;
  status?: {
    files: { path: string; index: string; working_dir: string }[];
    ahead: number;
    behind: number;
    current: string;
    tracking: string;
  };
}

interface WorkspaceContextType {
  workspaces: string[];
  currentWorkspace: string;
  files: string[];
  tree: any[];
  activeFile: string | null;
  activeLine: number | null;
  fileContent: string;
  isSaving: boolean;
  isLoading: boolean;
  gitStatus: GitStatus | null;
  openTabs: Tab[];
  activeTabId: string | null;
  recentFiles: string[];
  terminalTabs: string[];
  activeTerminalTabId: string | null;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  switchWorkspace: (name: string) => void;
  refreshFiles: () => Promise<void>;
  refreshGitStatus: () => Promise<void>;
  selectFile: (filename: string, addToTabs?: boolean, line?: number) => Promise<void>;
  selectQwenResource: (type: 'skills' | 'agents', scope: 'global' | 'project', name: string) => Promise<void>;
  saveFile: (content: string) => Promise<void>;
  saveQwenResource: (content: string) => Promise<void>;
  openTab: (id: string, type: 'file' | 'config' | 'qwen-resource', title: string, metadata?: any) => void;
  closeTab: (id: string) => void;
  setActiveTabId: (id: string | null) => void;
  setActiveLine: (line: number | null) => void;
  addToRecentFiles: (filename: string) => void;
  addTerminalTab: () => void;
  closeTerminalTab: (id: string) => void;
  setActiveTerminalTabId: (id: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<string>('default');
  const [files, setFiles] = useState<string[]>([]);
  const [tree, setTree] = useState<any[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  const addToRecentFiles = (filename: string) => {
    setRecentFiles((prev) => {
      const newRecent = [filename, ...prev.filter((f) => f !== filename)];
      return newRecent.slice(0, 10);
    });
  };

  const [terminalTabs, setTerminalTabs] = useState<string[]>(['terminal-1']);
  const [activeTerminalTabId, setActiveTerminalTabId] = useState<string | null>('terminal-1');

  const addTerminalTab = () => {
    const id = `terminal-${Date.now()}`;
    setTerminalTabs((prev) => [...prev, id]);
    setActiveTerminalTabId(id);
  };

  const closeTerminalTab = (id: string) => {
    setTerminalTabs((prev) => {
      const newTabs = prev.filter((t) => t !== id);
      if (activeTerminalTabId === id) {
        setActiveTerminalTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
      }
      return newTabs;
    });
  };

  const refreshWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces');
      const data = await res.json();
      setWorkspaces(data.workspaces || []);
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    }
  };

  const refreshGitStatus = async () => {
    try {
      const res = await fetch(`/api/git/status?workspace=${encodeURIComponent(currentWorkspace)}`);
      const data = await res.json();
      setGitStatus(data);
    } catch (error) {
      console.error('Failed to fetch git status:', error);
      setGitStatus(null);
    }
  };

  const createWorkspace = async (name: string) => {
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        await refreshWorkspaces();
        switchWorkspace(name);
      }
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  const switchWorkspace = (name: string) => {
    setCurrentWorkspace(name);
    setOpenTabs([]);
    setActiveTabId(null);
    setActiveFile(null);
    setFileContent('');
    setGitStatus(null);
  };

  const refreshFiles = async () => {
    try {
      const res = await fetch(`/api/files?workspace=${encodeURIComponent(currentWorkspace)}`);
      const data = await res.json();
      setFiles(data.files || []);
      setTree(data.tree || []);
      refreshGitStatus();
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  const openTab = (id: string, type: 'file' | 'config' | 'qwen-resource', title: string, metadata?: any) => {
    setOpenTabs((prev) => {
      if (!prev.find(t => t.id === id)) {
        return [...prev, { id, type, title, metadata }];
      }
      return prev;
    });
    setActiveTabId(id);
  };

  const closeTab = (id: string) => {
    setOpenTabs((prev) => {
      const newTabs = prev.filter(t => t.id !== id);
      return newTabs;
    });
    
    if (activeTabId === id) {
      const currentTabs = openTabs;
      const newTabs = currentTabs.filter(t => t.id !== id);
      const nextActive = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      setActiveTabId(nextActive);
      if (nextActive) {
        const nextTab = newTabs.find(t => t.id === nextActive);
        if (nextTab && nextTab.type === 'file') {
          selectFile(nextTab.id, false); // Don't re-add to tabs
        } else if (nextTab && nextTab.type === 'qwen-resource' && nextTab.metadata) {
          selectQwenResource(nextTab.metadata.type, nextTab.metadata.scope, nextTab.metadata.name);
        } else {
          setActiveFile(null);
        }
      } else {
        setActiveFile(null);
      }
    }
  };

  const selectFile = async (filename: string, addToTabs = true, line?: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/files/${filename}?workspace=${encodeURIComponent(currentWorkspace)}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
        setActiveFile(filename);
        setActiveLine(line || null);
        addToRecentFiles(filename);
        if (addToTabs) {
          openTab(filename, 'file', filename);
        }
      } else {
        console.error('Failed to load file content');
      }
    } catch (error) {
      console.error('Error loading file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectQwenResource = async (type: 'skills' | 'agents', scope: 'global' | 'project', name: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/qwen/resource/content?workspace=${encodeURIComponent(currentWorkspace)}&type=${type}&scope=${scope}&name=${name}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
        setActiveFile(null); // It's not a regular file
        setActiveLine(null);
        const id = `qwen-${type}-${scope}-${name}`;
        openTab(id, 'qwen-resource', name, { type, scope, name });
      } else {
        console.error('Failed to load qwen resource content');
      }
    } catch (error) {
      console.error('Error loading qwen resource:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // When activeTabId changes to a file or resource, load it if it's not the active file/resource
  useEffect(() => {
    const activeTab = openTabs.find(t => t.id === activeTabId);
    if (activeTab && activeTab.type === 'file' && activeTab.id !== activeFile) {
      selectFile(activeTab.id, false);
    } else if (activeTab && activeTab.type === 'qwen-resource' && activeTab.metadata) {
      // Check if it's already loaded?
      // For now, just reload to be safe
      selectQwenResource(activeTab.metadata.type, activeTab.metadata.scope, activeTab.metadata.name);
    } else if (activeTab && activeTab.type === 'config') {
      setActiveFile(null);
    }
  }, [activeTabId]);

  const saveFile = async (content: string) => {
    if (!activeFile) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/files/${activeFile}?workspace=${encodeURIComponent(currentWorkspace)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setFileContent(content);
      } else {
        console.error('Failed to save file');
      }
    } catch (error) {
      console.error('Error saving file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const saveQwenResource = async (content: string) => {
    const activeTab = openTabs.find(t => t.id === activeTabId);
    if (!activeTab || activeTab.type !== 'qwen-resource' || !activeTab.metadata) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/qwen/resource/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace: currentWorkspace,
          type: activeTab.metadata.type,
          scope: activeTab.metadata.scope,
          name: activeTab.metadata.name,
          content
        }),
      });
      if (res.ok) {
        setFileContent(content);
      } else {
        console.error('Failed to save qwen resource');
      }
    } catch (error) {
      console.error('Error saving qwen resource:', error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    refreshWorkspaces();
  }, []);

  useEffect(() => {
    refreshFiles();
  }, [currentWorkspace]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        files,
        tree,
        activeFile,
        activeLine,
        fileContent,
        isSaving,
        isLoading,
        gitStatus,
        openTabs,
        activeTabId,
        recentFiles,
        terminalTabs,
        activeTerminalTabId,
        refreshWorkspaces,
        createWorkspace,
        switchWorkspace,
        refreshFiles,
        refreshGitStatus,
        selectFile,
        selectQwenResource,
        saveFile,
        saveQwenResource,
        openTab,
        closeTab,
        setActiveTabId,
        setActiveLine,
        addToRecentFiles,
        addTerminalTab,
        closeTerminalTab,
        setActiveTerminalTabId
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
