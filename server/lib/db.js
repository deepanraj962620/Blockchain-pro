// Data-access layer.
// Uses Supabase (PostgreSQL) when configured, otherwise falls back to SQLite.
// This keeps local development working with zero configuration while enabling
// production persistence via Supabase.

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

// SecureChain Advanced uses Supabase as the production database.
// SQLite was intentionally removed because its native install can fail/hang on
// Windows/Node 22 and is not needed for the Render + Supabase deployment.
function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SECRET_KEY) in server/.env.');
  }
}


// Convert SQLite row booleans (0/1) to JS booleans for cloud_files.
function mapCloudRow(row) {
  if (!row) return row;
  return {
    ...row,
    encrypted: !!row.encrypted,
    deleted: !!row.deleted,
    verified: !!row.verified
  };
}

function parseCloudRows(rows) {
  return (rows || []).map(mapCloudRow);
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------
function sqliteRemoved() {
  throw new Error('SQLite fallback has been removed. Configure Supabase in server/.env.');
}

async function runSqlite() { return sqliteRemoved(); }
async function allSqlite() { return sqliteRemoved(); }
async function getSqlite() { return sqliteRemoved(); }

// ---------------------------------------------------------------------------
// MESSAGES
// ---------------------------------------------------------------------------
async function getMessages() {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('messages').select('*').order('id', { ascending: false });
    if (!error) return (data || []).map(r => ({ ...r, isFile: !!r.isFile }));
  }
  const rows = await allSqlite(`SELECT * FROM messages ORDER BY id DESC`);
  return rows.map(r => ({ ...r, isFile: !!r.isFile }));
}

async function getMessagesByAddress(address) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client
      .from('messages')
      .select('*')
      .or(`recipient.eq.${address},sender.eq.${address}`)
      .order('id', { ascending: true });
    if (!error) return (data || []).map(r => ({ ...r, isFile: !!r.isFile }));
  }
  const rows = await allSqlite(`SELECT * FROM messages WHERE recipient = ? OR sender = ?`, [address, address]);
  return rows.map(r => ({ ...r, isFile: !!r.isFile }));
}

async function getMessage(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('messages').select('*').eq('id', id).maybeSingle();
    if (!error && data) return { ...data, isFile: !!data.isFile };
  }
  return await getSqlite(`SELECT * FROM messages WHERE id = ?`, [id]);
}

