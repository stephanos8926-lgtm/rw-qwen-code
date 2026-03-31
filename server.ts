import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- REST API Routes ---
  
  // Mock Workspace Directory
  const WORKSPACE_DIR = path.join(__dirname, 'workspace');
  await fs.mkdir(WORKSPACE_DIR, { recursive: true });

  // Seed files if empty
  try {
    const existingFiles = await fs.readdir(WORKSPACE_DIR);
    if (existingFiles.length === 0) {
      await fs.writeFile(path.join(WORKSPACE_DIR, 'qwen.md'), '# Qwen Configuration\n\nThis is the main configuration file for the Qwen Code CLI.\n\n- Model: qwen-coder\n- Temperature: 0.7\n', 'utf-8');
      await fs.writeFile(path.join(WORKSPACE_DIR, 'hello.ts'), 'export function greet() {\n  console.log("Hello from Qwen Code CLI!");\n}\n', 'utf-8');
    }
  } catch (e) {
    console.error("Failed to seed workspace:", e);
  }

  // List files
  app.get('/api/files', async (req, res) => {
    try {
      const files = await fs.readdir(WORKSPACE_DIR);
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: 'Failed to read workspace' });
    }
  });

  // Read file
  app.get('/api/files/:filename', async (req, res) => {
    try {
      const content = await fs.readFile(path.join(WORKSPACE_DIR, req.params.filename), 'utf-8');
      res.json({ content });
    } catch (error) {
      res.status(404).json({ error: 'File not found' });
    }
  });

  // Save file
  app.post('/api/files/:filename', async (req, res) => {
    try {
      const { content } = req.body;
      await fs.writeFile(path.join(WORKSPACE_DIR, req.params.filename), content, 'utf-8');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save file' });
    }
  });

  // Config
  app.get('/api/config', (req, res) => {
    res.json({ theme: 'system', editor: 'monaco' });
  });

  // Context
  app.get('/api/context', (req, res) => {
    res.json({ activeAgent: 'Qwen-Coder', loadedSkills: [] });
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
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

    if (pathname === '/chat' || pathname === '/terminal') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, request) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    
    if (pathname === '/chat') {
      console.log('Client connected to /chat');
      ws.on('message', (message) => {
        console.log(`Received chat message: ${message}`);
        // Echo back a simulated streaming response
        ws.send(JSON.stringify({ type: 'token', content: 'Echo: ' }));
        setTimeout(() => ws.send(JSON.stringify({ type: 'token', content: message.toString() })), 500);
        setTimeout(() => ws.send(JSON.stringify({ type: 'done' })), 1000);
      });
    } else if (pathname === '/terminal') {
      console.log('Client connected to /terminal');
      ws.on('message', (message) => {
        // Echo back terminal input
        ws.send(`\r\n$ ${message}\r\n`);
      });
    }

    ws.on('close', () => {
      console.log(`Client disconnected from ${pathname}`);
    });
  });
}

startServer();
