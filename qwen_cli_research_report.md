# Qwen CLI & AI Studio Integration Research Report

## 1. Executive Summary
The persistent `ECONNREFUSED` errors in the Qwen Assistant integration are primarily caused by environment pathing issues and race conditions during process initialization. The Qwen CLI binary is located in the local `node_modules/.bin` directory, which is not in the system `PATH` by default in the AI Studio container environment. Consequently, the `spawn` call fails to locate the executable, or attempts to run a non-existent global version.

## 2. Environment Audit (AI Studio / Cloud Run)
- **Networking**: Only port 3000 is externally accessible. Internal loopback (`127.0.0.1`) is available for inter-process communication on other ports.
- **Pathing**: `node_modules/.bin` is not automatically added to the `PATH` for child processes spawned via `node:child_process`.
- **Concurrency**: Multiple WebSocket connections can trigger multiple spawn attempts if not properly synchronized.
- **Host Resolution**: `localhost` can resolve to `::1` (IPv6) in some Node.js versions/environments, while the CLI might be listening on `127.0.0.1` (IPv4).

## 3. Qwen CLI Audit (Assistant Mode)
- **Binary**: The package `@qwen/qwen-cli` (or `qwen-code`) provides a `qwen` binary.
- **Server**: In `--assistant` mode, it starts an Express + WebSocket server.
- **Configuration**: It respects `QWEN_ASSISTANT_HOST` and `QWEN_ASSISTANT_PORT` environment variables.
- **Startup Signal**: It logs `🚀 Qwen Assistant running at http://...` to STDOUT when ready.

## 4. Root Cause Analysis
1. **Binary Not Found**: The `spawn('qwen', ...)` call fails because `qwen` is not in the PATH.
2. **Failed Validation**: The `command -v qwen` check fails for the same reason, preventing the startup logic from even attempting to run the CLI in some cases, or incorrectly reporting it as missing.
3. **Race Conditions**: Although a singleton promise pattern was implemented, the lack of a robust binary path made the promise reject or timeout, leading to subsequent failures.
4. **IPv6/IPv4 Mismatch**: Potential resolution issues with `localhost`.

## 5. Implementation Plan
1. **Absolute Pathing**: Use `npx qwen` or the absolute path to `node_modules/.bin/qwen` to ensure the binary is found.
2. **Environment Injection**: Explicitly add `node_modules/.bin` to the `PATH` of the child process.
3. **IPv4 Enforcement**: Use `127.0.0.1` everywhere (host binding and connection) to bypass DNS/IPv6 issues.
4. **Robust Validation**: Update the existence check to use `npx qwen --version` or a direct filesystem check.
5. **Enhanced Proxy**: Ensure the WebSocket proxy handles the initial connection delay gracefully with a verified "ready" state from the child process.

## 6. Constant Truths
- `127.0.0.1` is always safe for internal loopback.
- `npx` is the most reliable way to run local binaries in this environment.
- STDOUT monitoring is the only reliable way to know when the CLI's internal server is ready.
