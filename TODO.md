# SecureChain — Production Deployment

## Status: Backend refactor + deployment config COMPLETE

### DB & Storage Layer (Supabase primary, SQLite fallback)
- [x] `server/lib/supabaseClient.js` — Supabase client factory
- [x] `server/lib/db.js` — Data-access layer (messages, transfers, contacts, activities, cloud_files) with Supabase + SQLite fallback
- [x] `server/lib/storage.js` — File storage (Supabase Storage + local fallback) with `storagePath`
- [x] `server/lib/supabase.js` — Metadata helpers using Supabase client
- [x] `server/index.js` — Removed old SQLite setup; converted all endpoints to async db layer; env-based CORS; storagePath for Supabase Storage
- [x] `server/package.json` — Added `@supabase/supabase-js`, `start` script

### Deployment Config
- [x] `render.yaml` — Render blueprint (rootDir: server, start: npm start)
- [x] `server/Procfile` — Render start command
- [x] `server/supabase_schema.sql` — SQL to create all tables + storage bucket
- [x] `.env.example` — Frontend env template (VITE_API_URL)
- [x] `server/.env.example` — Backend env template
- [x] `DEPLOYMENT.md` — Full step-by-step deployment guide

### Frontend
- [x] `src/Web3Context.jsx` — Socket.io connects to resolved API URL (not hardcoded localhost)

### Verification
- [x] Backend syntax check passes (all files)
- [x] Frontend `npm run build` succeeds
- [x] Backend starts (SQLite fallback) and health endpoint returns ok
- [x] Transfers & contacts endpoints return data

## Remaining (requires user to do in dashboards)
- [ ] Create Supabase project & run `server/supabase_schema.sql`
- [ ] Set Supabase env vars on Render
- [ ] Deploy `server/` to Render
- [ ] Set `VITE_API_URL` on Vercel to Render backend
- [ ] Redeploy Vercel
