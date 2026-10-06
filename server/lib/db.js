// Data-access layer.
// Uses Supabase (PostgreSQL) when configured, otherwise falls back to a clean in-memory store
// for zero-configuration local testing while maintaining high-fidelity production persistence via Supabase.

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

// Convert row booleans (0/1 or true/false) to JS booleans for cloud_files.
function mapCloudRow(row) {
  if (!row) return row;
  return {
    ...row,
    encrypted: Boolean(row.encrypted),
    deleted: Boolean(row.deleted),
    verified: Boolean(row.verified),
    // normalize camelCase and snake_case aliases
    shareToken: row.shareToken || row.share_token || null,
    shareExpiry: row.shareExpiry || row.share_expiry || null,
    sharePermission: row.sharePermission || row.share_permission || 'read-only',
    sharedWith: row.sharedWith || row.shared_with || null,
    sharedAt: row.sharedAt || row.shared_at || null,
    filePath: row.filePath || row.file_path || null,
    storagePath: row.storagePath || row.storage_path || null,
    txHash: row.txHash || row.tx_hash || null,
    ivHex: row.ivHex || row.iv_hex || null,
    encryptionSeed: row.encryptionSeed || row.encryption_seed || null,
    metadataStatus: row.metadataStatus || row.metadata_status || null,
    blockchainStatus: row.blockchainStatus || row.blockchain_status || null
  };
}

function parseCloudRows(rows) {
  return (rows || []).map(mapCloudRow);
}

// ---------------------------------------------------------------------------
// In-Memory Dev Store (Only used if Supabase env vars are completely absent)
// ---------------------------------------------------------------------------
const memoryStore = {
  messages: [],
  transfers: [],
  activities: [],
  contacts: [],
  cloudFiles: new Map(),
  userProfiles: new Map()
};

let devNoticeLogged = false;
function notifyDevMode() {
  if (!devNoticeLogged && !isSupabaseConfigured()) {
    console.log('\x1b[36m%s\x1b[0m', 'ℹ️  [SecureChain DB] Running in Local In-Memory Mode. For persistent storage, set SUPABASE_URL and SUPABASE_SECRET_KEY.');
    devNoticeLogged = true;
  }
}

// ---------------------------------------------------------------------------
// DIAGNOSTICS: Connection test
// ---------------------------------------------------------------------------
async function testConnection() {
  if (!isSupabaseConfigured()) {
    return {
      connected: false,
      mode: 'in-memory',
      message: 'Supabase credentials not configured in environment variables.'
    };
  }

  const { client, bucket } = getSupabaseClient();
  const checks = {
    database: false,
    storage: false,
    error: null
  };

  try {
    // 1. Test database connection
    const { error: dbError } = await client.from('transfers').select('id').limit(1);
    if (!dbError) {
      checks.database = true;
    } else {
      checks.error = `Database check failed: ${dbError.message}`;
    }

    // 2. Test storage bucket access
    try {
      const { data: bucketData, error: bucketError } = await client.storage.getBucket(bucket);
      if (!bucketError && bucketData) {
        checks.storage = true;
      } else {
        checks.storage = false;
        checks.storageMessage = bucketError ? bucketError.message : 'Bucket not found';
      }
    } catch (bErr) {
      checks.storage = false;
      checks.storageMessage = bErr.message;
    }

    return {
      connected: checks.database,
      mode: 'supabase',
      bucket,
      ...checks
    };
  } catch (err) {
    return {
      connected: false,
      mode: 'supabase',
      error: err.message
    };
  }
}

// ---------------------------------------------------------------------------
// MESSAGES
// ---------------------------------------------------------------------------
async function getMessages() {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('messages').select('*').order('id', { ascending: false });
    if (error) {
      console.error('[Supabase getMessages error]:', error.message);
      throw new Error(`Failed to load messages: ${error.message}`);
    }
    return (data || []).map(r => ({ ...r, isFile: !!r.isFile }));
  }
  notifyDevMode();
  return [...memoryStore.messages].sort((a, b) => b.id - a.id);
}

async function getMessagesByAddress(address) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client
      .from('messages')
      .select('*')
      .or(`recipient.eq.${address},sender.eq.${address}`)
      .order('id', { ascending: true });
    if (error) {
      console.error('[Supabase getMessagesByAddress error]:', error.message);
      throw new Error(`Failed to load messages: ${error.message}`);
    }
    return (data || []).map(r => ({ ...r, isFile: !!r.isFile }));
  }
  notifyDevMode();
  const lower = String(address || '').toLowerCase();
  return memoryStore.messages.filter(m => 
    String(m.recipient || '').toLowerCase() === lower || 
    String(m.sender || '').toLowerCase() === lower
  );
}

