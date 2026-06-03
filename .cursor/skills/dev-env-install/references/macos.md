# macOS Installation Guide

## Prerequisites

- **Homebrew** (required for Docker): `brew --version`. If missing: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

## Node.js (via nvm)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Load nvm (or open new terminal)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js LTS
nvm install --lts
nvm use --lts
```

## npm

Included with Node.js. No separate install needed.

## yarn

```bash
# Node 16.10+ includes corepack
corepack enable
corepack prepare yarn@stable --activate
```

Or fallback:
```bash
npm install -g yarn
```

## Docker

```bash
brew install --cask docker
```

Then open Docker Desktop from Applications (first run) or:
```bash
open -a Docker
```