async function createMessage({ recipient, sender, text, fileName, fileSize, isFile, time, type }) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client
      .from('messages')
      .insert([{ recipient, sender, text, fileName, fileSize, isFile: !!isFile, time, type }])
      .select('*')
      .single();
    if (!error && data) {
      return { ...data, isFile: !!data.isFile };
    }
  }
  const result = await runSqlite(
    `INSERT INTO messages (recipient, sender, text, fileName, fileSize, isFile, time, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [recipient, sender, text, fileName, fileSize, isFile ? 1 : 0, time, type]
  );
  return { id: result.lastID, recipient, sender, text, fileName, fileSize, isFile: !!isFile, time, type };
}

async function deleteMessage(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('messages').delete().eq('id', id);
    if (!error) return { success: true };
  }
  await runSqlite(`DELETE FROM messages WHERE id = ?`, [id]);
  return { success: true };
}

async function updateMessageText(id, text) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('messages').update({ text }).eq('id', id);
    if (!error) return { success: true };
  }
  await runSqlite(`UPDATE messages SET text = ? WHERE id = ?`, [text, id]);
  return { success: true };
}

// ---------------------------------------------------------------------------
// TRANSFERS
// ---------------------------------------------------------------------------
async function getTransfers() {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('transfers').select('*').order('id', { ascending: false });
    if (!error) return (data || []).map(r => ({ ...r, hasBlob: !!r.hasBlob, password: !!r.password }));
  }
  const rows = await allSqlite(`SELECT * FROM transfers ORDER BY rowid DESC`);
  return rows.map(r => ({ ...r, hasBlob: !!r.hasBlob, password: !!r.password }));
}

async function createTransfer({ id, name, size, date, status, type, color, recipient, password, hasBlob, filePath, storagePath }) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('transfers').insert([
      { id, name, size, date, status, type, color, recipient, password, hasBlob: !!hasBlob, filePath, storagePath: storagePath || null }
    ]).select('*').single();
    if (error) throw new Error(`Supabase transfers insert failed: ${error.message}`);
    return { ...data, hasBlob: !!data.hasBlob };
  }
  throw new Error('Supabase is not configured for transfers. Set SUPABASE_URL and a valid server key in Render.');
}

async function getTransfer(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('transfers').select('*').eq('id', id).maybeSingle();
    if (!error && data) return { ...data, hasBlob: !!data.hasBlob };
  }
  const row = await getSqlite(`SELECT * FROM transfers WHERE id = ?`, [id]);
  return row ? { ...row, hasBlob: !!row.hasBlob } : null;
}

async function deleteTransfer(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('transfers').delete().eq('id', id);
    if (!error) return { success: true };
  }
  await runSqlite(`DELETE FROM transfers WHERE id = ?`, [id]);
  return { success: true };
}

// ---------------------------------------------------------------------------
// ACTIVITIES
// ---------------------------------------------------------------------------
async function getActivities() {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('activities').select('*').order('id', { ascending: false });
    if (!error) return data || [];
  }
  return await allSqlite(`SELECT * FROM activities ORDER BY id DESC`);
}

async function createActivity({ type, file, target, time, date }) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('activities').insert([{ type, file, target, time, date }]).select('*').single();
    if (!error && data) return data;
  }
  const result = await runSqlite(
    `INSERT INTO activities (type, file, target, time, date) VALUES (?, ?, ?, ?, ?)`,
    [type, file, target, time, date]
  );
  return { id: result.lastID, type, file, target, time, date };
}

async function deleteActivity(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('activities').delete().eq('id', id);
    if (!error) return { success: true };
  }
  await runSqlite(`DELETE FROM activities WHERE id = ?`, [id]);
  return { success: true };
}

async function deleteActivityByFile(fileName) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('activities').delete().eq('file', fileName);
    if (!error) return { success: true };
  }
  await runSqlite(`DELETE FROM activities WHERE file = ?`, [fileName]);
  return { success: true };
}

async function editActivityFile(oldName, newName) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('activities').update({ file: newName }).eq('file', oldName);
    if (!error) return { success: true };
  }
  await runSqlite(`UPDATE activities SET file = ? WHERE file = ?`, [newName, oldName]);
  return { success: true };
}

// ---------------------------------------------------------------------------
// CONTACTS
// ---------------------------------------------------------------------------
async function getContacts() {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('contacts').select('*');
    if (!error) return data || [];
  }
  return await allSqlite(`SELECT * FROM contacts`);
}

async function upsertContact({ id, name, status }) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('contacts').upsert({ id, name, status }, { onConflict: 'id' }).select('*').single();
    if (!error && data) return data;
  }
  await runSqlite(`INSERT OR REPLACE INTO contacts (id, name, status) VALUES (?, ?, ?)`, [id, name, status]);
  return { id, name, status };
}

async function deleteContact(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('contacts').delete().eq('id', id);
    if (!error) return { success: true };
  }
  await runSqlite(`DELETE FROM contacts WHERE id = ?`, [id]);
  return { success: true };
}

// ---------------------------------------------------------------------------
// CLOUD FILES
// ---------------------------------------------------------------------------
async function getCloudFiles(owner = null) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    let query = client.from('cloud_files').select('*').eq('deleted', false);
    if (owner) query = query.eq('owner', owner);
    const { data, error } = await query.order('timestamp', { ascending: false });
    if (!error) return parseCloudRows(data);
  }
  const rows = owner
    ? await allSqlite(`SELECT * FROM cloud_files WHERE COALESCE(deleted, 0) = 0 AND owner = ? ORDER BY timestamp DESC`, [owner])
    : await allSqlite(`SELECT * FROM cloud_files WHERE COALESCE(deleted, 0) = 0 ORDER BY timestamp DESC`);
  return parseCloudRows(rows);
}

async function getCloudStats(owner = null) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    let query = client.from('cloud_files').select('id, size, txHash, shareToken, verified').eq('deleted', false);
    if (owner) query = query.eq('owner', owner);
    const { data, error } = await query;
    if (!error) {
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
  }
  const statsSql = `SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as totalSize, SUM(CASE WHEN txHash IS NOT NULL AND txHash <> '' THEN 1 ELSE 0 END) as transactions, SUM(CASE WHEN shareToken IS NOT NULL AND shareToken <> '' THEN 1 ELSE 0 END) as sharedFiles, SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verifiedFiles FROM cloud_files WHERE COALESCE(deleted, 0) = 0${owner ? ' AND owner = ?' : ''}`;
  const rows = await allSqlite(statsSql, owner ? [owner] : []);
  const stats = rows[0] || {};
  return {
    count: Number(stats.count || 0),
    totalBytes: Number(stats.totalSize || 0),
    transactions: Number(stats.transactions || 0),
    sharedFiles: Number(stats.sharedFiles || 0),
    verifiedFiles: Number(stats.verifiedFiles || 0)
  };
}

async function createCloudFile(file) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('cloud_files').insert([file]).select('*').single();
    if (error) throw new Error(`Supabase cloud_files insert failed: ${error.message}`);
    return mapCloudRow(data);
  }
  throw new Error('Supabase is not configured for cloud storage. Set SUPABASE_URL and a valid server key in Render.');
}

async function getCloudFile(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('cloud_files').select('*').eq('id', id).maybeSingle();
    if (!error && data) return mapCloudRow(data);
  }
  const row = await getSqlite(`SELECT * FROM cloud_files WHERE id = ?`, [id]);
  return mapCloudRow(row);
}

async function updateCloudFile(id, updates) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { data, error } = await client.from('cloud_files').update(updates).eq('id', id).select('*').single();
    if (!error && data) return mapCloudRow(data);
  }
  const current = await getCloudFile(id);
  if (!current) return null;
  const merged = { ...current, ...updates };
  // Build dynamic UPDATE against known columns
const allowed = ['name','size','type','date','timestamp','filePath','hash','encrypted','owner','cid','txHash','ivHex','encryptionSeed','deleted','verified','shareToken','shareExpiry','sharePermission','sharedWith','sharedAt','userId','metadataStatus','blockchainStatus','storagePath'];
  const keys = allowed.filter(k => k in merged);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const params = keys.map(k => {
    const v = merged[k];
    if (k === 'encrypted' || k === 'deleted' || k === 'verified') return v ? 1 : 0;
    return v ?? null;
  });
  params.push(id);
  await runSqlite(`UPDATE cloud_files SET ${setClause} WHERE id = ?`, params);
  return mapCloudRow(await getCloudFile(id));
}

async function deleteCloudFile(id) {
  if (isSupabaseConfigured()) {
    const { client } = getSupabaseClient();
    const { error } = await client.from('cloud_files').delete().eq('id', id);
    if (!error) return { success: true };
  }
  await runSqlite(`DELETE FROM cloud_files WHERE id = ?`, [id]);
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
    if (!error) return normalizeProfile(data, walletAddress);
  }
  const row = await getSqlite(`SELECT * FROM user_profiles WHERE wallet_address = ?`, [walletAddress]);
  return normalizeProfile(row, walletAddress);
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

  await runSqlite(`INSERT INTO user_profiles (wallet_address, display_name, notifications, network, ipfs_gateway, theme, subscription, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(wallet_address) DO UPDATE SET
      display_name=excluded.display_name,
      notifications=excluded.notifications,
      network=excluded.network,
      ipfs_gateway=excluded.ipfs_gateway,
      theme=excluded.theme,
      subscription=excluded.subscription,
      updated_at=excluded.updated_at`, [
    next.wallet_address, next.display_name, JSON.stringify(next.notifications), next.network,
    next.ipfs_gateway, next.theme, next.subscription, next.created_at, next.updated_at
  ]);
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
  if (!isSupabaseConfigured()) requireSupabase();
  return { success: true };
}

module.exports = {
  isSupabaseConfigured,
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
  updateCloudFile,
  deleteCloudFile,
  // profile/settings
  getUserProfile,
  upsertUserProfile,
  // clear
  clearAllData,
  // sqlite close (for graceful shutdown)
  _closeSqlite: () => {}
};
