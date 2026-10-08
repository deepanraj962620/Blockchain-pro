// Cloudflare R2 Object Storage Client (S3-compatible)
// Provides 10GB/month free-tier encrypted blob storage with 0 egress bandwidth fees.

const { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  HeadBucketCommand,
  ListObjectsV2Command
} = require('@aws-sdk/client-s3');

let cachedR2Client = null;

function getR2Config() {
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucket = (process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || 'securechain-files').trim();
  const publicDomain = (process.env.R2_PUBLIC_DOMAIN || '').trim().replace(/\/+$/, '');

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicDomain,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`
  };
}

function isR2Configured() {
  return getR2Config() !== null;
}

function getR2Client() {
  if (cachedR2Client) return cachedR2Client;

  const config = getR2Config();
  if (!config) return null;

  try {
    const client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });

    cachedR2Client = {
      client,
      bucket: config.bucket,
      endpoint: config.endpoint,
      publicDomain: config.publicDomain
    };

    return cachedR2Client;
  } catch (err) {
    console.warn('[Cloudflare R2] Failed to initialize S3 client:', err.message);
    return null;
  }
}

async function uploadBufferToR2({ key, buffer, contentType = 'application/octet-stream' }) {
  const r2 = getR2Client();
  if (!r2) throw new Error('Cloudflare R2 is not configured.');

  const command = new PutObjectCommand({
    Bucket: r2.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType
  });

  await r2.client.send(command);

  const publicUrl = r2.publicDomain ? `${r2.publicDomain}/${key}` : null;

  return {
    key,
    bucket: r2.bucket,
    provider: 'cloudflare-r2',
    storagePath: `r2://${r2.bucket}/${key}`,
    publicUrl
  };
}

async function readBufferFromR2(key) {
  const r2 = getR2Client();
  if (!r2) throw new Error('Cloudflare R2 is not configured.');

  // Extract clean key if stored with r2:// URI prefix
  const cleanKey = key.replace(/^r2:\/\/[^/]+\//, '');

  const command = new GetObjectCommand({
    Bucket: r2.bucket,
    Key: cleanKey
  });

  const response = await r2.client.send(command);
  
  // Transform stream to Node Buffer
  const streamToBuffer = async (stream) => {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  };

  return await streamToBuffer(response.Body);
}

async function deleteBufferFromR2(key) {
  const r2 = getR2Client();
  if (!r2) return false;

  const cleanKey = key.replace(/^r2:\/\/[^/]+\//, '');

  try {
    const command = new DeleteObjectCommand({
      Bucket: r2.bucket,
      Key: cleanKey
    });
    await r2.client.send(command);
    return true;
  } catch (err) {
    console.warn('[Cloudflare R2] Delete failed:', err.message);
    return false;
  }
}

async function testR2Connection() {
  if (!isR2Configured()) {
    return {
      configured: false,
      connected: false,
      message: 'Cloudflare R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) not set.'
    };
  }

  const r2 = getR2Client();
  try {
    // List up to 1 object to verify bucket accessibility
    const command = new ListObjectsV2Command({
      Bucket: r2.bucket,
      MaxKeys: 1
    });
    await r2.client.send(command);

    return {
      configured: true,
      connected: true,
      provider: 'Cloudflare R2',
      bucket: r2.bucket,
      endpoint: r2.endpoint,
      freeTierAllowance: '10 GB free monthly storage, 0 egress fees'
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      error: `R2 connection test failed: ${err.message}`,
      bucket: r2.bucket,
      endpoint: r2.endpoint
    };
  }
}

function resetR2Client() {
  cachedR2Client = null;
}

module.exports = {
  isR2Configured,
  getR2Client,
  getR2Config,
  uploadBufferToR2,
  readBufferFromR2,
  deleteBufferFromR2,
  testR2Connection,
  resetR2Client
};
