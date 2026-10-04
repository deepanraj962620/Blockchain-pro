# SecureChain — Production Deployment Guide (Vercel + Render + Supabase)

This repository is optimized for web-wide file transfer using **Vercel** for the frontend, **Render / Railway** for the Node.js Express backend (WebSockets + PeerJS), and **Supabase** for PostgreSQL database and encrypted file storage.

---

## 1. Supabase Database & Storage Setup

1. Log in to [Supabase Console](https://supabase.com) and create a project.
2. Open **SQL Editor** and execute `server/supabase_schema.sql` and `server/supabase_render_fix.sql`.
3. Confirm these tables exist: `messages`, `transfers`, `activities`, `contacts`, `cloud_files`, `user_profiles`.
4. Go to **Storage** and ensure a bucket named `files` is created. Keep it **private** (uncheck public).

---

## 2. Vercel Frontend Deployment

1. Import your GitHub repository into [Vercel](https://vercel.com).
2. Vercel will auto-detect **Vite** as the framework framework.
3. Keep default build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables in Vercel settings:
   - `VITE_API_URL` = `https://your-backend-app.onrender.com/api` (replace with your actual Render/Railway backend domain)
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_...`
5. Click **Deploy**. Vercel will build the React single-page application and route requests using `vercel.json`.

---

## 3. Render / Railway Backend Deployment

1. Create a **Web Service** on Render or Railway connected to the repository.
2. Set Environment Variables:
   ```text
   NODE_ENV=production
   PORT=10000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SECRET_KEY=sb_secret_...
   SUPABASE_BUCKET=files
   JWT_SECRET=generate-a-long-random-key
   FILE_ENCRYPTION_SECRET=generate-a-long-random-key
   CORS_ORIGINS=https://your-app.vercel.app
   ALLOW_GUEST_MODE=false
   MAX_FILE_SIZE_BYTES=52428800
   ```
3. Set Build & Start Commands:
   - **Build Command**: `cd server && npm install --no-audit --no-fund`
   - **Start Command**: `npm start`
4. Health check endpoint: `/api/health`

---

## 4. Wallet Authentication & Web3 Security

1. User connects MetaMask on the Vercel frontend.
2. Frontend requests `/api/auth/nonce` from the backend.
3. User signs the login challenge message using their MetaMask private key.
4. Backend verifies the signature on-chain using `ethers.verifyMessage` and issues a secure JWT token.
5. No private key or seed phrase is ever sent or stored.

---

## 5. Blockchain Smart Contract Anchoring (Optional)

To enable on-chain recording of file hashes in `CloudStorage.sol`:
Set these in your backend environment variables:
```text
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=YOUR_DEPLOYER_PRIVATE_KEY
CONTRACT_ADDRESS=0x...
ETHEREUM_NETWORK=sepolia
```
If empty, the app will operate seamlessly using AES-encrypted Supabase cloud storage.
