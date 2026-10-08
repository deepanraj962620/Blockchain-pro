const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');
const { 
  isR2Configured, 
  uploadBufferToR2, 
  readBufferFromR2, 
  deleteBufferFromR2 
} = require('./r2Client');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function safeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Generates a content hash + fake IPFS CID (used as a content identifier).
function computeContentIdentifier(buffer) {
  const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const cid = `Qm${contentHash.slice(0, 44)}`;
  return { contentHash, cid };
}

function getActiveStorageProvider() {
  if (isR2Configured()) return 'cloudflare-r2';
  if (isSupabaseConfigured()) return 'supabase-storage';
  return 'local';
}

// Upload an encrypted buffer.
// Priority:
// 1. Cloudflare R2 (10GB free tier, 0 egress bandwidth fees)
// 2. Supabase Storage (if configured)
// 3. Local filesystem fallback
async function uploadEncryptedBuffer(buffer, originalName, metadata = {}) {
  const fileName = `${Date.now()}-${safeFileName(originalName)}`;
  const { contentHash, cid } = computeContentIdentifier(buffer);

  // --- 1. Cloudflare R2 Path (Primary when configured) ---
  if (isR2Configured()) {
    try {
      const key = `uploads/${fileName}`;
      const r2Result = await uploadBufferToR2({
        key,
        buffer,
        contentType: metadata.contentType || 'application/octet-stream'
      });

      return {
        cid,
        provider: 'cloudflare-r2',
        localPath: null,
        fileName,
        contentHash,
        storagePath: r2Result.storagePath,
        publicUrl: r2Result.publicUrl || null
      };
    } catch (err) {
      console.warn('[Cloudflare R2] Upload failed, falling back to secondary storage.', err.message);
    }
  }

  // --- 2. Supabase Storage Path ---
  if (isSupabaseConfigured()) {
    const { client, bucket } = getSupabaseClient();
    try {
      const { data: existing } = await client.storage.getBucket(bucket);
      if (!existing) {
        await client.storage.createBucket(bucket, { public: false });
      }
    } catch (_) {}

    try {
      const storagePath = `uploads/${fileName}`;
      const { error } = await client.storage
        .from(bucket)
        .upload(storagePath, buffer, {
          contentType: metadata.contentType || 'application/octet-stream',
          upsert: true
        });

      if (!error) {
        const { data: urlData } = client.storage.from(bucket).getPublicUrl(storagePath);
        return {
          cid,
          provider: 'supabase-storage',
          localPath: null,
          fileName,
          contentHash,
          storagePath,
          publicUrl: urlData?.publicUrl || null
        };
      } else {
        console.warn('Supabase Storage upload failed, falling back to local storage.', error.message);
      }
    } catch (err) {
      console.warn('Supabase Storage upload failed, falling back to local storage.', err.message);
    }
  }

  // --- 3. Local filesystem fallback ---
  const localPath = path.join(uploadDir, fileName);
  fs.writeFileSync(localPath, buffer);

  // Attempt Pinata (optional, requires PINATA_JWT).
  const pinataJwt = process.env.PINATA_JWT;
  if (pinataJwt) {
    try {
      const formData = new FormData();
      formData.append('file', new Blob([buffer], { type: metadata.contentType || 'application/octet-stream' }), fileName);
      formData.append('pinataMetadata', JSON.stringify({ name: fileName, keyvalues: { source: '4rp' } }));

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: { Authorization: `Bearer ${pinataJwt}` },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        return {
          cid: data.IpfsHash || cid,
          provider: 'pinata',
          localPath,
          fileName,
          contentHash
        };
      }
    } catch (err) {
      console.warn('Pinata upload failed, falling back to local storage.', err.message);
    }
  }

  return {
    cid,
    provider: 'local',
    localPath,
    fileName,
    contentHash,
    storagePath: null
  };
}

// Read an encrypted/decrypted buffer back from storage.
async function readStoredBuffer({ storagePath, localPath }) {
  // If stored in Cloudflare R2
  if (storagePath && storagePath.startsWith('r2://')) {
    try {
      return await readBufferFromR2(storagePath);
    } catch (err) {
      console.warn('[Cloudflare R2] Download failed, trying local fallback:', err.message);
    }
  }

  // If stored in Supabase Storage
  if (storagePath && isSupabaseConfigured() && !storagePath.startsWith('r2://')) {
    const { client, bucket } = getSupabaseClient();
    try {
      const { data, error } = await client.storage.from(bucket).download(storagePath);
      if (!error && data) {
        const arrayBuffer = await data.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    } catch (err) {
      console.warn('Supabase Storage read failed, falling back to local storage.', err.message);
    }
  }

  // Local fallback
  if (localPath && fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }

  throw new Error('File blob not found in storage (checked R2, Supabase, and local disk)');
}

// Delete a stored blob. Returns true if removed.
async function deleteStoredBuffer({ storagePath, localPath }) {
  let removed = false;

  if (storagePath && storagePath.startsWith('r2://')) {
    removed = await deleteBufferFromR2(storagePath);
  }

  if (storagePath && isSupabaseConfigured() && !storagePath.startsWith('r2://')) {
    const { client, bucket } = getSupabaseClient();
    try {
      const { error } = await client.storage.from(bucket).remove([storagePath]);
      if (!error) removed = true;
    } catch (err) {
      console.warn('Supabase Storage delete failed.', err.message);
    }
  }

  if (localPath && fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
      removed = true;
    } catch (_) {}
  }

  return removed;
}

module.exports = {
  uploadEncryptedBuffer,
  readStoredBuffer,
  deleteStoredBuffer,
  safeFileName,
  computeContentIdentifier,
  getActiveStorageProvider
};
