# Windows Installation Guide

Use PowerShell (or Windows Terminal) as Administrator when needed. Winget is included in Windows 10 1809+ and Windows 11.

## Node.js (via nvm-windows)

nvm-windows is a different project from nvm-sh/nvm. Use winget:

```powershell
winget install CoreyButler.NVMforWindows --accept-package-agreements --accept-source-agreements
```

**Important:** Close and reopen the terminal, then:

```powershell
nvm install latest
nvm use latest
```

## npm

Included with Node.js after nvm install.

## yarn

```powershell
corepack enable
corepack prepare yarn@stable --activate
```

Or: `npm install -g yarn`

## Docker

Requires WSL 2 (Windows 10/11) or Hyper-V. Install Docker Desktop:

```powershell
winget install Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
```

Restart the system after installation. Then start Docker Desktop from the Start menu or:

```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

Verify: `docker --version`
