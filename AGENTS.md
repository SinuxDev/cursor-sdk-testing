# AGENTS.md

Agent guidance for this repository. See also [.cursor/AGENTS.md](.cursor/AGENTS.md) for Cursor harness details.

## Cursor Cloud specific instructions

### Product scope

This repo is the **EventForge backend API** only (Express + TypeScript + MongoDB). There is no frontend in this repository; full browser E2E requires a separate frontend at `http://localhost:3000`.

### Required services

| Service | Port | Notes |
|---------|------|-------|
| MongoDB | 27017 | Required for `npm run dev` / manual API testing |
| Backend API | 5000 | `npm run dev` (nodemon + ts-node) |

**Tests (`npm test`)** use in-memory MongoDB (`mongodb-memory-server`) and do **not** require a running MongoDB instance.

### MongoDB (no systemd in Cloud VM)

Ubuntu Cloud VMs here do not use systemd. After MongoDB is installed, start it manually before the dev server:

```bash
sudo -u mongodb mongod --dbpath /var/lib/mongodb --logpath /var/log/mongodb/mongod.log --bind_ip 127.0.0.1 --port 27017 --fork
```

Verify: `mongosh --quiet --eval 'db.runCommand({ ping: 1 })'`

### Environment file

Copy `.env.example` to `.env` before first run. Minimum required vars for the dev server: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MONGODB_URI` (defaults in `.env.example` work with local MongoDB).

### Common commands

See [README.md](README.md) for the canonical list. Quick reference:

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server with hot reload (port 5000) |
| `npm test` | Jest integration/unit tests (in-memory DB) |
| `npm run build` | TypeScript compile to `dist/` |
| `npm run lint` | ESLint (includes `.cursor/` harness JS; may report pre-existing issues outside `src/`) |
| `npm run seed:admin` | Seed admin user from `ADMIN_SEED_*` env vars |

### Swagger / health

- Health: `GET http://localhost:5000/health`
- Swagger UI: `GET http://localhost:5000/api/docs`
- OpenAPI JSON: `GET http://localhost:5000/api/docs.json`

### Optional services (not required for core dev)

- **SMTP** — RSVP still succeeds without it; email is best-effort logged on failure
- **AWS S3** — dev uses local `uploads/` directory
- **Telegram / Cursor SDK** — optional dev tooling (`npm run telegram:poll`, `cursor:*` scripts)

### Gotchas

- Use **tmux** for long-running processes (`mongodb-server`, `eventforge-dev` sessions).
- Husky pre-push runs `lint`, `test`, and `build`; lint currently scans `.cursor/` hook scripts and may fail on harness-only JS — run `npx eslint src` to lint application code only.
- Reinstalling `node_modules` while nodemon is running may require restarting the dev server session to pick up native module changes (e.g. `sharp`).
