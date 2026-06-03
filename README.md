# EventForge — Backend API

REST API for EventForge, a modern knowledge-sharing event platform. Built with Express.js, TypeScript, and MongoDB following Clean Architecture and SOLID principles.

## Tech Stack

- **Runtime**: Node.js + Express.js
- **Language**: TypeScript 5.x (strict mode)
- **Database**: MongoDB Atlas + Mongoose 8.x
- **Storage**: AWS S3 (production) / Local (development)
- **Process Manager**: PM2

## Architecture

Strict layered architecture — no layer may skip a level:

```
Routes → Controllers → Services → Repositories → Models → Database
```

| Layer | Responsibility |
|---|---|
| Routes | Define endpoints, apply middleware and validation |
| Controllers | Handle HTTP requests/responses only |
| Services | Business logic and orchestration |
| Repositories | Data access, database queries |
| Models | Mongoose schemas and interfaces |

See [ARCHITECTURE.md](ARCHITECTURE.md) for full details.

## Project Structure

```
src/
├── config/          # Database, AWS, and storage configuration
├── controllers/     # HTTP request/response handlers
├── middlewares/     # asyncHandler, errorHandler, validateRequest, etc.
├── models/          # Mongoose models and TypeScript interfaces
├── repositories/    # Data access layer (Repository Pattern)
├── routes/          # API route definitions
├── services/        # Business logic layer
├── types/           # Shared TypeScript type definitions
├── utils/           # AppError, logger, response helpers
├── validations/     # express-validator schemas
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB Atlas connection string (or local MongoDB)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, etc.

# Start development server
npm run dev
```

The server starts on `http://localhost:5000`.

## API Documentation (Swagger)

Swagger UI and OpenAPI JSON are available for interactive API exploration:

- UI: `GET /api/docs`
- JSON spec: `GET /api/docs.json`

Environment behavior:

- **development/staging**: docs are enabled for quick testing
- **production**: docs endpoints require authenticated **admin** Bearer token

You can override endpoints via env vars:

- `SWAGGER_DOCS_PATH` (default: `/api/docs`)
- `SWAGGER_DOCS_JSON_PATH` (default: `/api/docs.json`)

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Development server with hot reload (nodemon) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format source with Prettier |
| `npm test` | Run Jest test suite with coverage |
| `npm run start:pm2` | Start with PM2 process manager |

## API Endpoints

### Health Check

```
GET /health
```

### Authentication

```
POST   /api/v1/auth/register       — Register a new user
POST   /api/v1/auth/login          — Login
POST   /api/v1/auth/social         — Social login
GET    /api/v1/auth/me             — Get current user profile
POST   /api/v1/auth/upgrade-role   — Upgrade user role
```

### Demo Requests

```
POST   /api/v1/demo-requests       — Submit a demo request
```

### Events

Public:

```
GET    /api/v1/events/public       — List public events
GET    /api/v1/events/public/:id   — Get single public event
```

Organizer/Admin (authenticated):

```
POST   /api/v1/events/upload-cover  — Upload event cover image
POST   /api/v1/events               — Create event draft
PATCH  /api/v1/events/:id           — Update event draft
POST   /api/v1/events/:id/publish   — Publish event
GET    /api/v1/events/:id           — Get organizer/admin event detail
GET    /api/v1/events               — List organizer/admin events
```

### Admin

All admin endpoints require admin authentication.

Core admin:

```
GET    /api/v1/admin/users                   — List/search users
GET    /api/v1/admin/audit-logs              — List audit logs
PATCH  /api/v1/admin/users/:id/role          — Update user role
PATCH  /api/v1/admin/users/:id/suspension    — Suspend/unsuspend user
```

Compliance:

```
GET    /api/v1/admin/compliance/risk-overview        — Compliance risk overview
GET    /api/v1/admin/compliance/cases                — List compliance cases
POST   /api/v1/admin/compliance/cases                — Create compliance case
PATCH  /api/v1/admin/compliance/cases/:id/status     — Update case status
```

Admin Email:

```
POST   /api/v1/admin/email/campaigns/send       — Send email campaign
GET    /api/v1/admin/email/campaigns            — List email campaigns
GET    /api/v1/admin/email/campaigns/:id/logs   — List campaign delivery logs
```

### File Upload

```
POST   /api/v1/upload/single     — Upload a single file
POST   /api/v1/upload/multiple   — Upload up to 10 files
DELETE /api/v1/upload/delete     — Delete a file by URL
GET    /api/v1/upload/metadata   — Get file metadata
```

## Key Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | `development` or `production` | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/eventforge` |
| `JWT_SECRET` | JWT signing secret | — |
| `JWT_EXPIRE` | JWT expiry duration | `7d` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |
| `AWS_ACCESS_KEY_ID` | AWS credentials (production) | — |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials (production) | — |
| `AWS_S3_BUCKET` | S3 bucket name (production) | — |

## Git Hooks

Husky enforces quality gates automatically:

- **pre-commit**: ESLint + Prettier on staged `.ts` files
- **commit-msg**: Validates Conventional Commits format
- **pre-push**: Full ESLint check + TypeScript build

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat(auth): add JWT refresh token rotation
fix(events): resolve date timezone handling
docs: update deployment guide
```

## Development Guidelines

See [AGENTS.md](AGENTS.md) for the full AI/developer coding standards (SOLID, DRY, KISS, YAGNI, error handling patterns, naming conventions, and more).

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for AWS Lightsail + PM2 deployment instructions.
