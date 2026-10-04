const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

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

// Upload an encrypted buffer. When Supabase Storage is configured, upload the
// blob to the configured bucket. Otherwise, write to the local filesystem.
// Returns { cid, provider, localPath, fileName, contentHash, storagePath }.
async function uploadEncryptedBuffer(buffer, originalName, metadata = {}) {
  const fileName = `${Date.now()}-${safeFileName(originalName)}`;
  const { contentHash, cid } = computeContentIdentifier(buffer);

  // --- Supabase Storage path ---
  if (isSupabaseConfigured()) {
    const { client, bucket } = getSupabaseClient();
    // Ensure the bucket exists (best-effort).
    try {
      const { data: existing } = await client.storage.getBucket(bucket);
      if (!existing) {
        await client.storage.createBucket(bucket, { public: false });
      }
    } catch (e) {
      // Bucket may already exist; ignore.
    }

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

  // --- Local filesystem fallback ---
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
    contentHash
  };
}

// Read an encrypted/decrypted buffer back from storage.
// If storagePath is provided, tries Supabase Storage first.
// Otherwise falls back to localPath on disk.
async function readStoredBuffer({ storagePath, localPath }) {
  if (storagePath && isSupabaseConfigured()) {
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

  if (localPath && fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }

  throw new Error('File blob not found in storage');
}

// Delete a stored blob. Returns true if removed.
async function deleteStoredBuffer({ storagePath, localPath }) {
  let removed = false;

  if (storagePath && isSupabaseConfigured()) {
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
    } catch (e) {
      // ignore
    }
  }

  return removed;
}

module.exports = {
  uploadEncryptedBuffer,
  readStoredBuffer,
  deleteStoredBuffer,
  safeFileName,
  computeContentIdentifier
};
