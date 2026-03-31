import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Tab {
  id: string;
  type: 'file' | 'config';
  title: string;
}

interface WorkspaceContextType {
  workspaces: string[];
  currentWorkspace: string;
  files: string[];
  activeFile: string | null;
  fileContent: string;
  isSaving: boolean;
  isLoading: boolean;
  openTabs: Tab[];
  activeTabId: string | null;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  switchWorkspace: (name: string) => void;
  refreshFiles: () => Promise<void>;
  selectFile: (filename: string, addToTabs?: boolean) => Promise<void>;
  saveFile: (content: string) => Promise<void>;
  openTab: (id: string, type: 'file' | 'config', title: string) => void;
  closeTab: (id: string) => void;
  setActiveTabId: (id: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<string>('default');
  const [files, setFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const refreshWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces');
      const data = await res.json();
      setWorkspaces(data.workspaces || []);
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
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
  };

  const refreshFiles = async () => {
    try {
      const res = await fetch(`/api/files?workspace=${encodeURIComponent(currentWorkspace)}`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  const openTab = (id: string, type: 'file' | 'config', title: string) => {
    setOpenTabs((prev) => {
      if (!prev.find(t => t.id === id)) {
        return [...prev, { id, type, title }];
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
        } else {
          setActiveFile(null);
        }
      } else {
        setActiveFile(null);
      }
    }
  };

  const selectFile = async (filename: string, addToTabs = true) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/files/${filename}?workspace=${encodeURIComponent(currentWorkspace)}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
        setActiveFile(filename);
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

  // When activeTabId changes to a file, load it if it's not the active file
  useEffect(() => {
    const activeTab = openTabs.find(t => t.id === activeTabId);
    if (activeTab && activeTab.type === 'file' && activeTab.id !== activeFile) {
      selectFile(activeTab.id, false);
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
        activeFile,
        fileContent,
        isSaving,
        isLoading,
        openTabs,
        activeTabId,
        refreshWorkspaces,
        createWorkspace,
        switchWorkspace,
        refreshFiles,
        selectFile,
        saveFile,
        openTab,
        closeTab,
        setActiveTabId
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
