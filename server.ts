import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import os from 'os';

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
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: 'Failed to read workspace' });
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
      const env: any = { ...process.env, FORCE_COLOR: '1' };
      
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

      // Check if the binary is installed
      const checkQwen = spawn('command', ['-v', cliBinary], { shell: true });
      let qwenExists = false;
      
      checkQwen.stdout.on('data', () => { qwenExists = true; });
      
      checkQwen.on('close', () => {
        if (!qwenExists) {
          ws.send(JSON.stringify({ type: 'error', content: `${cliBinary} is not installed or not found in your PATH. Please install it to use the chat feature.` }));
          ws.send(JSON.stringify({ type: 'done' }));
          ws.close();
          return;
        }

        // Spawn qwen for chat interaction
        const qwen = spawn(cliBinary, ['--include-directory', workspaceDir], {
          env,
          cwd: workspaceDir,
          shell: true // Use shell to allow resolving from PATH
        });

        let processDead = false;

        qwen.on('error', (err) => {
          processDead = true;
          ws.send(JSON.stringify({ type: 'error', content: `Could not start Qwen CLI: ${err.message}` }));
          ws.send(JSON.stringify({ type: 'done' }));
        });

        ws.on('message', (message) => {
          if (processDead) {
            ws.send(JSON.stringify({ type: 'error', content: 'The Qwen process is not running. Please reconnect to start a new session.' }));
            ws.send(JSON.stringify({ type: 'done' }));
            return;
          }
          if (qwen.stdin && qwen.stdin.writable) {
            qwen.stdin.write(message.toString() + '\n');
          }
        });

        qwen.stdout.on('data', (data) => {
          ws.send(JSON.stringify({ type: 'token', content: data.toString() }));
        });

        qwen.stderr.on('data', (data) => {
          ws.send(JSON.stringify({ type: 'token', content: data.toString() }));
        });

        qwen.on('close', (code) => {
          processDead = true;
          if (code === 127) {
            ws.send(JSON.stringify({ type: 'error', content: 'Qwen CLI binary not found. Please ensure it is installed and available in your system PATH, or update the binary path in Configuration.' }));
          } else if (code !== 0) {
            ws.send(JSON.stringify({ type: 'error', content: `Qwen CLI exited unexpectedly (code ${code}).` }));
          } else {
            ws.send(JSON.stringify({ type: 'system', content: 'Qwen CLI session ended.' }));
          }
          ws.send(JSON.stringify({ type: 'done' }));
        });

        ws.on('close', () => {
          if (!processDead) qwen.kill();
          console.log(`Client disconnected from ${pathname}`);
        });
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
