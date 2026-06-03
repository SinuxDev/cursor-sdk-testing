---
name: dev-env-install
description: Detect and install missing Node.js (via nvm), npm/yarn, and Docker on the user's machine. Use when Node.js is not found, npm or yarn is missing, Docker is not installed, or when the user asks to set up development environment, install node, install docker, or fix missing dev tools.
---

# Dev Environment Install

Install Node.js (via nvm), npm/yarn, and Docker when they are missing on the user's machine.

## Quick Start

1. **Detect OS**: Determine macOS, Linux, or Windows
2. **Run detection script**: Execute `scripts/check-env.sh` (macOS/Linux) or `scripts/check-env.ps1` (Windows)
3. **Confirm with user**: "The following tools are missing: [list]. Shall I install them?"
4. **Install**: Follow the reference for the detected OS based on what is missing
5. **Verify**: Run detection again to confirm installation

## Detection Commands

Without scripts, check manually:

| Tool  | macOS/Linux                  | Windows              |
|-------|------------------------------|----------------------|
| Node  | `command -v node` or `node -v` | `Get-Command node -ErrorAction SilentlyContinue` |
| npm   | `command -v npm` or `npm -v`  | `Get-Command npm -ErrorAction SilentlyContinue` |
| yarn  | `command -v yarn` or `yarn -v` | `Get-Command yarn -ErrorAction SilentlyContinue` |
| Docker| `command -v docker` or `docker -v` | `Get-Command docker -ErrorAction SilentlyContinue` |

**OS detection:**
- macOS/Linux: `uname -s` (Darwin = macOS, Linux = Linux)
- Windows: PowerShell or `$env:OS` / `cmd /c ver`

## Installation Order

1. **Node.js** (via nvm) — npm is included
2. **yarn** — `corepack enable` (Node 16.10+) or `npm install -g yarn`
3. **Docker** — independent; install anytime

## OS-Specific References

- **macOS**: See [references/macos.md](references/macos.md)
- **Linux**: See [references/linux.md](references/linux.md)
- **Windows**: See [references/windows.md](references/windows.md)

## Important Notes

1. **Windows nvm**: nvm-windows is a different project. After `winget install CoreyButler.NVMforWindows`, open a **new terminal** before running `nvm install latest`.
2. **macOS/Linux nvm**: After install, run `source ~/.nvm/nvm.sh` or restart the shell. Add to `~/.bashrc` or `~/.zshrc` if not auto-added.
3. **Linux Docker**: Detect distro with `cat /etc/os-release`. Use apt (Debian/Ubuntu) or yum/dnf (RHEL/Fedora).
4. **User confirmation**: Always confirm with the user before running install commands.
