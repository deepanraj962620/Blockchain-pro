# SecureChain Render Upload Fix

This build fixes the generic upload/transfer errors shown on Render.

## Why it was failing

1. Existing Supabase tables may be older than the current backend. `CREATE TABLE IF NOT EXISTS` does not add newly introduced columns, so inserts into `transfers` / `cloud_files` can fail.
2. Render local disk is ephemeral. Transfer blobs should be persisted in Supabase Storage instead of depending only on `server/uploads`.
3. The frontend hid the real backend error behind a generic "backend server is running" alert.
4. Cloud upload endpoints require a valid wallet JWT. A deploy/JWT secret change can leave an old token in browser localStorage.

## Required Supabase step

Open Supabase -> SQL Editor and run:

`server/supabase_render_fix.sql`

You can safely run it more than once.

## Required Render environment variables

Set these in Render -> Web Service -> Environment:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (recommended) OR `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET=files`
- `JWT_SECRET` (long random value)
- `FILE_ENCRYPTION_SECRET` (different long random value)
- `CORS_ORIGINS=https://blockchain-pro.onrender.com`
- `ALLOW_GUEST_MODE=false`
- `MAX_FILE_SIZE_BYTES=52428800`

The browser/public values can stay as currently configured:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Do NOT put `SUPABASE_SECRET_KEY` or service-role key in any `VITE_...` variable.

## Render build/start

Build Command:

`npm install --include=dev --no-audit --no-fund && npm --prefix server install --omit=dev --no-audit --no-fund && npm run build`

Start Command:

`npm start`

After saving environment variables, choose **Manual Deploy -> Clear build cache & deploy**.

## Browser after deploy

If Cloud Storage returns 401, disconnect/reconnect MetaMask and sign the login message again. The old JWT may have been signed using the previous `JWT_SECRET`.

## Health test

Open:

`https://blockchain-pro.onrender.com/api/health`

Expected JSON includes:

`"status":"ok"` and `"database":"supabase"`.