async function getMessage(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('messages').select('*').eq('id', id).maybeSingle();
    if (error) {
      console.error('[Supabase getMessage error]:', error.message);
      throw new Error(`Failed to load message: ${error.message}`);
    }
    return data ? { ...data, isFile: !!data.isFile } : null;
  }
  notifyDevMode();
  return memoryStore.messages.find(m => String(m.id) === String(id)) || null;
}

async function createMessage({ recipient, sender, text, fileName, fileSize, isFile, time, type }) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client
      .from('messages')
      .insert([{ recipient, sender, text, fileName, fileSize, isFile: Boolean(isFile), time, type }])
      .select('*')
      .single();
    if (error) {
      console.error('[Supabase createMessage error]:', error.message);
      throw new Error(`Failed to send message: ${error.message}`);
    }
    return { ...data, isFile: Boolean(data.isFile) };
  }
  notifyDevMode();
  const newMsg = {
    id: Date.now(),
    recipient,
    sender,
    text,
    fileName,
    fileSize,
    isFile: Boolean(isFile),
    time,
    type
  };
  memoryStore.messages.push(newMsg);
  return newMsg;
}

async function deleteMessage(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('messages').delete().eq('id', id);
    if (error) {
      console.error('[Supabase deleteMessage error]:', error.message);
      throw new Error(`Failed to delete message: ${error.message}`);
    }
    return { success: true };
  }
  notifyDevMode();
  memoryStore.messages = memoryStore.messages.filter(m => String(m.id) !== String(id));
  return { success: true };
}

async function updateMessageText(id, text) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('messages').update({ text }).eq('id', id);
    if (error) {
      console.error('[Supabase updateMessageText error]:', error.message);
      throw new Error(`Failed to edit message: ${error.message}`);
    }
    return { success: true };
  }
  notifyDevMode();
  const found = memoryStore.messages.find(m => String(m.id) === String(id));
  if (found) found.text = text;
  return { success: true };
}

// ---------------------------------------------------------------------------
// TRANSFERS
// ---------------------------------------------------------------------------
async function getTransfers() {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('transfers').select('*').order('id', { ascending: false });
    if (error) {
      console.error('[Supabase getTransfers error]:', error.message);
      throw new Error(`Failed to fetch transfers: ${error.message}`);
    }
    return (data || []).map(r => ({
      ...r,
      hasBlob: Boolean(r.hasBlob),
      password: Boolean(r.password),
      from: r.sender || r.recipient
    }));
  }
  notifyDevMode();
  return [...memoryStore.transfers].map(r => ({
    ...r,
    hasBlob: Boolean(r.hasBlob),
    password: Boolean(r.password),
    from: r.sender || r.recipient
  }));
}

async function createTransfer({ id, name, size, date, status, type, color, recipient, sender, password, hasBlob, filePath, storagePath }) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const payload = {
      id,
      name,
      size,
      date,
      status,
      type,
      color,
      recipient,
      password,
      hasBlob: Boolean(hasBlob),
      filePath,
      storagePath: storagePath || null
    };

    if (sender) payload.sender = sender;

    let res = await client.from('transfers').insert([payload]).select('*').single();
    
    // If table exists without 'sender' column, retry without it to maintain backwards compatibility
    if (res.error && res.error.message && res.error.message.includes('sender')) {
      delete payload.sender;
      res = await client.from('transfers').insert([payload]).select('*').single();
    }

    if (res.error) {
      console.error('[Supabase createTransfer error]:', res.error.message);
      throw new Error(`Failed to save transfer record: ${res.error.message}`);
    }
    return { ...res.data, hasBlob: Boolean(res.data.hasBlob) };
  }

  notifyDevMode();
  const transfer = {
    id,
    name,
    size,
    date,
    status,
    type,
    color,
    recipient,
    sender,
    password,
    hasBlob: Boolean(hasBlob),
    filePath,
    storagePath
  };
  memoryStore.transfers.unshift(transfer);
  return { ...transfer, hasBlob: Boolean(transfer.hasBlob) };
}

async function getTransfer(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('transfers').select('*').eq('id', id).maybeSingle();
    if (error) {
      console.error('[Supabase getTransfer error]:', error.message);
      throw new Error(`Failed to get transfer: ${error.message}`);
    }
    return data ? { ...data, hasBlob: Boolean(data.hasBlob) } : null;
  }
  notifyDevMode();
  const item = memoryStore.transfers.find(t => String(t.id) === String(id));
  return item ? { ...item, hasBlob: Boolean(item.hasBlob) } : null;
}

