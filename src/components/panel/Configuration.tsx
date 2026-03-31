import React, { useEffect, useRef, useState } from 'react';
import { Save, Check, Globe, Folder } from 'lucide-react';
import { useWorkspace } from '@/src/context/WorkspaceContext';

export function Configuration() {
  const { currentWorkspace } = useWorkspace();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState<'project' | 'global'>('project');
  const [authMethod, setAuthMethod] = useState<'oauth' | 'custom'>('oauth');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [cliBinaryPath, setCliBinaryPath] = useState('');
  const [agentModel, setAgentModel] = useState('qwen-coder');
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [maxTokens, setMaxTokens] = useState(4096);
  
  // General Settings
  const [theme, setTheme] = useState('system');
  const [autoSave, setAutoSave] = useState(true);
  const [formatOnSave, setFormatOnSave] = useState(false);
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [enableCodeSandbox, setEnableCodeSandbox] = useState(false);
  const [enableTelemetry, setEnableTelemetry] = useState(false);

  // Editor Settings
  const [fontSize, setFontSize] = useState(14);
  const [tabSize, setTabSize] = useState(2);

  const isGlobal = activeTab === 'global';

  const fetchConfig = async () => {
    try {
      const res = await fetch(`/api/config?global=${isGlobal}&workspace=${encodeURIComponent(currentWorkspace)}`);
      const data = await res.json();
      
      if (data.settings) {
        // Global settings
        setAuthMethod(data.settings.authMethod || 'oauth');
        setApiKey(data.settings.apiKey || '');
        setBaseUrl(data.settings.baseUrl || '');
        setCliBinaryPath(data.settings.cliBinaryPath || '');
        setTheme(data.settings.theme || 'system');
        setAutoSave(data.settings.autoSave ?? true);
        setFormatOnSave(data.settings.formatOnSave ?? false);
        setEnableTelemetry(data.settings.enableTelemetry ?? false);
        setFontSize(data.settings.fontSize ?? 14);
        setTabSize(data.settings.tabSize ?? 2);

        // Project settings
        setAgentModel(data.settings.agentModel || 'qwen-coder');
        setTemperature(data.settings.temperature ?? 0.7);
        setMaxTokens(data.settings.maxTokens ?? 4096);
        setEnableWebSearch(data.settings.enableWebSearch ?? true);
        setEnableCodeSandbox(data.settings.enableCodeSandbox ?? false);
      } else {
        // Reset to defaults
        setAuthMethod('oauth');
        setApiKey('');
        setBaseUrl('');
        setCliBinaryPath('');
        setAgentModel('qwen-coder');
        setTemperature(0.7);
        setMaxTokens(4096);
        setTheme('system');
        setAutoSave(true);
        setFormatOnSave(false);
        setEnableWebSearch(true);
        setEnableCodeSandbox(false);
        setEnableTelemetry(false);
        setFontSize(14);
        setTabSize(2);
      }
      
      setSystemPrompt(data.systemPrompt || '');
    } catch (error) {
      console.error('Failed to fetch config', error);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [activeTab, currentWorkspace]);

  useEffect(() => {
    // Auto-focus the container on mount, especially useful for mobile
    if (containerRef.current) {
      containerRef.current.focus();
      // On mobile, scroll to top
      if (window.innerWidth < 768) {
        containerRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settings = isGlobal ? {
        authMethod,
        apiKey,
        baseUrl,
        cliBinaryPath,
        theme,
        autoSave,
        formatOnSave,
        enableTelemetry,
        fontSize,
        tabSize
      } : {
        agentModel,
        temperature,
        maxTokens,
        enableWebSearch,
        enableCodeSandbox
      };
      
      await fetch(`/api/config?global=${isGlobal}&workspace=${encodeURIComponent(currentWorkspace)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, systemPrompt: isGlobal ? undefined : systemPrompt })
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save config', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      tabIndex={-1}
      className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#1e1e1e] text-gray-300 focus:outline-none"
    >
      <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">Workspace Configuration</h2>
            <p className="text-sm text-gray-400">Manage your Qwen Code CLI settings and preferences.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            {saveSuccess ? <Check size={18} /> : <Save size={18} />}
            {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Settings'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#333]">
          <button
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'project'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
            }`}
            onClick={() => setActiveTab('project')}
          >
            <Folder size={16} />
            Project Settings
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'global'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
            }`}
            onClick={() => setActiveTab('global')}
          >
            <Globe size={16} />
            Global Settings
          </button>
        </div>

        <div className="space-y-6">
          {/* Project Settings */}
          {activeTab === 'project' && (
            <div className="bg-[#252526] border border-[#333] rounded-lg p-4 md:p-5">
              <h3 className="text-lg font-medium text-white mb-4">Project Settings</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Agent Model</label>
                  <select 
                    value={agentModel}
                    onChange={(e) => setAgentModel(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="qwen-coder">qwen-coder (Default)</option>
                    <option value="qwen-turbo">qwen-turbo</option>
                    <option value="qwen-plus">qwen-plus</option>
                    <option value="qwen-max">qwen-max</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Select the underlying model for Qwen CLI.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Temperature (0.0 - 2.0)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="2" 
                      step="0.1" 
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-primary" 
                    />
                    <span className="text-sm font-mono bg-[#1e1e1e] px-2 py-1 rounded border border-[#333] w-12 text-center">
                      {temperature.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Higher values make output more random, lower values make it more deterministic.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Max Tokens</label>
                  <input 
                    type="number" 
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    placeholder="4096" 
                    className="w-full bg-[#1e1e1e] border border-[#333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors" 
                  />
                  <p className="text-xs text-gray-500 mt-1">The maximum number of tokens to generate in the response.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">System Prompt</label>
                  <textarea 
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="You are an expert software engineer..." 
                    className="w-full bg-[#1e1e1e] border border-[#333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors resize-y min-h-[120px]" 
                  />
                  <p className="text-xs text-gray-500 mt-1">Custom instructions to guide the agent's behavior. Saved to qwen.md in your project root.</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-200">Enable Web Search</div>
                    <div className="text-xs text-gray-500">Allow Qwen to search the web for up-to-date information</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={enableWebSearch}
                      onChange={(e) => setEnableWebSearch(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-200">Enable Code Sandbox</div>
                    <div className="text-xs text-gray-500">Allow Qwen to execute code in an isolated environment</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={enableCodeSandbox}
                      onChange={(e) => setEnableCodeSandbox(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Global Settings */}
          {activeTab === 'global' && (
            <div className="bg-[#252526] border border-[#333] rounded-lg p-4 md:p-5">
              <h3 className="text-lg font-medium text-white mb-4">Global Settings</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Authentication Method</label>
                  <select 
                    value={authMethod}
                    onChange={(e) => setAuthMethod(e.target.value as 'oauth' | 'custom')}
                    className="w-full bg-[#1e1e1e] border border-[#333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="oauth">OAuth (Default)</option>
                    <option value="custom">Custom API Key</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Choose how to authenticate with the Qwen service.</p>
                </div>

                {authMethod === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">API Key</label>
                      <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-..." 
                        className="w-full bg-[#1e1e1e] border border-[#333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors" 
                      />
                      <p className="text-xs text-gray-500 mt-1">Your Qwen API Key (stored locally).</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">Base URL</label>
                      <input 
                        type="text" 
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1" 
                        className="w-full bg-[#1e1e1e] border border-[#333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors" 
                      />
                      <p className="text-xs text-gray-500 mt-1">Custom API endpoint if using a proxy or local model.</p>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">CLI Binary Path</label>
                  <input 
                    type="text" 
                    value={cliBinaryPath}
                    onChange={(e) => setCliBinaryPath(e.target.value)}
                    placeholder="qwen" 
                    className="w-full bg-[#1e1e1e] border border-[#333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors" 
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave as default to use the binary in PATH.</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-200">Theme</div>
                    <div className="text-xs text-gray-500">Select your preferred UI theme</div>
                  </div>
                  <select 
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="bg-[#1e1e1e] border border-[#333] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-200">Auto Save</div>
                    <div className="text-xs text-gray-500">Automatically save files after editing</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-200">Format on Save</div>
                    <div className="text-xs text-gray-500">Format document when saving</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formatOnSave}
                      onChange={(e) => setFormatOnSave(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-200">Enable Telemetry</div>
                    <div className="text-xs text-gray-500">Send anonymous usage data to improve Qwen</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={enableTelemetry}
                      onChange={(e) => setEnableTelemetry(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Font Size</label>
                  <input 
                    type="number" 
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full bg-[#1e1e1e] border border-[#333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Tab Size</label>
                  <select 
                    value={tabSize}
                    onChange={(e) => setTabSize(parseInt(e.target.value))}
                    className="w-full bg-[#1e1e1e] border border-[#333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="2">2 spaces</option>
                    <option value="4">4 spaces</option>
                    <option value="8">8 spaces</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
