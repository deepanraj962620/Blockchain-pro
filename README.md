# SecureChain Advanced

React + Vite frontend, Express/Socket.IO backend, MetaMask signature authentication, Supabase PostgreSQL + private Storage, encrypted cloud files, wallet-linked settings, and Render deployment support.

## Local development

```bash
npm install
npm --prefix server install
cp server/.env.example server/.env
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:5000`

## Production
See `DEPLOYMENT.md` and run `server/supabase_schema.sql` in Supabase before the first deploy.

## Local installation
Run this once from the project root after extracting the ZIP:

```bash
npm install
```

The root `postinstall` script automatically installs the backend packages in `server/` (including `multer`, Express, Supabase, Socket.IO and JWT). Then start both frontend and backend with:

```bash
npm run dev
```

If the backend dependencies were skipped for any reason, run:

```bash
npm run server:install
npm run dev
```


## Windows / Node 22 setup
SQLite fallback has been removed in this build. The backend is Supabase-only, which avoids native sqlite3 install failures. Run `npm install` and then `npm run dev`.
# Blockchain-pro
