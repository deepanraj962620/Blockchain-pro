# Security fixes applied

- Protected `/api/clear` with wallet authentication plus `ADMIN_WALLET_ADDRESS`.
- Added authenticated ownership checks to cloud download, verify, share and delete routes.
- Transfer passwords are now stored as salted scrypt hashes instead of plaintext.
- Transfer download password validation now happens on the backend.
- Removed hardcoded JWT/encryption fallback secrets; deployment must provide secure environment variables.
- Protected message read/send/edit/delete APIs with wallet authentication and participant checks.
- Restricted CORS/Socket.IO origins to the deployed Render domain and local development origins.
- Health endpoint now reports `not-configured` instead of the removed SQLite fallback.

## Required Render environment variables

- `JWT_SECRET`: long random secret
- `FILE_ENCRYPTION_SECRET`: long random secret
- `ADMIN_WALLET_ADDRESS`: your admin MetaMask wallet address
- `CORS_ORIGINS`: `https://blockchain-pro.onrender.com`

Keep the existing Supabase variables configured as before.
