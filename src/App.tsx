/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MainEditor } from './components/layout/MainEditor';
import { SidePanel } from './components/layout/SidePanel';
import { ChatInterface } from './components/panel/ChatInterface';
import { TerminalEmulator } from './components/panel/TerminalEmulator';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { CommandPalette } from './components/ui/CommandPalette';
import { Folder, Code2, TerminalSquare } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useMediaQuery } from './hooks/useMediaQuery';

export default function App() {
  const [mobileTab, setMobileTab] = useState<'files' | 'editor' | 'panel'>('editor');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <WorkspaceProvider>
      <CommandPalette />
      <div className="h-screen w-screen flex flex-col bg-background text-gray-100 overflow-hidden font-sans">
        
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {isDesktop ? (
            <Group orientation="horizontal">
              <Panel defaultSize={20} minSize={15} maxSize={30} className="flex">
                <Sidebar className="w-full" />
              </Panel>
              
              <Separator className="w-1 bg-[#333333] hover:bg-primary transition-colors cursor-col-resize" />
              
              <Panel defaultSize={60} className="flex flex-col">
                <Group orientation="vertical">
                  <Panel defaultSize={70} minSize={30} className="flex">
                    <MainEditor className="w-full" />
                  </Panel>
                  
                  <Separator className="h-1 bg-[#333333] hover:bg-primary transition-colors cursor-row-resize" />
                  
                  <Panel defaultSize={30} minSize={15} className="flex flex-col bg-[#1e1e1e]">
                    <div className="h-8 bg-[#252526] border-b border-[#333333] flex items-center px-4 text-xs font-medium text-[#cccccc] uppercase tracking-wider shrink-0">
                      Terminal
                    </div>
                    <div className="flex-1 relative">
                      <TerminalEmulator />
                    </div>
                  </Panel>
                </Group>
              </Panel>
              
              <Separator className="w-1 bg-[#333333] hover:bg-primary transition-colors cursor-col-resize" />
              
              <Panel defaultSize={20} minSize={15} maxSize={40} className="flex flex-col bg-[#1e1e1e]">
                <div className="h-8 bg-[#252526] border-b border-[#333333] flex items-center px-4 text-xs font-medium text-[#cccccc] uppercase tracking-wider shrink-0">
                  Chat
                </div>
                <div className="flex-1 relative">
                  <ChatInterface />
                </div>
              </Panel>
            </Group>
          ) : (
            <>
              <Sidebar className={mobileTab === 'files' ? 'flex w-full' : 'hidden'} />
              <MainEditor className={mobileTab === 'editor' ? 'flex w-full' : 'hidden'} />
              <SidePanel className={mobileTab === 'panel' ? 'flex w-full' : 'hidden'} />
            </>
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        {!isDesktop && (
          <div className="h-14 border-t border-border glass-panel flex items-center justify-around shrink-0 z-50 bg-surface-elevated">
            <button 
              onClick={() => setMobileTab('files')}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${mobileTab === 'files' ? 'text-primary' : 'text-muted-foreground hover:text-gray-300'}`}
            >
              <Folder size={20} />
              <span className="text-[10px] mt-1 font-medium">Files</span>
            </button>
            <button 
              onClick={() => setMobileTab('editor')}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${mobileTab === 'editor' ? 'text-primary' : 'text-muted-foreground hover:text-gray-300'}`}
            >
              <Code2 size={20} />
              <span className="text-[10px] mt-1 font-medium">Editor</span>
            </button>
            <button 
              onClick={() => setMobileTab('panel')}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${mobileTab === 'panel' ? 'text-primary' : 'text-muted-foreground hover:text-gray-300'}`}
            >
              <TerminalSquare size={20} />
              <span className="text-[10px] mt-1 font-medium">Terminal</span>
            </button>
          </div>
        )}

      </div>
    </WorkspaceProvider>
  );
}