async function deleteTransfer(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('transfers').delete().eq('id', id);
    if (error) {
      console.error('[Supabase deleteTransfer error]:', error.message);
      throw new Error(`Failed to delete transfer: ${error.message}`);
    }
    return { success: true };
  }
  notifyDevMode();
  memoryStore.transfers = memoryStore.transfers.filter(t => String(t.id) !== String(id));
  return { success: true };
}

// ---------------------------------------------------------------------------
// ACTIVITIES
// ---------------------------------------------------------------------------
async function getActivities() {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('activities').select('*').order('id', { ascending: false });
    if (error) {
      console.error('[Supabase getActivities error]:', error.message);
      throw new Error(`Failed to load activities: ${error.message}`);
    }
    return data || [];
  }
  notifyDevMode();
  return [...memoryStore.activities];
}

async function createActivity({ type, file, target, time, date }) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('activities').insert([{ type, file, target, time, date }]).select('*').single();
    if (error) {
      console.warn('[Supabase createActivity warning]:', error.message);
      // Non-fatal fallback for activity tracking
      return { id: Date.now(), type, file, target, time, date };
    }
    return data;
  }
  notifyDevMode();
  const act = { id: Date.now(), type, file, target, time, date };
  memoryStore.activities.unshift(act);
  return act;
}

async function deleteActivity(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('activities').delete().eq('id', id);
    if (error) {
      console.error('[Supabase deleteActivity error]:', error.message);
      throw new Error(`Failed to delete activity: ${error.message}`);
    }
    return { success: true };
  }
  notifyDevMode();
  memoryStore.activities = memoryStore.activities.filter(a => String(a.id) !== String(id));
  return { success: true };
}

async function deleteActivityByFile(fileName) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('activities').delete().eq('file', fileName);
    if (error) {
      console.error('[Supabase deleteActivityByFile error]:', error.message);
      throw new Error(`Failed to delete activity: ${error.message}`);
    }
    return { success: true };
  }
  notifyDevMode();
  memoryStore.activities = memoryStore.activities.filter(a => a.file !== fileName);
  return { success: true };
}

async function editActivityFile(oldName, newName) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('activities').update({ file: newName }).eq('file', oldName);
    if (error) {
      console.error('[Supabase editActivityFile error]:', error.message);
      throw new Error(`Failed to edit activity: ${error.message}`);
    }
    return { success: true };
  }
  notifyDevMode();
  memoryStore.activities.forEach(a => { if (a.file === oldName) a.file = newName; });
  return { success: true };
}

// ---------------------------------------------------------------------------
// CONTACTS
// ---------------------------------------------------------------------------
async function getContacts() {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('contacts').select('*');
    if (error) {
      console.error('[Supabase getContacts error]:', error.message);
      throw new Error(`Failed to load contacts: ${error.message}`);
    }
    return data || [];
  }
  notifyDevMode();
  return [...memoryStore.contacts];
}

async function upsertContact({ id, name, status }) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('contacts').upsert({ id, name, status }, { onConflict: 'id' }).select('*').single();
    if (error) {
      console.error('[Supabase upsertContact error]:', error.message);
      throw new Error(`Failed to save contact: ${error.message}`);
    }
    return data;
  }
  notifyDevMode();
  const existingIdx = memoryStore.contacts.findIndex(c => c.id === id);
  const contact = { id, name, status };
  if (existingIdx >= 0) memoryStore.contacts[existingIdx] = contact;
  else memoryStore.contacts.push(contact);
  return contact;
}

async function deleteContact(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('contacts').delete().eq('id', id);
    if (error) {
      console.error('[Supabase deleteContact error]:', error.message);
      throw new Error(`Failed to delete contact: ${error.message}`);
    }
    return { success: true };
  }
  notifyDevMode();
  memoryStore.contacts = memoryStore.contacts.filter(c => c.id !== id);
  return { success: true };
}

// ---------------------------------------------------------------------------
// CLOUD FILES
// ---------------------------------------------------------------------------
async function getCloudFiles(owner = null) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    let query = client.from('cloud_files').select('*').eq('deleted', false);
    if (owner && owner !== 'guest') query = query.eq('owner', owner);
    const { data, error } = await query.order('timestamp', { ascending: false });
    if (error) {
      console.error('[Supabase getCloudFiles error]:', error.message);
      throw new Error(`Failed to load cloud files: ${error.message}`);
    }
    return parseCloudRows(data);
  }
  notifyDevMode();
  const files = Array.from(memoryStore.cloudFiles.values()).filter(f => !f.deleted);
  if (owner && owner !== 'guest') {
    return files.filter(f => String(f.owner || '').toLowerCase() === String(owner).toLowerCase());
  }
  return files.sort((a, b) => b.timestamp - a.timestamp);
}

