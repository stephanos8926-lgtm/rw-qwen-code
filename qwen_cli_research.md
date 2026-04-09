# Qwen CLI Research Deep Dive

## Overview
The `qwen-code-cli` (a community fork of Google's Gemini CLI) is a powerful command-line AI workflow tool designed to interact with Qwen models. It supports codebase querying, file editing, tool execution (including MCP servers), and multi-agent task coordination. 

This document details its command-line flags, operational modes, and nuances, based on a deep dive into its source code (`config.ts`, `qwen.tsx`, `nonInteractiveCli.ts`, and `webServer.ts`).

## Command-Line Flags & Options
The CLI uses `yargs` for argument parsing. Key flags include:

*   **`-m, --model <string>`**: Specifies the Qwen model to use (e.g., `qwen-turbo-latest`, `qwen3-235b-a22b`, `qwen-vl-plus-latest`). Defaults to environment variables (`QWEN_MODEL`) or a hardcoded default.
*   **`-p, --prompt <string>`**: Triggers **Non-Interactive (Headless) Mode**. The CLI will process the prompt, execute necessary tools, stream the output to stdout, and exit.
*   **`-a, --all_files`**: Includes all files in the current directory in the context window. Useful for broad codebase queries.
*   **`-y, --yolo`**: Enables **YOLO Mode** (ApprovalMode.YOLO). Automatically accepts all tool actions (file edits, shell commands) without prompting the user for confirmation. Essential for fully autonomous operation.
*   **`-c, --checkpointing`**: Enables Git-based checkpointing of file edits, allowing rollbacks if the AI makes a mistake.
*   **`-s, --sandbox`**: Runs the CLI in a secure, isolated sandbox environment.
*   **`--sandbox-image <string>`**: Specifies a custom sandbox image URI.
*   **`-d, --debug`**: Enables verbose debug logging to stderr.
*   **`--show_memory_usage`**: Displays memory usage statistics in the status bar (Interactive Mode only).
*   **`--assistant`**: Triggers **Assistant Mode**, launching a local Express/WebSocket server (default port 3000) with a modern web interface.
*   **Telemetry Flags**: `--telemetry`, `--telemetry-target`, `--telemetry-otlp-endpoint`, `--telemetry-log-prompts` for observability.

## Operational Modes & States

### 1. Interactive Mode (Default)
When run without `-p` or `--assistant`, the CLI launches an interactive terminal UI built with `ink` (React for CLI). It provides a rich interface with status bars, syntax highlighting, and interactive dialogs.
*   **Nuance**: Outputting this mode to a non-TTY environment or piping it over WebSockets results in severe ANSI escape code pollution, making the output unreadable without a terminal emulator (like xterm.js).

### 2. Non-Interactive (Headless) Mode
Triggered by the `-p` or `--prompt` flag (or by piping data to stdin).
*   **Flow**: Handled by `runNonInteractive()`. It initializes the Qwen client, sends the prompt, and enters a loop to process the response stream.
*   **Execution**: It natively handles `ToolCallRequest` events, executes the tools (e.g., shell commands, file writes), and returns the results to the model.
*   **Output**: Only the final text content is written to `stdout`. Debug logs and errors are written to `stderr`. It exits with code 0 on success or 1 on error.
*   **Limitation**: It is designed for single-turn execution (or a single chain of tool calls) and exits when finished. It does not maintain a continuous chat session.

### 3. Assistant Mode (Web Server)
Triggered by the `--assistant` flag.
*   **Flow**: Handled by `launchAssistantMode()`. It starts an Express web server and a WebSocket server (`WebSocketHandler`).
*   **Capabilities**: Provides a full web interface. The WebSocket protocol uses structured JSON messages (e.g., `{ type: 'user_message', data: { text: '...' } }`).
*   **Features**: Supports continuous chat sessions, file uploads (via Multer and WebSocket), visual processing, and exclusive access to Wan media generation models (`generate_video`, `transform_image`).

### 4. YOLO Mode
Triggered by `-y` or `--yolo`.
*   **State**: Sets `ApprovalMode.YOLO`.
*   **Nuance**: In standard modes, tools like `ShellTool` or `WriteFileTool` pause execution to ask the user for confirmation. YOLO mode bypasses this, making it mandatory for headless, automated workflows where human intervention is impossible.

## Application Improvements & Integration Strategy

Currently, our application's `server.ts` spawns `qwen-code` without arguments and pipes its raw stdout/stderr over WebSockets to a React frontend (`ChatInterface.tsx`). Because `qwen-code` defaults to Interactive Mode, it emits ANSI escape codes intended for a terminal, which breaks our JSON-expecting frontend. Furthermore, we are not leveraging YOLO mode, meaning the CLI might hang indefinitely waiting for user confirmation on tool calls.

### Recommended Architecture Changes

1.  **For Continuous Chat (The Chat Panel)**:
    *   **Stop piping raw stdout**. Instead of spawning `qwen-code` in interactive mode, we should leverage the built-in **Assistant Mode**.
    *   **Implementation**: Modify `server.ts` to spawn `qwen-code --assistant`. We can configure it to run on a specific port (e.g., `QWEN_ASSISTANT_PORT=3001`). Our frontend `ChatInterface.tsx` can then connect directly to this native WebSocket server, which already speaks a clean, structured JSON protocol and handles session management, file uploads, and continuous chat natively.

2.  **For Automated Agent Tasks (Background Execution)**:
    *   When the application needs to execute a specific skill or subagent task in the background, we should use **Non-Interactive Mode** combined with **YOLO Mode**.
    *   **Implementation**: Spawn `qwen-code -p "<task_prompt>" -y`. This ensures the CLI runs headlessly, automatically approves necessary file edits or shell commands, and exits cleanly when the task is complete. We can capture `stdout` for the final result and `stderr` for logs.

3.  **Environment & Control Flow**:
    *   Remove the invalid `--include-directory` flag currently being passed in `server.ts`. The CLI respects `process.cwd()`, so passing `cwd: workspaceDir` to the `spawn` options is sufficient.
    *   Ensure `QWEN_CLI_NO_RELAUNCH=true` is set in the environment to prevent the CLI from attempting to restart itself for memory management, which can break process tracking.

By adopting these native modes, we eliminate the need to parse ANSI codes, prevent the CLI from hanging on user prompts, and unlock advanced features like file uploads and media generation.
