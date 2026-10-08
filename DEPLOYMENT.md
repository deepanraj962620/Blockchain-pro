# SecureChain — Perfect Production Deployment Guide

This repository is a Web3 wallet-authenticated, decentralized, AES-256 encrypted file transfer & cloud storage platform.

---

## Architecture Breakdown

To understand how the application deploys, review the three essential layers:

```
┌────────────────────────────────────────┐
│     1. React 19 / Vite Frontend        │
│   (Web3 MetaMask, AES cipher, UI)      │
└──────────────────┬─────────────────────┘
                   │
                   ▼ HTTP / WebSocket / Socket.IO
┌────────────────────────────────────────┐
│    2. Node.js Express API Server       │
│  (Auth, Multer, PeerJS, Buffer crypto) │
└──────────────────┬─────────────────────┘
                   │
                   ▼ PostgreSQL & Storage API
┌────────────────────────────────────────┐
│     3. Supabase Cloud Infrastructure   │
│  (PostgreSQL tables & 'files' bucket)  │
└────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Why your previous deployment had an API error:**  
> In Supabase, there is no Node.js runtime. Supabase is a database and file storage engine. The Express backend (`server/index.js`) must be deployed as a **Web Service** (not a static site) so it can receive `/api/*` requests, verify MetaMask signatures, run WebSockets, and encrypt/decrypt file streams.

---

## ⚡ Deployment Plan A: Unified Fullstack on Render (Recommended & Simplest)

In this plan, Render hosts **both** the frontend and the Express backend in a single Web Service.
- Same-origin domain (no CORS problems)
- Socket.IO and WebRTC PeerJS work on the same port
- Single dashboard to manage

### Step 1: Supabase Setup
1. Log in to [Supabase](https://supabase.com) and create or open your project.
2. Go to **SQL Editor** -> **New query**.
3. Copy and run `server/supabase_schema.sql` (and `server/supabase_render_fix.sql`).
4. Go to **Project Settings** -> **API** and copy:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **anon key** (`eyJ...`)

### Step 1.5: Cloudflare R2 Setup (Recommended for 10 GB Free Tier & 0 Egress Fees)
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **R2 Object Storage**.
2. Click **Create bucket**, name it `securechain-files`, and select your preferred region.
3. On the R2 overview page, copy your **Account ID** from the right sidebar.
4. Click **Manage R2 API Tokens** -> **Create API token**:
   - Permissions: **Object Read & Write**
   - Apply to bucket: `securechain-files` (or all buckets)
   - Click **Create API Token**.
5. Save your **Access Key ID** and **Secret Access Key**.
6. (Optional): To enable direct public access, go to Bucket Settings -> Public Access -> enable Custom Domain or R2.dev subdomain.

### Step 2: Render Web Service Setup
1. In [Render Dashboard](https://dashboard.render.com), click **New +** -> **Web Service**.
2. Connect your GitHub repository `Blockchain-pro`.
3. Set the following settings:
   - **Name**: `securechain` (or your chosen name)
   - **Region**: Choose the closest region to your Supabase project
   - **Branch**: `main`
   - **Root Directory**: Leave blank (root `.`)
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install --include=dev --no-audit --no-fund && npm --prefix server install --omit=dev --no-audit --no-fund && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Plan**: `Free`

4. Add **Environment Variables** in Render:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `10000` | Render HTTP port |
   | `SUPABASE_URL` | `https://<your-project>.supabase.co` | Supabase Project URL |
   | `SUPABASE_SECRET_KEY` | `sb_secret_...` or service_role key | Grants backend full database & storage access |
   | `SUPABASE_ANON_KEY` | `eyJ...` | Supabase anon key |
   | `SUPABASE_BUCKET` | `files` | Storage bucket name |
   | `JWT_SECRET` | *Click 'Generate' or enter long random string* | Session signing secret |
   | `FILE_ENCRYPTION_SECRET` | *Click 'Generate' or enter long random string* | AES encryption master secret |
   | `ALLOW_GUEST_MODE` | `false` | Requires wallet authentication |
   | `MAX_FILE_SIZE_BYTES` | `52428800` | 50MB max file transfer size |
   | `VITE_SUPABASE_URL` | `https://<your-project>.supabase.co` | Browser Supabase URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` (or anon key) | Browser Supabase key |

   **Optional (Recommended): Cloudflare R2 10GB Free Tier Cloud Storage:**
   | Key | Value | Description |
   |---|---|---|
   | `R2_ACCOUNT_ID` | `your-cloudflare-account-id` | Cloudflare Dashboard -> R2 -> Account ID |
   | `R2_ACCESS_KEY_ID` | `your-r2-access-key-id` | From R2 API Token |
   | `R2_SECRET_ACCESS_KEY` | `your-r2-secret-access-key` | From R2 API Token |
   | `R2_BUCKET_NAME` | `securechain-files` | R2 bucket name |
   | `R2_PUBLIC_DOMAIN` | `https://pub-xxx.r2.dev` *(optional)* | Custom domain or public R2 URL |

   *(Leave `VITE_API_URL` empty on Render because frontend and backend share the same origin).*

5. Click **Deploy Web Service**.
6. Once deployed, verify by opening `https://your-service.onrender.com/api/health?test=true` in your browser. You should see `"status": "ok"` and `"database": "supabase"`.

---

## 🚀 Deployment Plan B: Decoupled (Vercel Frontend + Render Backend + Supabase)

Use this plan if you prefer hosting your React SPA on Vercel's global CDN while running the Node.js API on Render.

### Step 1: Deploy Backend to Render
Follow **Deployment Plan A**, but add:
- `CORS_ORIGINS`: `https://your-app.vercel.app`

Note your Render URL: e.g., `https://your-backend.onrender.com`.

### Step 2: Deploy Frontend to Vercel
1. In [Vercel](https://vercel.com), click **Add New** -> **Project** -> Import `Blockchain-pro`.
2. Framework Preset: **Vite**.
3. Build Settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add Environment Variables in Vercel:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://your-backend.onrender.com/api` |
   | `VITE_SUPABASE_URL` | `https://<your-project>.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
5. Click **Deploy**.

---

## 🔍 How to Test File Sharing & Transfers

1. **Connect Wallet**: Click "Connect Wallet" with MetaMask on Sepolia or Ethereum Mainnet (or use Guest Mode if enabled).
2. **Send File**:
   - Go to **Send File**.
   - Select a test file and specify a recipient wallet address (e.g., `0x7B21c1f...a8F3`).
   - Click **Send Securely**.
   - The file is encrypted, uploaded to Supabase Storage, and logged to the transfers table.
3. **Receive File**:
   - Go to **Receive Files** to view incoming transfers and click **Download** to decrypt.
4. **Cloud Storage & Link Sharing**:
   - Go to **Cloud Storage** and upload a file.
   - Click the **Share** button on any file.
   - A secure link `https://your-domain.com/shared/<token>` is generated and copied to your clipboard.
   - Open that link in an incognito window — the recipient can view the file and click **Download Decrypted File** directly without an API error!