async function getCloudStats(owner = null) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    let query = client.from('cloud_files').select('id, size, txHash, shareToken, verified').eq('deleted', false);
    if (owner && owner !== 'guest') query = query.eq('owner', owner);
    const { data, error } = await query;
    if (error) {
      console.error('[Supabase getCloudStats error]:', error.message);
      throw new Error(`Failed to calculate cloud stats: ${error.message}`);
    }
    const rows = data || [];
    let totalSize = 0;
    let transactions = 0;
    let sharedFiles = 0;
    let verifiedFiles = 0;
    rows.forEach(r => {
      totalSize += Number(r.size || 0);
      if (r.txHash) transactions += 1;
      if (r.shareToken) sharedFiles += 1;
      if (r.verified) verifiedFiles += 1;
    });
    return {
      count: rows.length,
      totalBytes: totalSize,
      transactions,
      sharedFiles,
      verifiedFiles
    };
  }
  notifyDevMode();
  const files = Array.from(memoryStore.cloudFiles.values()).filter(f => !f.deleted);
  let totalSize = 0;
  let transactions = 0;
  let sharedFiles = 0;
  let verifiedFiles = 0;
  files.forEach(f => {
    totalSize += Number(f.size || 0);
    if (f.txHash) transactions += 1;
    if (f.shareToken) sharedFiles += 1;
    if (f.verified) verifiedFiles += 1;
  });
  return {
    count: files.length,
    totalBytes: totalSize,
    transactions,
    sharedFiles,
    verifiedFiles
  };
}

async function createCloudFile(file) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('cloud_files').insert([file]).select('*').single();
    if (error) {
      console.error('[Supabase createCloudFile error]:', error.message);
      throw new Error(`Supabase cloud_files insert failed: ${error.message}`);
    }
    return mapCloudRow(data);
  }
  notifyDevMode();
  const mapped = mapCloudRow(file);
  memoryStore.cloudFiles.set(file.id, mapped);
  return mapped;
}

async function getCloudFile(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('cloud_files').select('*').eq('id', id).maybeSingle();
    if (error) {
      console.error('[Supabase getCloudFile error]:', error.message);
      throw new Error(`Failed to get cloud file: ${error.message}`);
    }
    return data ? mapCloudRow(data) : null;
  }
  notifyDevMode();
  const file = memoryStore.cloudFiles.get(id);
  return file ? mapCloudRow(file) : null;
}

async function getCloudFileByShareToken(shareToken) {
  if (!shareToken) return null;
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    let { data, error } = await client.from('cloud_files').select('*').eq('shareToken', shareToken).maybeSingle();
    if (error || !data) {
      // Fallback in case of lowercase or snake_case column
      try {
        const retry = await client.from('cloud_files').select('*').eq('share_token', shareToken).maybeSingle();
        if (!retry.error && retry.data) data = retry.data;
      } catch (_) {}
    }
    return data ? mapCloudRow(data) : null;
  }
  notifyDevMode();
  for (const file of memoryStore.cloudFiles.values()) {
    if (file.shareToken === shareToken && !file.deleted) {
      return mapCloudRow(file);
    }
  }
  return null;
}

async function updateCloudFile(id, updates) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    let { data, error } = await client.from('cloud_files').update(updates).eq('id', id).select('*').single();
    
    // If column name cased differently (e.g. share_token vs shareToken), try snake_case mapping
    if (error && (error.code === 'PGRST204' || (error.message && error.message.includes('column')))) {
      const snakeUpdates = {};
      for (const [k, v] of Object.entries(updates)) {
        const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        snakeUpdates[snakeKey] = v;
      }
      const retry = await client.from('cloud_files').update(snakeUpdates).eq('id', id).select('*').single();
      if (!retry.error && retry.data) {
        return mapCloudRow(retry.data);
      }
    }

    if (error) {
      console.error('[Supabase updateCloudFile error]:', error.message);
      throw new Error(`Failed to update cloud file: ${error.message}`);
    }
    return mapCloudRow(data);
  }
  notifyDevMode();
  const current = memoryStore.cloudFiles.get(id);
  if (!current) return null;
  const merged = { ...current, ...updates };
  memoryStore.cloudFiles.set(id, merged);
  return mapCloudRow(merged);
}

