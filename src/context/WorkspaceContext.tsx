import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WorkspaceContextType {
  files: string[];
  activeFile: string | null;
  fileContent: string;
  isSaving: boolean;
  isLoading: boolean;
  refreshFiles: () => Promise<void>;
  selectFile: (filename: string) => Promise<void>;
  saveFile: (content: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refreshFiles = async () => {
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  const selectFile = async (filename: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/files/${filename}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
        setActiveFile(filename);
      } else {
        console.error('Failed to load file content');
      }
    } catch (error) {
      console.error('Error loading file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFile = async (content: string) => {
    if (!activeFile) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/files/${activeFile}`, {
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
    refreshFiles();
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        files,
        activeFile,
        fileContent,
        isSaving,
        isLoading,
        refreshFiles,
        selectFile,
        saveFile,
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
