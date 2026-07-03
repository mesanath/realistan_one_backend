# Tasks

## Completed
- [x] Combine 3 backends (realestate, realestate-admin, serveease) into one service
- [x] Create unified route structure with module-based prefixes
- [x] Copy all routes, controllers, models, services, validators with correct import paths
- [x] Set up shared middleware (auth, error handler, rate limiting, request ID, Zod validate)
- [x] Set up Docker and docker-compose
- [x] Set up Jest test configuration
- [x] Create .env.example with all environment variables
- [x] Create CLAUDE.md documentation
- [x] Fix all import paths across all 3 modules
- [x] Add mongodb dependency (was missing from package.json)
- [x] Create src/services/index.js barrel (needed by src/helpers/mongo/)
- [x] Fix modules/serveease/utils/logger.js to re-export shared logger
- [x] Fix server.js: export { app, server }, guard listen behind require.main
- [x] Create modules/realestate/tests/helpers/setup.js
- [x] Create modules/realestate-admin/tests/helpers/token.helper.js
- [x] Fix all test route paths to use unified module prefixes
- [x] Fix serveease test mock paths (rateLimit, test-utils/db)
- [x] All 17 test suites passing (185 tests)

## Missing Backend Routes (admin panel calls with no handler)

These routes are called from the admin frontend but have no backend implementation yet.
All belong under `/api/v1/realestate-admin/`.

- [ ] `DELETE /api/v1/realestate-admin/admin/users/:id` — no DELETE in admin.routes.js
- [ ] `DELETE /api/v1/realestate-admin/properties/:id` — no DELETE in property.routes.js
- [ ] `GET/POST/PUT/DELETE /api/v1/realestate-admin/articles` — no article.routes.js in realestate-admin
- [ ] `GET/POST/PUT/DELETE /api/v1/realestate-admin/banners` — no banner module
- [ ] `GET /api/v1/realestate-admin/dashboard/stats` — no dashboard module
- [ ] `GET /api/v1/realestate-admin/profiles` — no profiles module
- [ ] `GET /api/v1/realestate-admin/lease` — no lease module
- [ ] `GET /api/v1/realestate-admin/loans` — no loans module
- [ ] `GET/POST /api/v1/realestate-admin/pincodes` — no pincodes module
- [ ] `GET/POST/DELETE /api/v1/realestate-admin/banners/images` — no image-banners module

## ServeEase — Pending Backend Tasks (identified 2026-06-25)

### Critical — Model Bug

- [ ] **BE-P4b** — Fix Dispute model unique index to allow one dispute per booking per role  
  Current index: `{ booking: 1 }` unique — breaks when BOTH customer and agent raise a dispute on the same booking (duplicate key error).  
  Fix: replace with compound unique `disputeSchema.index({ booking: 1, raisedByRole: 1 }, { unique: true })` and drop the old index from MongoDB.

### Done

- [x] **BE-P4** — Agent dispute raising: route (`authorize('customer','agent')`) + controller logic + model fields (`agent`, `raisedByRole`, new reason enums) — ✅ Done
- [x] **BE-P6** — Push notifications on `markEnRoute` / `markArrived` — ✅ Done
- [x] **BE-P7** — Push notification when admin replies to a dispute — ✅ Done
- [x] **BE-P9** — Agent auto-joins `booking_${id}` socket room on connect (socket/index.js) — ✅ Done

### Low Priority

- [ ] **BE-P8** — Verify `GET /api/v1/serveease/bookings/:id` returns full context for agent job detail  
  Agent job detail page needs: service name, customer address, OTP phase, agent-visible status. Confirm the existing endpoint populates `serviceId` (name, emoji, durationMinutes) and `address`.

---

## Backlog
- [ ] Add unified API documentation
- [ ] Set up CI/CD pipeline
- [ ] Add rate limit monitoring
- [ ] Consider consolidating JWT auth across all modules into one middleware

## Frontend Integration Cleanup
- [x] Fix `realestate-auth.middleware.js`: changed `req.cookies?.authToken` → `req.cookies?.realistoken`
      so the frontend `realistoken` httpOnly cookie is accepted directly (no Next.js proxy layer needed)
- [x] Removed Next.js proxy routes (shortlist, shortlisted, delete-property, update-profile)
- [x] Added `toggleShortlist`, `getShortlisted`, `deleteProperty`, `updateUserDetails` to `apiUtils.js`
      — all use `withCredentials: true` to send the httpOnly cookie cross-origin
- [x] Added `withCredentials: true` to `postProperty` and `updateProperty` in `apiUtils.js`
- [x] Fixed double-prefix bug: new apiUtils functions were using `${ENDPOINT}/realestate/...` but
      `NEXT_PUBLIC_ENDPOINT` already ends with `/realestate` — removed the extra segment
- [ ] CORS note: `app.js` already has `credentials: true` — confirm FRONTEND_URL env var is set correctly
- [x] Unified auth routes wired up in frontend:
      `send-otp`, `verify-otp`, `loginbysocial` now call `BASE_ENDPOINT/auth/...` (`/api/v1/auth/...`)
      with `type: "realestate"` in body. `NEXT_PUBLIC_BASE_ENDPOINT` env var added to `.env.local`.
      Realestate-specific routes (`getprofile`, `logout`, `updateuserdetails`) remain on `ENDPOINT`.
- [ ] Truecaller login (`POST /auth/loginbytruecaller`) — not wired up in frontend, not needed yet

## Post-Property Draft Preservation
Feature implemented in `realistanweb/src/app/post-property/page.js`:
- Auto-saves all form fields to `localStorage` key `realistan_post_draft` on every change
- Restores draft on page load (skipped when in edit mode)
- Clears draft on successful property submission
- Checks auth status on mount via `/api/auth/socket-token`
- Shows sticky amber banner "You're not logged in — your data is being saved as a draft" when unauthenticated
- "Log in" button in banner redirects to `/signin?redirect=/post-property`
- Signin page now reads `?redirect=` query param and redirects there after successful login
- On 401 response from `postProperty`, shows toast with "Log in" action pointing to signin with redirect

## Notes
- serveease module uses Mongoose; realestate and admin use native MongoDB driver
- Both coexist with the same MongoDB instance (different collections)
- Socket.io runs on SOCKET_PORT (default 3002), HTTP on PORT (default 3000)
- Run tests with `npm test` (uses --runInBand --forceExit for sequential execution)
- Realestate tests are integration tests — require MongoDB at MONGO_IP (default localhost:27017)
- Serveease tests connect via MONGODB_URI (default mongodb://localhost:27017/realistan_test_db)
