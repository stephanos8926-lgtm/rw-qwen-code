/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sidebar } from './components/layout/Sidebar';
import { MainEditor } from './components/layout/MainEditor';
import { SidePanel } from './components/layout/SidePanel';
import { WorkspaceProvider } from './context/WorkspaceContext';

export default function App() {
  return (
    <WorkspaceProvider>
      <div className="h-screen w-screen flex bg-background text-gray-100 overflow-hidden font-sans">
        <Sidebar />
        <MainEditor />
        <SidePanel />
      </div>
    </WorkspaceProvider>
  );
}