async function deleteCloudFile(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('cloud_files').delete().eq('id', id);
    if (error) {
      console.error('[Supabase deleteCloudFile error]:', error.message);
      throw new Error(`Failed to delete cloud file: ${error.message}`);
    }
    return { success: true };
  }
  notifyDevMode();
  memoryStore.cloudFiles.delete(id);
  return { success: true };
}

// ---------------------------------------------------------------------------
// USER PROFILES / SETTINGS
// ---------------------------------------------------------------------------
const DEFAULT_SETTINGS = {
  display_name: 'BlockUser_1',
  notifications: {
    transferCompleted: true,
    newFileReceived: true,
    messageAlerts: true,
    securityAlerts: true
  },
  network: 'Ethereum Mainnet',
  ipfs_gateway: 'https://ipfs.io/ipfs/',
  theme: '#10b981',
  subscription: 'Free'
};

function normalizeProfile(row, walletAddress) {
  if (!row) return { wallet_address: walletAddress, ...DEFAULT_SETTINGS };
  let notifications = row.notifications;
  if (typeof notifications === 'string') {
    try { notifications = JSON.parse(notifications); } catch { notifications = DEFAULT_SETTINGS.notifications; }
  }
  return {
    wallet_address: row.wallet_address || walletAddress,
    display_name: row.display_name || DEFAULT_SETTINGS.display_name,
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(notifications || {}) },
    network: row.network || DEFAULT_SETTINGS.network,
    ipfs_gateway: row.ipfs_gateway || DEFAULT_SETTINGS.ipfs_gateway,
    theme: row.theme || DEFAULT_SETTINGS.theme,
    subscription: row.subscription || DEFAULT_SETTINGS.subscription,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

async function getUserProfile(walletAddress) {
  if (!walletAddress) return normalizeProfile(null, 'guest');
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('user_profiles').select('*').eq('wallet_address', walletAddress).maybeSingle();
    if (!error && data) return normalizeProfile(data, walletAddress);
  }
  notifyDevMode();
  return normalizeProfile(memoryStore.userProfiles.get(walletAddress), walletAddress);
}

async function upsertUserProfile(walletAddress, updates = {}) {
  const current = await getUserProfile(walletAddress);
  const now = new Date().toISOString();
  const next = normalizeProfile({ ...current, ...updates, wallet_address: walletAddress, updated_at: now, created_at: current.created_at || now }, walletAddress);

  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('user_profiles').upsert([next], { onConflict: 'wallet_address' }).select('*').single();
    if (!error && data) return normalizeProfile(data, walletAddress);
  }
  notifyDevMode();
  memoryStore.userProfiles.set(walletAddress, next);
  return next;
}

// ---------------------------------------------------------------------------
// CLEAR ALL
// ---------------------------------------------------------------------------
async function clearAllData() {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    await Promise.all([
      client.from('messages').delete().neq('id', 0).catch(() => null),
      client.from('transfers').delete().neq('id', '').catch(() => null),
      client.from('activities').delete().neq('id', 0).catch(() => null),
      client.from('contacts').delete().neq('id', '').catch(() => null),
      client.from('cloud_files').delete().neq('id', '').catch(() => null),
      client.from('user_profiles').delete().neq('wallet_address', '').catch(() => null)
    ]);
  }
  memoryStore.messages = [];
  memoryStore.transfers = [];
  memoryStore.activities = [];
  memoryStore.contacts = [];
  memoryStore.cloudFiles.clear();
  memoryStore.userProfiles.clear();
  return { success: true };
}

module.exports = {
  isSupabaseConfigured,
  testConnection,
  // messages
  getMessages,
  getMessage,
  getMessagesByAddress,
  createMessage,
  deleteMessage,
  updateMessageText,
  // transfers
  getTransfers,
  createTransfer,
  getTransfer,
  deleteTransfer,
  // activities
  getActivities,
  createActivity,
  deleteActivity,
  deleteActivityByFile,
  editActivityFile,
  // contacts
  getContacts,
  upsertContact,
  deleteContact,
  // cloud
  getCloudFiles,
  getCloudStats,
  createCloudFile,
  getCloudFile,
  getCloudFileByShareToken,
  updateCloudFile,
  deleteCloudFile,
  // profile/settings
  getUserProfile,
  upsertUserProfile,
  // clear
  clearAllData,
  _closeSqlite: () => {}
};
