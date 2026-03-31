# Task Plan: Qwen Code CLI User Interface

## 1. Architecture Overview
- **Frontend**: React 19 + Vite + Tailwind CSS + Framer Motion.
- **Backend**: Node.js + Express + `ws` (WebSockets).
- **Integration**: `qwen-code-cli` as the underlying engine, spawned as child processes or imported as a module (depending on CLI architecture).

## 2. Hybrid Data Flow (WebSocket / REST)
- **REST API (Express)**:
  - `/api/files/*`: CRUD operations for workspace files, `qwen.md`, subagents, and skills.
  - `/api/config`: Load and save application configurations.
  - `/api/context`: Fetch current context state.
- **WebSocket (`ws`)**:
  - `ws://.../chat`: Real-time streaming of chat tokens from the Qwen AI assistant.
  - `ws://.../terminal`: Bi-directional streaming for the integrated terminal (stdin/stdout/stderr).

## 3. UI Component Breakdown
- **Layout**:
  - Sidebar (Left): File & Context Manager (File tree, config toggles).
  - Main Area (Center): Dual Code Editors (Lightweight editor for quick edits, Monaco for heavy files/diffs).
  - Panel (Right/Bottom): Interactive Chat & Terminal.
- **Components**:
  - `WorkspaceBrowser`: Tree view of files.
  - `ConfigManager`: UI for editing `qwen.md` and subagents.
  - `LightweightEditor`: Simple textarea or basic code editor (e.g., `react-simple-code-editor`) for quick tweaks.
  - `MonacoEditor`: Integration of `@monaco-editor/react` for advanced editing and diffs.
  - `ChatInterface`: Message list, input area, streaming token renderer.
  - `TerminalEmulator`: Integration of `xterm.js` for direct command execution.

## 4. Execution Phases
- [x] **Phase 1**: Project Initialization & Planning (Complete).
- [x] **Phase 2**: Backend Setup (Express + WebSockets + File System APIs) (Complete).
- [x] **Phase 3**: Frontend Layout & Theming (Material + Fluent design system) (Complete).
- [x] **Phase 4**: File & Context Manager Implementation (Complete).
- [x] **Phase 5**: Dual Editor Integration (Lightweight + Monaco) (Complete).
- [x] **Phase 6**: Chat & Terminal Integration (WebSockets) (Complete).
- [ ] **Phase 7**: Polish, Testing, and Refinement (Current).
