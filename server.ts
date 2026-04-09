import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import os from 'os';
import simpleGit from 'simple-git';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- REST API Routes ---
  
  // Base Workspaces Directory
  const WORKSPACES_BASE_DIR = path.join(__dirname, 'workspaces');
  await fs.mkdir(WORKSPACES_BASE_DIR, { recursive: true });

  const getWorkspaceDir = async (workspaceName: string) => {
    const safeName = workspaceName ? path.basename(workspaceName) : 'default';
    const dir = path.join(WORKSPACES_BASE_DIR, safeName);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  };

  async function buildFileTree(dir: string, baseDir: string): Promise<any[]> {
    const items = await fs.readdir(dir, { withFileTypes: true });
    const tree = [];
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      const relativePath = path.relative(baseDir, fullPath);
      if (item.isDirectory()) {
        tree.push({
          name: item.name,
          path: relativePath,
          type: 'directory',
          children: await buildFileTree(fullPath, baseDir)
        });
      } else {
        tree.push({
          name: item.name,
          path: relativePath,
          type: 'file'
        });
      }
    }
    return tree;
  }

  // Git Status
  app.get('/api/git/status', async (req, res) => {
    try {
      const workspace = req.query.workspace as string || 'default';
      const dir = await getWorkspaceDir(workspace);
      const git = simpleGit(dir);
      
      // Check if it's a git repo
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        return res.json({ isRepo: false });
      }

      const status = await git.status();
      res.json({ isRepo: true, status });
    } catch (error) {
      console.error('Git status error:', error);
      res.status(500).json({ error: 'Failed to get git status' });
    }
  });

  // Git Commit
  app.post('/api/git/commit', async (req, res) => {
    try {
      const workspace = req.query.workspace as string || 'default';
      const dir = await getWorkspaceDir(workspace);
      const git = simpleGit(dir);
      const { message } = req.body;
      await git.add('.');
      await git.commit(message);
      res.json({ success: true });
    } catch (error) {
      console.error('Git commit error:', error);
      res.status(500).json({ error: 'Failed to commit' });
    }
  });

  // Git Push
  app.post('/api/git/push', async (req, res) => {
    try {
      const workspace = req.query.workspace as string || 'default';
      const dir = await getWorkspaceDir(workspace);
      const git = simpleGit(dir);
      await git.push();
      res.json({ success: true });
    } catch (error) {
      console.error('Git push error:', error);
      res.status(500).json({ error: 'Failed to push' });
    }
  });

  // Git Pull
  app.post('/api/git/pull', async (req, res) => {
    try {
      const workspace = req.query.workspace as string || 'default';
      const dir = await getWorkspaceDir(workspace);
      const git = simpleGit(dir);
      await git.pull();
      res.json({ success: true });
    } catch (error) {
      console.error('Git pull error:', error);
      res.status(500).json({ error: 'Failed to pull' });
    }
  });

  // Ensure default workspace exists and seed it
  try {
    const defaultDir = await getWorkspaceDir('default');
    const existingFiles = await fs.readdir(defaultDir);
    if (existingFiles.length === 0) {
      await fs.writeFile(path.join(defaultDir, 'qwen.md'), '# Qwen Configuration\n\nThis is the main configuration file for the Qwen Code CLI.\n\n- Model: qwen-coder\n- Temperature: 0.7\n', 'utf-8');
      await fs.writeFile(path.join(defaultDir, 'hello.ts'), 'export function greet() {\n  console.log("Hello from Qwen Code CLI!");\n}\n', 'utf-8');
    }
  } catch (e) {
    console.error("Failed to seed default workspace:", e);
  }

  // List workspaces
  app.get('/api/workspaces', async (req, res) => {
    try {
      const workspaces = await fs.readdir(WORKSPACES_BASE_DIR);
      res.json({ workspaces });
    } catch (error) {
      res.status(500).json({ error: 'Failed to read workspaces' });
    }
  });

  // Create workspace
  app.post('/api/workspaces', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });
      await getWorkspaceDir(name);
      res.json({ success: true, name });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create workspace' });
    }
  });

  // List files
  app.get('/api/files', async (req, res) => {
    try {
      const workspace = req.query.workspace as string || 'default';
      const dir = await getWorkspaceDir(workspace);
      const files = await fs.readdir(dir);
      const tree = await buildFileTree(dir, dir);
      res.json({ files, tree });
    } catch (error) {
      res.status(500).json({ error: 'Failed to read workspace' });
    }
  });

  // Search files
  app.get('/api/search', async (req, res) => {
    try {
      const workspace = req.query.workspace as string || 'default';
      const query = req.query.q as string;
      if (!query) return res.status(400).json({ error: 'Query is required' });
      
      const dir = await getWorkspaceDir(workspace);
      
      // Use grep to search files
      const grep = spawn('grep', ['-rI', '-n', query, dir]);
      
      let output = '';
      grep.stdout.on('data', (data) => { output += data.toString(); });
      
      grep.on('close', (code) => {
        const results = output.split('\n').filter(line => line.trim() !== '').map(line => {
          const [file, lineNum, ...content] = line.split(':');
          return {
            file: path.relative(dir, file),
            line: lineNum,
            content: content.join(':').trim()
          };
        });
        res.json({ results });
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Failed to search' });
    }
  });

  // Replace in files
  app.post('/api/replace', async (req, res) => {
    try {
      const { workspace, search, replace } = req.body;
      if (!search) return res.status(400).json({ error: 'Search query is required' });
      
      const dir = await getWorkspaceDir(workspace || 'default');
      
      // Find files containing the search string
      const grep = spawn('grep', ['-rlI', search, dir]);
      let output = '';
      grep.stdout.on('data', (data) => { output += data.toString(); });
      
      grep.on('close', async (code) => {
        const files = output.split('\n').filter(line => line.trim() !== '');
        
        const results = [];
        for (const file of files) {
          try {
            const content = await fs.readFile(file, 'utf-8');
            const newContent = content.split(search).join(replace || '');
            if (content !== newContent) {
              await fs.writeFile(file, newContent, 'utf-8');
              results.push(path.relative(dir, file));
            }
          } catch (e) {
            console.error(`Failed to replace in file ${file}:`, e);
          }
        }
        
        res.json({ success: true, replacedIn: results });
      });
    } catch (error) {
      console.error('Replace error:', error);
      res.status(500).json({ error: 'Failed to replace' });
    }
  });

  // Read file
  app.get('/api/files/:filename', async (req, res) => {
    try {
      const workspace = req.query.workspace as string || 'default';
      const dir = await getWorkspaceDir(workspace);
      const content = await fs.readFile(path.join(dir, req.params.filename), 'utf-8');
      res.json({ content });
    } catch (error) {
      res.status(404).json({ error: 'File not found' });
    }
  });

  // Save file
  app.post('/api/files/:filename', async (req, res) => {
    try {
      const workspace = req.query.workspace as string || 'default';
      const dir = await getWorkspaceDir(workspace);
      const { content } = req.body;
      await fs.writeFile(path.join(dir, req.params.filename), content, 'utf-8');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save file' });
    }
  });

  // Delete file
  app.delete('/api/files/:filename', async (req, res) => {
    try {
      const workspace = req.query.workspace as string || 'default';
      const dir = await getWorkspaceDir(workspace);
      await fs.unlink(path.join(dir, req.params.filename));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // Rename file
  app.post('/api/files/:filename/rename', async (req, res) => {
    try {
      const workspace = req.query.workspace as string || 'default';
      const dir = await getWorkspaceDir(workspace);
      const { newName } = req.body;
      await fs.rename(path.join(dir, req.params.filename), path.join(dir, newName));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to rename file' });
    }
  });

  // New Folder
  app.post('/api/files/mkdir', async (req, res) => {
    try {
      const workspace = req.query.workspace as string || 'default';
      const dir = await getWorkspaceDir(workspace);
      const { folderName } = req.body;
      await fs.mkdir(path.join(dir, folderName), { recursive: true });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create folder' });
    }
  });

  // Copy file/folder
  app.post('/api/files/copy', async (req, res) => {
    try {
      const workspace = req.query.workspace as string || 'default';
      const dir = await getWorkspaceDir(workspace);
      const { source, destination } = req.body;
      await fs.copyFile(path.join(dir, source), path.join(dir, destination));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to copy file' });
    }
  });

  // --- Configuration API Routes ---
  
  const getSettingsPath = (workspace: string, isGlobal: boolean) => {
    if (isGlobal) {
      return path.join(os.homedir(), '.qwen', 'settings.json');
    } else {
      const safeName = workspace ? path.basename(workspace) : 'default';
      return path.join(WORKSPACES_BASE_DIR, safeName, '.qwen', 'settings.json');
    }
  };

  const getSystemPromptPath = (workspace: string, isGlobal: boolean) => {
    if (isGlobal) {
      return path.join(os.homedir(), '.qwen', 'qwen.md');
    } else {
      const safeName = workspace ? path.basename(workspace) : 'default';
      return path.join(WORKSPACES_BASE_DIR, safeName, 'qwen.md');
    }
  };

  app.get('/api/config', async (req, res) => {
    try {
      const workspace = req.query.workspace as string || 'default';
      const isGlobal = req.query.global === 'true';
      
      const settingsPath = getSettingsPath(workspace, isGlobal);
      const promptPath = getSystemPromptPath(workspace, isGlobal);
      
      let settings = {};
      try {
        const settingsContent = await fs.readFile(settingsPath, 'utf-8');
        settings = JSON.parse(settingsContent);
      } catch (e) {
        // Settings file might not exist yet
      }
      
      let systemPrompt = '';
      try {
        systemPrompt = await fs.readFile(promptPath, 'utf-8');
      } catch (e) {
        // Prompt file might not exist yet
      }
      
      res.json({ settings, systemPrompt });
    } catch (error) {
      console.error('Error reading config:', error);
      res.status(500).json({ error: 'Failed to read configuration' });
    }
  });

  app.post('/api/config', async (req, res) => {
    try {
      const workspace = req.query.workspace as string || 'default';
      const isGlobal = req.query.global === 'true';
      const { settings, systemPrompt } = req.body;
      
      const settingsPath = getSettingsPath(workspace, isGlobal);
      const promptPath = getSystemPromptPath(workspace, isGlobal);
      
      // Ensure directories exist
      await fs.mkdir(path.dirname(settingsPath), { recursive: true });
      await fs.mkdir(path.dirname(promptPath), { recursive: true });
      
      if (settings) {
        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      }
      
      if (systemPrompt !== undefined) {
        await fs.writeFile(promptPath, systemPrompt, 'utf-8');
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving config:', error);
      res.status(500).json({ error: 'Failed to save configuration' });
    }
  });

  // Context
  app.get('/api/context', async (req, res) => {
    const workspaceName = req.query.workspace as string || 'default';
    let settings: any = {};
    try {
      const globalSettingsContent = await fs.readFile(getSettingsPath(workspaceName, true), 'utf-8');
      settings = { ...settings, ...JSON.parse(globalSettingsContent) };
    } catch (e) {}
    try {
      const projectSettingsContent = await fs.readFile(getSettingsPath(workspaceName, false), 'utf-8');
      settings = { ...settings, ...JSON.parse(projectSettingsContent) };
    } catch (e) {}

    res.json({ activeAgent: settings.agentModel || 'qwen-coder', loadedSkills: [] });
  });

  // --- Qwen Resources API (Skills & Subagents) ---
  
  const getQwenResourcePath = (workspace: string, type: 'skills' | 'agents', scope: 'global' | 'project', name: string) => {
    if (scope === 'global') {
      return path.join(os.homedir(), '.qwen', type, name);
    } else {
      const safeName = workspace ? path.basename(workspace) : 'default';
      return path.join(WORKSPACES_BASE_DIR, safeName, '.qwen', type, name);
    }
  };

  app.get('/api/qwen/resources', async (req, res) => {
    try {
      const workspace = req.query.workspace as string || 'default';
      const types: ('skills' | 'agents')[] = ['skills', 'agents'];
      const scopes: ('global' | 'project')[] = ['global', 'project'];
      
      const results: any = { skills: { global: [], project: [] }, agents: { global: [], project: [] } };
      
      for (const type of types) {
        for (const scope of scopes) {
          const dir = scope === 'global' 
            ? path.join(os.homedir(), '.qwen', type)
            : path.join(WORKSPACES_BASE_DIR, workspace ? path.basename(workspace) : 'default', '.qwen', type);
          
          try {
            await fs.mkdir(dir, { recursive: true });
            const files = await fs.readdir(dir);
            results[type][scope] = files.filter(f => f.endsWith('.md')).map(f => ({
              name: f,
              path: f,
              type: 'file'
            }));
          } catch (e) {
            // Directory might not exist or be accessible
          }
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error('Error listing qwen resources:', error);
      res.status(500).json({ error: 'Failed to list resources' });
    }
  });

  app.get('/api/qwen/resource/content', async (req, res) => {
    try {
      const { workspace, type, scope, name } = req.query as any;
      const filePath = getQwenResourcePath(workspace, type, scope, name);
      const content = await fs.readFile(filePath, 'utf-8');
      res.json({ content });
    } catch (error) {
      res.status(404).json({ error: 'Resource not found' });
    }
  });

  app.post('/api/qwen/resource/content', async (req, res) => {
    try {
      const { workspace, type, scope, name, content } = req.body;
      const filePath = getQwenResourcePath(workspace, type, scope, name);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save resource' });
    }
  });

  app.post('/api/qwen/resource/create', async (req, res) => {
    try {
      const { workspace, type, scope, name } = req.body;
      const filePath = getQwenResourcePath(workspace, type, scope, name.endsWith('.md') ? name : `${name}.md`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `# ${name}\n\nDescription of this ${type.slice(0, -1)}...`, 'utf-8');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create resource' });
    }
  });

  app.delete('/api/qwen/resource/delete', async (req, res) => {
    try {
      const { workspace, type, scope, name } = req.query as any;
      const filePath = getQwenResourcePath(workspace, type, scope, name);
      await fs.unlink(filePath);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete resource' });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // --- Start HTTP Server ---
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // --- WebSocket Server ---
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/chat' || pathname === '/terminal') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (ws, request) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const pathname = url.pathname;
    const workspaceName = url.searchParams.get('workspace') || 'default';
    const workspaceDir = await getWorkspaceDir(workspaceName);
    
    if (pathname === '/chat') {
      console.log(`Client connected to /chat (Workspace: ${workspaceName})`);
      
      // Load settings to determine CLI path and env vars
      let settings: any = {};
      try {
        const globalSettingsContent = await fs.readFile(getSettingsPath(workspaceName, true), 'utf-8');
        settings = { ...settings, ...JSON.parse(globalSettingsContent) };
      } catch (e) {}
      
      try {
        const projectSettingsContent = await fs.readFile(getSettingsPath(workspaceName, false), 'utf-8');
        settings = { ...settings, ...JSON.parse(projectSettingsContent) };
      } catch (e) {}

      const cliBinary = settings.cliBinaryPath || 'qwen';
      const env: any = { 
        ...process.env, 
        FORCE_COLOR: '1',
        PATH: `${path.join(process.cwd(), 'node_modules', '.bin')}${path.delimiter}${process.env.PATH}`
      };
      
      if (settings.authMethod === 'custom') {
        if (settings.apiKey) env.QWEN_API_KEY = settings.apiKey;
        if (settings.baseUrl) env.QWEN_BASE_URL = settings.baseUrl;
      }
      if (settings.agentModel) env.QWEN_MODEL = settings.agentModel;
      if (settings.temperature !== undefined) env.QWEN_TEMPERATURE = settings.temperature.toString();
      if (settings.maxTokens !== undefined) env.QWEN_MAX_TOKENS = settings.maxTokens.toString();
      if (settings.enableWebSearch !== undefined) env.QWEN_ENABLE_WEB_SEARCH = settings.enableWebSearch ? 'true' : 'false';
      if (settings.enableCodeSandbox !== undefined) env.QWEN_ENABLE_CODE_SANDBOX = settings.enableCodeSandbox ? 'true' : 'false';
      if (settings.enableTelemetry !== undefined) env.QWEN_ENABLE_TELEMETRY = settings.enableTelemetry ? 'true' : 'false';

      // Manage Qwen Assistant instances
      if (!global.assistantPorts) {
        global.assistantPorts = new Map<string, number>();
        global.assistantPromises = new Map<string, Promise<number>>();
        global.nextPort = 3001;
      }

      const getAssistantPort = async () => {
        if (global.assistantPromises.has(workspaceName)) {
          return global.assistantPromises.get(workspaceName)!;
        }

        const spawnPromise = (async () => {
          const port = global.nextPort++;
          global.assistantPorts.set(workspaceName, port);
          
          const qwenEnv = {
            ...env,
            QWEN_ASSISTANT_HOST: '127.0.0.1',
            QWEN_ASSISTANT_PORT: port.toString(),
            QWEN_CLI_NO_RELAUNCH: 'true'
          };
          
          console.log(`[Qwen Assistant ${workspaceName}] Starting on 127.0.0.1:${port}...`);
          
          const qwen = spawn('npx', [cliBinary, '--assistant'], {
            env: qwenEnv,
            cwd: workspaceDir,
            shell: true
          });
          
          return new Promise<number>((resolve, reject) => {
            let resolved = false;
            const timeout = setTimeout(() => {
              if (!resolved) {
                console.warn(`[Qwen Assistant ${workspaceName}] Startup timeout, proceeding anyway...`);
                resolve(port);
              }
            }, 15000);

            qwen.stdout.on('data', (data) => {
              const output = data.toString();
              console.log(`[Qwen Assistant ${workspaceName} STDOUT] ${output}`);
              if (output.includes('Qwen Assistant running at')) {
                resolved = true;
                clearTimeout(timeout);
                resolve(port);
              }
            });

            qwen.stderr.on('data', (data) => {
              const output = data.toString();
              console.error(`[Qwen Assistant ${workspaceName} STDERR] ${output}`);
            });
            
            qwen.on('error', (err) => {
              console.error(`[Qwen Assistant ${workspaceName}] Failed to spawn process:`, err);
              global.assistantPorts.delete(workspaceName);
              global.assistantPromises.delete(workspaceName);
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                reject(err);
              }
            });

            qwen.on('close', (code) => {
              console.log(`[Qwen Assistant ${workspaceName}] Process exited with code ${code}`);
              global.assistantPorts.delete(workspaceName);
              global.assistantPromises.delete(workspaceName);
            });
          });
        })();

        global.assistantPromises.set(workspaceName, spawnPromise);
        return spawnPromise;
      };

      // Check if the binary is installed
      const checkQwen = spawn('npx', [cliBinary, '--version'], { shell: true });
      let qwenExists = false;
      
      checkQwen.stdout.on('data', () => { qwenExists = true; });
      
      checkQwen.on('close', async () => {
        if (!qwenExists) {
          ws.send(JSON.stringify({ type: 'error', data: `${cliBinary} is not installed or not found in your PATH. Please install it to use the chat feature.` }));
          ws.close();
          return;
        }

        try {
          const port = await getAssistantPort();
          const assistantUrl = `ws://127.0.0.1:${port}`;
          
          const connectToAssistant = (retries = 10, delay = 1000) => {
            console.log(`[Chat Proxy] Connecting to Assistant at ${assistantUrl} (Retries left: ${retries})`);
            const qwenWs = new WebSocket(assistantUrl);
            
            qwenWs.on('open', () => {
              console.log(`[Chat Proxy] Connection established to Assistant on port ${port}`);
            });

            qwenWs.on('message', (data) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
              }
            });
            
            ws.on('message', (message) => {
              if (qwenWs.readyState === WebSocket.OPEN) {
                qwenWs.send(message);
              }
            });
            
            ws.on('close', () => {
              qwenWs.close();
            });
            
            qwenWs.on('close', (code, reason) => {
              console.log(`[Chat Proxy] Assistant connection closed (code: ${code}, reason: ${reason})`);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  data: 'Qwen Assistant disconnected.' 
                }));
                ws.close();
              }
            });
            
            qwenWs.on('error', (err) => {
              console.error(`[Chat Proxy] Assistant WS Error:`, err.message);
              if (retries > 0 && (err as any).code === 'ECONNREFUSED') {
                setTimeout(() => connectToAssistant(retries - 1, delay), delay);
              } else if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'error', data: `Could not connect to Qwen Assistant: ${err.message}` }));
                ws.close();
              }
            });
          };

          connectToAssistant();
        } catch (err) {
          console.error(`[Chat Proxy] Setup Error:`, err);
          ws.send(JSON.stringify({ type: 'error', data: `Failed to start Qwen Assistant: ${err.message}` }));
          ws.close();
        }
      });
      
    } else if (pathname === '/terminal') {
      const shellParam = url.searchParams.get('shell') || 'bash';
      const allowedShells = ['bash', 'zsh', 'sh'];
      const shellName = allowedShells.includes(shellParam) ? shellParam : 'bash';
      
      console.log(`Client connected to /terminal (Workspace: ${workspaceName}, Shell: ${shellName})`);
      
      // Load settings to pass to the shell environment
      let settings: any = {};
      try {
        const globalSettingsContent = await fs.readFile(getSettingsPath(workspaceName, true), 'utf-8');
        settings = { ...settings, ...JSON.parse(globalSettingsContent) };
      } catch (e) {}
      
      try {
        const projectSettingsContent = await fs.readFile(getSettingsPath(workspaceName, false), 'utf-8');
        settings = { ...settings, ...JSON.parse(projectSettingsContent) };
      } catch (e) {}

      const env: any = { ...process.env, TERM: 'xterm-256color' };
      
      if (settings.authMethod === 'custom') {
        if (settings.apiKey) env.QWEN_API_KEY = settings.apiKey;
        if (settings.baseUrl) env.QWEN_BASE_URL = settings.baseUrl;
      }
      if (settings.agentModel) env.QWEN_MODEL = settings.agentModel;
      if (settings.temperature !== undefined) env.QWEN_TEMPERATURE = settings.temperature.toString();
      if (settings.maxTokens !== undefined) env.QWEN_MAX_TOKENS = settings.maxTokens.toString();
      if (settings.enableWebSearch !== undefined) env.QWEN_ENABLE_WEB_SEARCH = settings.enableWebSearch ? 'true' : 'false';
      if (settings.enableCodeSandbox !== undefined) env.QWEN_ENABLE_CODE_SANDBOX = settings.enableCodeSandbox ? 'true' : 'false';
      if (settings.enableTelemetry !== undefined) env.QWEN_ENABLE_TELEMETRY = settings.enableTelemetry ? 'true' : 'false';

      // Spawn the requested shell for the terminal
      const shell = spawn(shellName, [], {
        env,
        cwd: workspaceDir
      });

      shell.on('error', (err) => {
        ws.send(`\r\nError starting shell (${shellName}): ${err.message}\r\n`);
      });

      ws.on('message', (message) => {
        if (shell.stdin.writable) {
          shell.stdin.write(message.toString());
        }
      });

      shell.stdout.on('data', (data) => {
        ws.send(data.toString());
      });

      shell.stderr.on('data', (data) => {
        ws.send(data.toString());
      });

      shell.on('close', (code) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(`\r\n\x1b[31mProcess exited with code ${code}\x1b[0m\r\n`);
          ws.close();
        }
      });

      ws.on('close', () => {
        shell.kill();
        console.log(`Client disconnected from ${pathname}`);
      });
    }
  });
}

startServer();
