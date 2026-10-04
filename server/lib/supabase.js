const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

async function saveMetadataToSupabase(metadata) {
  if (!isSupabaseConfigured()) {
    return { ok: true, provider: 'local' };
  }

  try {
    const { client } = getSupabaseClient();
    const { error } = await client.from('cloud_files').insert([metadata]);
    if (error) throw new Error(error.message);
    return { ok: true, provider: 'supabase' };
  } catch (err) {
    console.warn('Supabase metadata insert failed, falling back to local storage.', err.message);
    return { ok: true, provider: 'local' };
  }
}

async function deleteMetadataFromSupabase(id) {
  if (!isSupabaseConfigured()) {
    return { ok: true, provider: 'local' };
  }

  try {
    const { client } = getSupabaseClient();
    const { error } = await client.from('cloud_files').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true, provider: 'supabase' };
  } catch (err) {
    console.warn('Supabase metadata delete failed.', err.message);
    return { ok: true, provider: 'local' };
  }
}

module.exports = {
  saveMetadataToSupabase,
  deleteMetadataFromSupabase
};
