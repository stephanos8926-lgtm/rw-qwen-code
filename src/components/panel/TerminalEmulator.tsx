import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useWorkspace } from '@/src/context/WorkspaceContext';
import { Terminal as TerminalIcon, Settings, Zap, Copy, ClipboardPaste, Trash2 } from 'lucide-react';

export function TerminalEmulator({ tabId }: { tabId: string }) {
  const { currentWorkspace, activeTabId } = useWorkspace();
  const [shellProfile, setShellProfile] = useState<'bash' | 'zsh' | 'sh'>('bash');
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const currentLineRef = useRef<string>('');
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);

  const activeFile = activeTabId && activeTabId !== 'config' ? activeTabId.split('/').pop() : null;

  const suggestions = activeFile ? [
    { label: `Explain ${activeFile}`, cmd: `qwen "Explain the code in ${activeFile}"` },
    { label: `Find bugs in ${activeFile}`, cmd: `qwen "Find bugs in ${activeFile}"` },
    { label: `Write tests for ${activeFile}`, cmd: `qwen "Write unit tests for ${activeFile}"` },
  ] : [
    { label: 'Summarize project', cmd: 'qwen "Summarize this project"' },
    { label: 'Check git status', cmd: 'git status' },
    { label: 'List files', cmd: 'ls -la' },
  ];

  const handleSuggestionClick = useCallback((cmd: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && xtermRef.current) {
      xtermRef.current.write(cmd + '\r\n');
      wsRef.current.send(cmd + '\n');
      currentLineRef.current = '';
      setTimeout(() => xtermRef.current?.write('$ '), 100);
    }
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new Terminal({
      theme: {
        background: '#0f111500', // Transparent to blend with our UI
        foreground: '#d1d5db', // text-gray-300
        cursor: '#3b82f6', // text-primary
        selectionBackground: '#ffffff20',
        black: '#000000',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#d946ef',
        cyan: '#06b6d4',
        white: '#ffffff',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Custom Keybindings
    term.attachCustomKeyEventHandler((arg) => {
      if (arg.ctrlKey && arg.shiftKey && arg.code === 'KeyC' && arg.type === 'keydown') {
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection);
        }
        return false;
      }
      if (arg.ctrlKey && arg.shiftKey && arg.code === 'KeyV' && arg.type === 'keydown') {
        navigator.clipboard.readText().then(text => {
          currentLineRef.current += text;
          term.write(text);
        });
        return false;
      }
      if (arg.ctrlKey && arg.code === 'KeyL' && arg.type === 'keydown') {
        term.clear();
        return false;
      }
      return true;
    });

    term.writeln('\x1b[1;34mQwen Code CLI Terminal\x1b[0m');
    term.writeln(`Connecting to backend (Workspace: ${currentWorkspace}, Shell: ${shellProfile})...`);

    // Initialize WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/terminal?workspace=${encodeURIComponent(currentWorkspace)}&shell=${encodeURIComponent(shellProfile)}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      term.writeln('\x1b[32mConnected successfully.\x1b[0m\r\n');
      term.write('$ ');
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onclose = () => {
      term.writeln('\r\n\x1b[31mDisconnected from backend.\x1b[0m');
    };

    // Handle user input
    currentLineRef.current = '';
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Simple local echo for the mockup
        if (data === '\r') {
          // Enter key
          term.write('\r\n');
          const cmd = currentLineRef.current.trim();
          if (cmd) {
            commandHistoryRef.current.push(cmd);
          }
          historyIndexRef.current = commandHistoryRef.current.length;
          ws.send(currentLineRef.current + '\n');
          currentLineRef.current = '';
          // Add a prompt after a short delay to simulate shell prompt
          setTimeout(() => term.write('$ '), 100);
        } else if (data === '\u007F') {
          // Backspace
          if (currentLineRef.current.length > 0) {
            currentLineRef.current = currentLineRef.current.slice(0, -1);
            term.write('\b \b');
          }
        } else if (data === '\x1b[A') {
          // Up arrow
          if (historyIndexRef.current > 0) {
            historyIndexRef.current -= 1;
            // Clear current line
            term.write('\x1b[2K\r$ ');
            currentLineRef.current = commandHistoryRef.current[historyIndexRef.current];
            term.write(currentLineRef.current);
          }
        } else if (data === '\x1b[B') {
          // Down arrow
          if (historyIndexRef.current < commandHistoryRef.current.length - 1) {
            historyIndexRef.current += 1;
            term.write('\x1b[2K\r$ ');
            currentLineRef.current = commandHistoryRef.current[historyIndexRef.current];
            term.write(currentLineRef.current);
          } else if (historyIndexRef.current === commandHistoryRef.current.length - 1) {
            historyIndexRef.current += 1;
            term.write('\x1b[2K\r$ ');
            currentLineRef.current = '';
          }
        } else if (data >= String.fromCharCode(0x20) && data <= String.fromCharCode(0x7E) || data >= '\u00a0') {
          // Only append printable characters
          currentLineRef.current += data;
          term.write(data);
        }
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
    };
  }, [currentWorkspace, shellProfile]);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#0f1115] overflow-hidden">
      {/* Terminal Header / Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1e1e1e] border-b border-[#333] shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon size={14} className="text-gray-400" />
          <select 
            value={shellProfile}
            onChange={(e) => setShellProfile(e.target.value as any)}
            className="bg-transparent text-xs text-gray-300 focus:outline-none cursor-pointer hover:text-white transition-colors"
          >
            <option value="bash">Bash</option>
            <option value="zsh">Zsh</option>
            <option value="sh">Sh</option>
          </select>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="hidden sm:inline-flex items-center gap-1" title="Ctrl+Shift+C"><Copy size={12} /> Copy</span>
          <span className="hidden sm:inline-flex items-center gap-1" title="Ctrl+Shift+V"><ClipboardPaste size={12} /> Paste</span>
          <span className="hidden sm:inline-flex items-center gap-1" title="Ctrl+L"><Trash2 size={12} /> Clear</span>
        </div>
      </div>

      {/* Qwen CLI Contextual Suggestions */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1b20] border-b border-[#2a2b30] overflow-x-auto no-scrollbar shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary shrink-0 mr-1">
          <Zap size={12} className="fill-primary/20" />
          <span>Qwen Actions:</span>
        </div>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => handleSuggestionClick(s.cmd)}
            className="shrink-0 px-2.5 py-1 text-xs bg-[#252526] hover:bg-[#2d2d30] border border-[#333] text-gray-300 rounded-md transition-colors whitespace-nowrap"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Terminal Container */}
      <div className="flex-1 p-2 overflow-hidden relative">
        <div ref={terminalRef} className="h-full w-full" />
      </div>
    </div>
  );
}
