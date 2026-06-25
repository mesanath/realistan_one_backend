# Realistan One Backend

## Project Overview
A unified Node.js/Express backend combining three services into one deployable unit:

| Module | Route Prefix | Purpose |
|--------|-------------|---------|
| `realestate` | `/api/v1/realestate/` | Customer-facing real estate API (properties, articles, auth) |
| `realestate-admin` | `/api/v1/realestate-admin/` | Admin panel (manage properties, admins, homepage) |
| `serveease` | `/api/v1/serveease/` | Home services marketplace (bookings, agents, payments) |

## Directory Structure
```
realistan-one-backend/
├── server.js                     # Entry point — starts HTTP + Socket.io servers
├── src/
│   ├── app.js                    # Express app + all route mounts
│   ├── config/db.js              # MongoDB native driver connection
│   ├── middleware/               # Shared middleware (auth, error, rate-limit, requestId, validate)
│   ├── utils/                    # Shared utilities (logger, dbs, jwt, AppError)
│   ├── helpers/                  # S3, Mongo helper classes
│   ├── services/                 # Redis, DB service helpers
│   ├── aws/                      # AWS S3/EventBridge/Lambda clients
│   ├── socket/                   # Socket.io event handlers
│   └── tests/setup/env.js        # Jest test environment setup
├── modules/
│   ├── realestate/               # Customer real estate API
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── utils/constants.js
│   │   └── tests/
│   ├── realestate-admin/         # Admin panel API
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── validators/           # Zod validators
│   │   └── tests/
│   └── serveease/                # Home services marketplace
│       ├── routes/
│       ├── controllers/
│       ├── models/               # Mongoose schemas
│       ├── services/             # Business logic services
│       ├── validators/           # express-validator rules
│       ├── utils/
│       ├── config/               # Mongoose + Redis connections
│       ├── seeds/                # Database seed scripts
│       └── tests/
└── constants/                    # Shared constants (Redis keys, etc.)
```

## Database
- **MongoDB native driver** (`src/utils/dbs.js`) — used by realestate and realestate-admin modules
- **Mongoose** (`modules/serveease/config/mongoose.js`) — used by serveease module
- Both connect to the same MongoDB instance (configured via `MONGO_IP` / `MONGODB_URI`)

## Auth Middleware
- `src/middleware/realestate-auth.middleware.js` — JWT auth for realestate module (cookie + Bearer)
- `src/middleware/admin-auth.middleware.js` — JWT auth for realestate-admin module (role-based)
- `src/middleware/serveease-auth.middleware.js` — JWT auth for serveease module (Bearer only, OTP-based)

## Validation
- **realestate module** — inline validation in controllers
- **realestate-admin module** — Zod schemas (`modules/realestate-admin/validators/`)
- **serveease module** — express-validator rules (`modules/serveease/validators/validators.js`)

## Tests
All tests live inside `tests/` folders within each module. Run with:
```bash
npm test               # All tests
npm run test:coverage  # With coverage
```
Test files follow the pattern `**/tests/**/*.test.js`.

## Environment Variables
Copy `.env.example` to `.env` and fill in secrets. See `.env.example` for all variables.

## Running
```bash
npm install
npm run dev         # Development (hot-reload)
npm start           # Production
docker-compose up   # Docker
```

## Common Operations

### Add a new route to a module
1. Add controller function in `modules/<module>/controllers/<name>.controller.js`
2. Add route in `modules/<module>/routes/<name>.routes.js`
3. Mount in `src/app.js`
4. Add tests in `modules/<module>/tests/<name>.test.js`

### Seeding
```bash
npm run seed            # Realestate seed data
```
