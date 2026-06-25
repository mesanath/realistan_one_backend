# Realistan One Backend

Unified backend service combining:
- **Realestate** — customer-facing property listings API
- **Realestate Admin** — property and admin management panel
- **ServeEase** — home services marketplace (bookings, agents, payments)

## Quick Start

```bash
cp .env.example .env
# Fill in required secrets in .env
npm install
npm run dev
```

## Route Prefixes

| Service | Prefix | Description |
|---------|--------|-------------|
| Realestate | `/api/v1/realestate/` | Customer property API |
| Realestate Admin | `/api/v1/realestate-admin/` | Admin management |
| ServeEase | `/api/v1/serveease/` | Home services platform |

## Health Check
```
GET /health
GET /health/live
GET /api/v1/health
```

## Docker
```bash
docker-compose up -d
```

## Tests
```bash
npm test
npm run test:coverage
```

## Docs
See `CLAUDE.md` for full architecture details and `tasks.md` for project status.