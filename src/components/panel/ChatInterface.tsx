import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, AlertCircle, RefreshCw } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { useWorkspace } from '@/src/context/WorkspaceContext';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
}

export function ChatInterface() {
  const { currentWorkspace } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus('connecting');
    setMessages([
      { id: '1', role: 'assistant', content: `Connected to workspace: **${currentWorkspace}**.\n\nHow can I help you build today?` }
    ]);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/chat?workspace=${encodeURIComponent(currentWorkspace)}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`Connected to Chat WebSocket for workspace: ${currentWorkspace}`);
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'system_message') {
          const data = message.data;
          
          if (data.type === 'content') {
            setMessages((prev) => {
              const newMessages = [...prev];
              let lastMessage = newMessages[newMessages.length - 1];
              
              if (!lastMessage || lastMessage.role !== 'assistant') {
                lastMessage = { id: Date.now().toString(), role: 'assistant', content: '' };
                newMessages.push(lastMessage);
              }
              
              lastMessage.content += data.content;
              return newMessages;
            });
          } else if (data.type === 'completed') {
            setIsStreaming(false);
          } else if (data.type === 'tool_call_request') {
            setMessages((prev) => {
              const newMessages = [...prev];
              const toolName = data.toolCall?.name || 'tool';
              newMessages.push({ 
                id: Date.now().toString(), 
                role: 'system', 
                content: `🛠️ Executing tool: **${toolName}**...` 
              });
              return newMessages;
            });
          } else if (data.type === 'thought') {
            setMessages((prev) => {
              const newMessages = [...prev];
              let lastMessage = newMessages[newMessages.length - 1];
              
              if (!lastMessage || lastMessage.role !== 'system') {
                lastMessage = { id: Date.now().toString(), role: 'system', content: '' };
                newMessages.push(lastMessage);
              }
              
              lastMessage.content += `\n> 💭 ${data.thought}`;
              return newMessages;
            });
          } else if (data.type === 'processing') {
            // Optional: show processing state
          } else if (data.type === 'welcome') {
            // Optional: handle welcome message
          } else if (data.type === 'error') {
            setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'error', content: data.message || 'An error occurred' }]);
            setIsStreaming(false);
          }
        } else if (message.type === 'error') {
          setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'error', content: message.data }]);
          setIsStreaming(false);
        }
      } catch (error) {
        console.error('Error parsing chat message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from Chat WebSocket');
      setStatus('disconnected');
      setIsStreaming(false);
    };
  }, [currentWorkspace]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming || status !== 'connected') return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages((prev) => [...prev, userMessage, { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }]);
    setInput('');
    setIsStreaming(true);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'user_message',
        data: { text: userMessage.content }
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRegenerate = () => {
    if (isStreaming || status !== 'connected') return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: 'Please rephrase your last answer.'
    };

    setMessages((prev) => [...prev, userMessage, { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }]);
    setIsStreaming(true);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'user_message',
        data: { text: userMessage.content }
      }));
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => {
            const isLastMessage = index === messages.length - 1;
            return (
            <motion.div 
              key={msg.id} 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : msg.role === 'error' || msg.role === 'system' ? 'items-center' : 'items-start'}`}
            >
              {msg.role !== 'error' && msg.role !== 'system' && (
                <span className={`text-xs font-medium uppercase tracking-wider ${msg.role === 'user' ? 'text-primary' : 'text-muted-foreground'}`}>
                  {msg.role === 'user' ? 'You' : 'Qwen'}
                </span>
              )}
              
              {msg.role === 'error' ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm max-w-[85%] text-center my-2">
                  <span className="font-semibold block mb-1 flex items-center justify-center gap-1">
                    <AlertCircle size={14} /> Connection Error
                  </span>
                  {msg.content}
                </div>
              ) : msg.role === 'system' ? (
                <div className="text-muted-foreground text-xs bg-white/5 px-3 py-1.5 rounded-full my-2">
                  {msg.content}
                </div>
              ) : (
                <div 
                  className={`p-3 rounded-lg text-sm leading-relaxed shadow-md max-w-[90%] ${
                    msg.role === 'user' 
                      ? 'bg-primary/20 rounded-tr-none border border-primary/30 text-blue-50' 
                      : 'bg-surface-elevated rounded-tl-none border border-border text-gray-200'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div className="markdown-body prose prose-invert prose-sm max-w-none">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}
                </div>
              )}
              
              {isLastMessage && msg.role === 'assistant' && !isStreaming && status === 'connected' && (
                <button 
                  onClick={handleRegenerate} 
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary mt-1 px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
                >
                  <RefreshCw size={10} /> Regenerate response
                </button>
              )}
            </motion.div>
          )})}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-background/40 backdrop-blur-md flex flex-col gap-2">
        {status === 'disconnected' && (
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>Disconnected from Qwen CLI</span>
            </div>
            <button 
              onClick={connect}
              className="flex items-center gap-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded-md transition-colors"
            >
              <RefreshCw size={12} />
              Reconnect
            </button>
          </div>
        )}
        <div className="relative flex items-center">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status === 'connected' ? "Ask Qwen... (e.g. /resume)" : "Disconnected..."}
            className="w-full bg-surface-elevated border border-border rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none h-12 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
            disabled={isStreaming || status !== 'connected'}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || status !== 'connected'}
            className="absolute right-2 p-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-colors shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="mt-2 text-center">
          <span className="text-[10px] text-muted-foreground">Press Enter to send, Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
}
