try { process.loadEnvFile?.(require('path').join(__dirname, '.env')); } catch (_) {}
try { process.loadEnvFile?.(require('path').join(__dirname, '..', '.env')); } catch (_) {}
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const { Server } = require('socket.io');
const { PeerServer, ExpressPeerServer } = require('peer');
const { verifyMessage, getAddress } = require('ethers');
const { authenticateUser, requireRole, signToken } = require('./lib/auth');
const { deriveEncryptionKey, encryptBuffer, decryptBuffer, computeFileHash, computeBufferHash, generateShareToken } = require('./lib/crypto');
const { uploadEncryptedBuffer, readStoredBuffer, deleteStoredBuffer, getActiveStorageProvider } = require('./lib/storage');
const { isR2Configured, testR2Connection } = require('./lib/r2Client');
const { recordFileOnChain } = require('./lib/blockchain');
const { deleteMetadataFromSupabase } = require('./lib/supabase');
const db = require('./lib/db');

const app = express();
const server = http.createServer(app);

const getDynamicOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  const configured = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (
    configured.length === 0 ||
    configured.includes('*') ||
    configured.includes(origin) ||
    origin.endsWith('.vercel.app') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  ) {
    return callback(null, true);
  }
  return callback(null, true);
};

const io = new Server(server, {
  cors: {
    origin: getDynamicOrigin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = Number(process.env.PORT || 5000);
const PEER_PORT = Number(process.env.PEER_PORT || 9000);

const walletNonces = new Map();

const startServer = (port, fallbackPorts = []) => {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && fallbackPorts.length > 0) {
      const nextPort = fallbackPorts.shift();
      console.warn(`Port ${port} is busy, trying ${nextPort} instead.`);
      server.removeAllListeners('error');
      startServer(nextPort, fallbackPorts);
      return;
    }

    throw err;
  });

  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

// ExpressPeerServer attached to main Express app on /peerjs for single-port cloud hosts (Render / Railway / Vercel WAN)
try {
  const peerServerInstance = ExpressPeerServer(server, {
    debug: true,
    path: '/'
  });
  app.use('/peerjs', peerServerInstance);
  console.log('ExpressPeerServer initialized on path /peerjs');
} catch (e) {
  console.warn('ExpressPeerServer fallback warning:', e.message);
  // Fallback to standalone port if needed
  try {
    PeerServer({ port: PEER_PORT, path: '/peerjs' });
  } catch (_) {}
}

app.use(cors({
  origin: getDynamicOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-File-Password'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Set up storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage, 
  limits: { 
    fileSize: 1024 * 1024 * 50 // 50MB
  }
});

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('join', (address) => {
    socket.join(address);
    console.log(`User ${address} joined their room`);
  });

  socket.on('send-message', (data) => {
    console.log('Message relay:', data.sender, '->', data.recipient);
    io.to(data.recipient).emit('receive-message', data);
  });

  socket.on('file-transfer-init', (data) => {
    console.log('Transfer init:', data.name, '->', data.recipient);
    io.to(data.recipient).emit('incoming-transfer', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// --- API ENDPOINTS ---

// Health & Diagnostics Check
app.get('/api/health', async (req, res) => {
  const shouldTest = req.query.test === 'true';
  const dbStatus = db.isSupabaseConfigured() ? 'supabase' : 'in-memory-dev';
  const storageProvider = getActiveStorageProvider();
  
  if (shouldTest) {
    const dbDiagnostics = await db.testConnection();
    const r2Diagnostics = await testR2Connection();
    return res.json({
      status: dbDiagnostics.connected || dbDiagnostics.mode === 'in-memory' ? 'ok' : 'degraded',
      database: dbStatus,
      storage: {
        activeProvider: storageProvider,
        r2: r2Diagnostics,
        supabaseStorage: dbDiagnostics.storage
      },
      diagnostics: {
        db: dbDiagnostics,
        r2: r2Diagnostics
      },
      time: new Date().toISOString()
    });
  }

  res.json({
    status: 'ok',
    database: dbStatus,
    storage: {
      activeProvider: storageProvider,
      r2Configured: isR2Configured(),
      supabaseConfigured: db.isSupabaseConfigured()
    },
    time: new Date().toISOString()
  });
});

app.get('/api/health/db', async (req, res) => {
  const diagnostics = await db.testConnection();
  res.json(diagnostics);
});

app.get('/api/health/storage', async (req, res) => {
  const r2Diagnostics = await testR2Connection();
  const dbDiagnostics = await db.testConnection();
  res.json({
    activeProvider: getActiveStorageProvider(),
    cloudflareR2: r2Diagnostics,
    supabaseStorage: {
      configured: db.isSupabaseConfigured(),
      connected: dbDiagnostics.storage,
      bucket: dbDiagnostics.bucket
    }
  });
});

function normalizeWallet(value) {
  return String(value || '').trim().toLowerCase();
}

function isMessageParticipant(message, wallet) {
  const target = normalizeWallet(wallet);
  return normalizeWallet(message?.sender) === target || normalizeWallet(message?.recipient) === target;
}

function hashTransferPassword(password) {
  if (!password) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyTransferPassword(password, stored) {
  if (!stored) return true;
  if (!password || !stored.startsWith('scrypt$')) return false;
  const [, salt, expectedHex] = stored.split('$');
  if (!salt || !expectedHex) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// Messages
app.get('/api/messages/all', authenticateUser, async (req, res) => {
  try {
    const rows = await db.getMessagesByAddress(req.user.walletAddress);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages/:address', authenticateUser, async (req, res) => {
  try {
    const { address } = req.params;
    if (normalizeWallet(address) !== normalizeWallet(req.user.walletAddress)) {
      return res.status(403).json({ error: 'You can only read your own messages' });
    }
    const messages = await db.getMessagesByAddress(address);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', authenticateUser, async (req, res) => {
  try {
    const { recipient, text, fileName, fileSize, isFile, time, type } = req.body;
    if (!recipient) return res.status(400).json({ error: 'recipient is required' });
    const sender = req.user.walletAddress;
    const newMessage = await db.createMessage({ recipient, sender, text, fileName, fileSize, isFile, time, type });
    io.to(recipient).emit('receive-message', newMessage);
    res.json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/messages/:id', authenticateUser, async (req, res) => {
  try {
    const message = await db.getMessage(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (!isMessageParticipant(message, req.user.walletAddress)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await db.deleteMessage(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/messages/:id', authenticateUser, async (req, res) => {
  try {
    const { text } = req.body;
    const message = await db.getMessage(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (normalizeWallet(message.sender) !== normalizeWallet(req.user.walletAddress)) {
      return res.status(403).json({ error: 'Only the sender can edit this message' });
    }
    await db.updateMessageText(req.params.id, text);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Transfers
app.get('/api/transfers', async (req, res) => {
  try {
    const rows = await db.getTransfers();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transfers', upload.single('file'), async (req, res) => {
  console.log('Received transfer request:', req.body.name);
  const { id, name, size, date, status, type, color, recipient, sender, password, hasBlob } = req.body;
  let filePath = req.file ? req.file.path : null;
  let storagePath = null;
  
  if (!id || !name) {
    if (filePath) { try { fs.unlinkSync(filePath); } catch (_) {} }
    console.error('Missing required fields:', { id, name });
    return res.status(400).json({ error: 'Missing required fields: id and name' });
  }

  try {
    const passwordHash = hashTransferPassword(password);

    // Persist uploaded blob in Supabase Storage when available, keeping local disk as fallback.
    if (req.file) {
      const rawBuffer = fs.readFileSync(req.file.path);
      const stored = await uploadEncryptedBuffer(rawBuffer, req.file.originalname, {
        contentType: req.file.mimetype || 'application/octet-stream'
      });
      storagePath = stored.storagePath || null;
      if (storagePath) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        filePath = null;
      }
    }

    await db.createTransfer({
      id,
      name,
      size,
      date,
      status,
      type,
      color,
      recipient,
      sender: sender || req.user?.walletAddress || 'Anonymous',
      password: passwordHash,
      hasBlob: hasBlob === 'true',
      filePath,
      storagePath
    });

    console.log('Transfer successfully saved to database:', name);
    const transferData = {
      id,
      name,
      size,
      date,
      status,
      type,
      color,
      recipient,
      sender: sender || req.user?.walletAddress || 'Anonymous',
      hasBlob: hasBlob === 'true'
    };
    io.to(recipient).emit('incoming-transfer', transferData);
    res.json({ success: true, id });
  } catch (err) {
    if (filePath) { try { fs.unlinkSync(filePath); } catch (_) {} }
    console.error('Database error during transfer insert:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transfers/:id', async (req, res) => {
  try {
    const transfer = await db.getTransfer(req.params.id);
    if (transfer && transfer.filePath) {
      fs.unlink(transfer.filePath, () => {});
    }
    await db.deleteTransfer(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transfers/download/:id', async (req, res) => {
  try {
    const row = await db.getTransfer(req.params.id);
    if (!row || (!row.filePath && !row.storagePath)) return res.status(404).json({ error: "File not found" });
    const suppliedPassword = req.get('X-File-Password') || '';
    if (row.password && !verifyTransferPassword(suppliedPassword, row.password)) {
      return res.status(401).json({ error: 'Incorrect file password' });
    }
    if (row.storagePath) {
      const buffer = await readStoredBuffer({ storagePath: row.storagePath, localPath: row.filePath });
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(row.name || 'file')}`);
      res.setHeader('Content-Type', 'application/octet-stream');
      return res.send(buffer);
    }
    res.download(row.filePath, row.name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activities
app.get('/api/activities', async (req, res) => {
  try {
    const rows = await db.getActivities();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const { type, file, target, time, date } = req.body;
    const activity = await db.createActivity({ type, file, target, time, date });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/activities/:id', async (req, res) => {
  try {
    await db.deleteActivity(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/activities/byFile/:fileName', async (req, res) => {
  try {
    await db.deleteActivityByFile(req.params.fileName);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/activities/editFile/:oldName', async (req, res) => {
  try {
    const { newName } = req.body;
    await db.editActivityFile(req.params.oldName, newName);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Contacts
app.get('/api/contacts', async (req, res) => {
  try {
    const rows = await db.getContacts();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const { id, name, status, alias, dateAdded, address } = req.body;
    const contact = await db.upsertContact({ id, name, status });
    res.json({ success: true, ...contact, alias, dateAdded, address });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  try {
    await db.deleteContact(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Cloud Storage (Blockchain) Endpoints ---

function addActivity(type, file, target = '', userId = 'guest') {
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return db.createActivity({ type, file, target: `${target || userId}`.substring(0, 40), time, date });
}

app.post('/api/auth/nonce', async (req, res) => {
  try {
    const { walletAddress } = req.body || {};
    if (!walletAddress) return res.status(400).json({ error: 'walletAddress is required' });
    const address = getAddress(walletAddress);
    const nonce = crypto.randomBytes(18).toString('hex');
    const message = `SecureChain login\nWallet: ${address}\nNonce: ${nonce}\nDomain: ${req.get('host') || 'securechain'}`;
    walletNonces.set(address.toLowerCase(), { nonce, message, expiresAt: Date.now() + 5 * 60 * 1000 });
    res.json({ message, expiresInSeconds: 300 });
  } catch (err) {
    res.status(400).json({ error: 'Invalid wallet address' });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  try {
    const { walletAddress, signature } = req.body || {};
    if (!walletAddress || !signature) return res.status(400).json({ error: 'walletAddress and signature are required' });
    const address = getAddress(walletAddress);
    const pending = walletNonces.get(address.toLowerCase());
    if (!pending || pending.expiresAt < Date.now()) {
      walletNonces.delete(address.toLowerCase());
      return res.status(401).json({ error: 'Login challenge expired. Please reconnect your wallet.' });
    }
    const recovered = getAddress(verifyMessage(pending.message, signature));
    if (recovered.toLowerCase() !== address.toLowerCase()) return res.status(401).json({ error: 'Wallet signature verification failed' });
    walletNonces.delete(address.toLowerCase());
    const role = 'user';
    const token = signToken({ id: address, walletAddress: address, role });
    const profile = await db.upsertUserProfile(address, {});
    await addActivity('wallet_login', address, address, address);
    res.json({ token, user: { id: address, walletAddress: address, role }, profile });
  } catch (err) {
    res.status(401).json({ error: err.message || 'Wallet verification failed' });
  }
});

// Legacy development login. Disable in production unless explicitly enabled.
app.post('/api/auth/login', async (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_INSECURE_WALLET_LOGIN !== 'true') {
    return res.status(403).json({ error: 'Use /api/auth/nonce and /api/auth/verify for wallet login.' });
  }
  try {
    const { walletAddress, role = 'user' } = req.body || {};
    const address = walletAddress || 'guest';
    const token = signToken({ id: address, walletAddress: address, role });
    const profile = await db.upsertUserProfile(address, {});
    res.json({ token, user: { id: address, walletAddress: address, role }, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings', authenticateUser, async (req, res) => {
  try {
    const wallet = req.user?.walletAddress || req.user?.id;
    const profile = await db.getUserProfile(wallet);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', authenticateUser, async (req, res) => {
  try {
    const wallet = req.user?.walletAddress || req.user?.id;
    const allowed = ['display_name', 'notifications', 'network', 'ipfs_gateway', 'theme', 'subscription'];
    const updates = {};
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) updates[key] = req.body[key];
    const profile = await db.upsertUserProfile(wallet, updates);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cloud', authenticateUser, async (req, res) => {
  try {
    const rows = await db.getCloudFiles(req.user?.walletAddress || req.user?.id || null);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cloud/stats', authenticateUser, async (req, res) => {
  try {
    const stats = await db.getCloudStats(req.user?.walletAddress || req.user?.id || null);
    const storageProvider = getActiveStorageProvider();
    res.json({
      ...stats,
      storageProvider,
      providerLabel: storageProvider === 'cloudflare-r2' ? 'Cloudflare R2 (10 GB Free Tier)' : (storageProvider === 'supabase-storage' ? 'Supabase Storage' : 'Local Storage')
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cloud/upload', upload.single('file'), authenticateUser, async (req, res) => {
  try {
    const file = req.file;
    const body = req.body || {};
    const owner = req.user?.walletAddress || req.user?.id;
    const userId = req.user?.id || owner;
    const maxSize = Number(process.env.MAX_FILE_SIZE_BYTES || 50 * 1024 * 1024);
    if (!file) return res.status(400).json({ error: 'No file provided' });
    if (file.size > maxSize) return res.status(413).json({ error: 'File exceeds allowed size' });

const id = crypto.randomBytes(8).toString('hex');
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timestamp = Date.now();
    const type = (file.originalname.split('.').pop() || 'file').toLowerCase();
    const buffer = fs.readFileSync(file.path);
    const encryptionSeed = `${owner}:${file.originalname}:${id}`;
    const encryptionKey = deriveEncryptionKey(encryptionSeed);
    const { ivHex, encryptedBuffer } = encryptBuffer(buffer, encryptionKey);
    const encryptedFilePath = path.join(path.dirname(file.path), `${id}-${path.basename(file.path)}.enc`);
    fs.writeFileSync(encryptedFilePath, encryptedBuffer);
    fs.unlinkSync(file.path);

    const fileHash = computeBufferHash(encryptedBuffer);
    const storageResult = await uploadEncryptedBuffer(encryptedBuffer, file.originalname, { contentType: file.mimetype || 'application/octet-stream' });
    const { txHash, status: chainStatus } = await recordFileOnChain({
      fileName: file.originalname,
      fileHash,
      ipfsCid: storageResult.cid,
      ownerWallet: owner
    });

    const metadataProvider = db.isSupabaseConfigured() ? 'supabase' : 'local';

    try {
      await db.createCloudFile({
        id, name: file.originalname, size: file.size, type, date, timestamp,
        filePath: encryptedFilePath, hash: fileHash, encrypted: true, owner,
        cid: storageResult.cid, txHash, ivHex, encryptionSeed, userId,
        metadataStatus: metadataProvider, blockchainStatus: chainStatus,
        storagePath: storageResult.storagePath || null
      });
      addActivity('upload', file.originalname, owner, userId).catch(console.error);
      res.json({
        success: true,
        id,
        name: file.originalname,
        size: file.size,
        type,
        date,
        timestamp,
        hash: fileHash,
        encrypted: true,
        owner,
        cid: storageResult.cid,
        txHash,
        metadataStatus: metadataProvider,
        storageProvider: storageResult.provider,
        blockchainStatus: chainStatus
      });
    } catch (err) {
      console.error('Cloud upload DB error:', err.message);
      res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error('Cloud upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cloud/download/:id', authenticateUser, async (req, res) => {
  try {
    const row = await db.getCloudFile(req.params.id);
    if (!row || Number(row.deleted) === 1) return res.status(404).json({ error: 'File not found' });
    if (normalizeWallet(row.owner) !== normalizeWallet(req.user.walletAddress)) {
      return res.status(403).json({ error: 'You do not own this file' });
    }
    const encryptionKey = deriveEncryptionKey(row.encryptionSeed || `${row.owner}:${row.name}:${row.id}`);
    const encryptedBuffer = await readStoredBuffer({ storagePath: row.storagePath, localPath: row.filePath });
    const decrypted = decryptBuffer(encryptedBuffer, encryptionKey);
    res.setHeader('Content-Disposition', `attachment; filename="${row.name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(decrypted);
    addActivity('download', row.name, row.owner, req.user?.id || 'guest').catch(console.error);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/cloud/verify/:id', authenticateUser, async (req, res) => {
  try {
    const row = await db.getCloudFile(req.params.id);
    if (!row || Number(row.deleted) === 1) return res.status(404).json({ error: 'File not found' });
    if (normalizeWallet(row.owner) !== normalizeWallet(req.user.walletAddress)) {
      return res.status(403).json({ error: 'You do not own this file' });
    }
    const encryptedBuffer = await readStoredBuffer({ storagePath: row.storagePath, localPath: row.filePath });
    const currentHash = computeBufferHash(encryptedBuffer);
    const matches = currentHash === row.hash;
    await db.updateCloudFile(row.id, { verified: matches });
    addActivity('verify', row.name, row.owner, req.user?.id || 'guest').catch(console.error);
    res.json({ name: row.name, storedHash: row.hash, currentHash, matches });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/cloud/share/:id', authenticateUser, async (req, res) => {
  try {
    const { walletAddress, expiresAt, readOnly = true } = req.body || {};
    const row = await db.getCloudFile(req.params.id);
    if (!row || Number(row.deleted) === 1) return res.status(404).json({ error: 'File not found' });
    if (normalizeWallet(row.owner) !== normalizeWallet(req.user.walletAddress)) {
      return res.status(403).json({ error: 'You do not own this file' });
    }

    const shareToken = generateShareToken(`${row.id}:${walletAddress}`);
    const sharedAt = new Date().toISOString();
    await db.updateCloudFile(row.id, {
      shareToken,
      shareExpiry: expiresAt || null,
      sharePermission: readOnly ? 'read-only' : 'read-write',
      sharedWith: walletAddress || null,
      sharedAt
    });
    addActivity('share', row.name, walletAddress, req.user?.id || 'guest').catch(console.error);
    res.json({ success: true, shareToken, shareUrl: `/shared/${shareToken}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Retrieve public metadata for a shared file by token
app.get('/api/cloud/shared/:shareToken', async (req, res) => {
  try {
    const { shareToken } = req.params;
    const row = await db.getCloudFileByShareToken(shareToken);
    if (!row || Number(row.deleted) === 1) {
      return res.status(404).json({ error: 'Shared file not found or has been revoked' });
    }
    if (row.shareExpiry && new Date(row.shareExpiry).getTime() < Date.now()) {
      return res.status(410).json({ error: 'This shared file link has expired' });
    }

    res.json({
      id: row.id,
      name: row.name,
      size: row.size,
      type: row.type,
      date: row.date,
      owner: row.owner,
      verified: row.verified,
      hash: row.hash,
      sharedWith: row.sharedWith,
      sharedAt: row.sharedAt,
      sharePermission: row.sharePermission || 'read-only'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Download a shared file by token (public link recipient download with decryption)
app.get('/api/cloud/shared/download/:shareToken', async (req, res) => {
  try {
    const { shareToken } = req.params;
    const row = await db.getCloudFileByShareToken(shareToken);
    if (!row || Number(row.deleted) === 1) {
      return res.status(404).json({ error: 'Shared file not found or has been revoked' });
    }
    if (row.shareExpiry && new Date(row.shareExpiry).getTime() < Date.now()) {
      return res.status(410).json({ error: 'This shared file link has expired' });
    }

    const encryptionKey = deriveEncryptionKey(row.encryptionSeed || `${row.owner}:${row.name}:${row.id}`);
    const encryptedBuffer = await readStoredBuffer({ storagePath: row.storagePath, localPath: row.filePath });
    const decrypted = decryptBuffer(encryptedBuffer, encryptionKey);

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(row.name || 'shared-file')}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(decrypted);

    addActivity('download_shared', row.name, shareToken.substring(0, 8), row.owner).catch(console.error);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/cloud/:id', authenticateUser, async (req, res) => {
  try {
    const row = await db.getCloudFile(req.params.id);
    if (!row || Number(row.deleted) === 1) return res.status(404).json({ error: 'File not found' });
    if (normalizeWallet(row.owner) !== normalizeWallet(req.user.walletAddress)) {
      return res.status(403).json({ error: 'You do not own this file' });
    }
    await deleteMetadataFromSupabase(row.id);
    await deleteStoredBuffer({ storagePath: row.storagePath, localPath: row.filePath });
    await db.updateCloudFile(row.id, { deleted: true });
    addActivity('delete', row.name, row.owner, req.user?.id || 'guest').catch(console.error);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Clear All Data Endpoint
app.delete('/api/clear', authenticateUser, async (req, res) => {
  try {
    const adminWallet = process.env.ADMIN_WALLET_ADDRESS;
    if (!adminWallet || normalizeWallet(req.user.walletAddress) !== normalizeWallet(adminWallet)) {
      return res.status(403).json({ error: 'Admin wallet required' });
    }
    await db.clearAllData();
    res.json({ success: true, message: 'All data cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve the built React frontend from the same Render service.
const frontendDist = path.join(__dirname, '..', 'dist');
const frontendIndex = path.join(frontendDist, 'index.html');
if (fs.existsSync(frontendIndex)) {
  console.log(`Serving frontend from ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(frontendIndex));
} else {
  console.error(`Frontend build missing: ${frontendIndex}`);
  app.get(/^(?!\/api).*/, (req, res) => {
    res.status(503).send('SecureChain frontend build is missing. On Render use: npm install --include=dev && npm --prefix server install --omit=dev && npm run build');
  });
}

startServer(PORT, [PORT + 1, PORT + 2, PORT + 3, PORT + 4]);
