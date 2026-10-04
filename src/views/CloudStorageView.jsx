import React, { useState, useEffect, useRef } from 'react';
import {
  CloudUpload,
  HardDrive,
  FileText,
  Lock,
  ShieldCheck,
  Download,
  Trash2,
  X,
  CheckCircle2,
  Loader2,
  Globe,
  Fingerprint,
  Database,
  FileCode,
  Image as ImageIcon,
  FileArchive,
  BarChart3
} from 'lucide-react';
import { useWeb3 } from '../Web3Context';
import { API_URL } from '../lib/api';

const CloudStorageView = () => {
  const { account, authToken } = useWeb3();
  const apiUrl = API_URL;
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({ count: 0, totalBytes: 0 });
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const fileInputRef = useRef(null);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let val = bytes;
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return val.toFixed(1) + ' ' + units[i];
  };

  const getAuthHeaders = () => ({
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  });

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${apiUrl}/cloud`, { headers: getAuthHeaders() });
      const data = await res.json().catch(() => []);
      setFiles(res.ok && Array.isArray(data) ? data : []);
      if (!res.ok) console.error('Cloud files API error:', data);
    } catch (e) {
      console.error('Failed to fetch cloud files', e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${apiUrl}/cloud/stats`, { headers: getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      setStats(res.ok && data && typeof data === 'object' && !Array.isArray(data) ? data : { count: 0, totalBytes: 0 });
      if (!res.ok) console.error('Cloud stats API error:', data);
    } catch (e) {
      console.error('Failed to fetch cloud stats', e);
    }
  };


  useEffect(() => {
    if (!apiUrl) return;
    fetchFiles();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, authToken]);

  const handleFiles = (fileList) => {
    const selected = Array.from(fileList);
    if (selected.length === 0) return;
    uploadFiles(selected);
  };

  const uploadFiles = async (selected) => {
    setUploading(true);
    setVerifyResult(null);
    try {
      for (const file of selected) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('owner', account || 'guest');
        const response = await fetch(`${apiUrl}/cloud/upload`, { method: 'POST', body: formData, headers: getAuthHeaders() });
        if (!response.ok) {
          const text = await response.text();
          let message = text;
          try { message = JSON.parse(text)?.error || text; } catch (_) {}
          if (response.status === 401) message = 'Wallet session expired. Disconnect/reconnect MetaMask and sign the login message again.';
          throw new Error(message || `Upload failed (${response.status})`);
        }
      }
      await fetchFiles();
      await fetchStats();
    } catch (e) {
      console.error('Upload failed', e);
      alert(`Upload failed.\n\n${e.message || 'Unknown server error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id) => {
    try {
      const response = await fetch(`${apiUrl}/cloud/download/${id}`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const item = (Array.isArray(files) ? files : []).find(file => file.id === id);
      a.download = item?.name || 'secure-file';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this file from cloud storage?')) {
      try {
        await fetch(`${apiUrl}/cloud/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        await fetchFiles();
        await fetchStats();
      } catch (e) {
        console.error('Delete failed', e);
      }
    }
  };

  const handleShare = async (id) => {
    const walletAddress = window.prompt('Enter the wallet address to share with');
    if (!walletAddress) return;
    try {
      const res = await fetch(`${apiUrl}/cloud/share/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ walletAddress, readOnly: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to share file');
      alert(`Shared link ready: ${data.shareUrl}`);
    } catch (e) {
      console.error('Share failed', e);
      alert('Share failed.');
    }
  };

  const handleVerify = async (id) => {
    try {
      const res = await fetch(`${apiUrl}/cloud/verify/${id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      setVerifyResult(data);
    } catch (e) {
      console.error('Verify failed', e);
    }
  };

  const getIcon = (type) => {
    const t = type?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(t)) return <ImageIcon size={18} />;
    if (['zip', 'rar', '7z', 'tar'].includes(t)) return <FileArchive size={18} />;
    if (['xls', 'xlsx', 'csv'].includes(t)) return <BarChart3 size={18} />;
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp'].includes(t)) return <FileCode size={18} />;
    return <FileText size={18} />;
  };

  const getColor = (type) => {
    const t = type?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(t)) return '#f59e0b';
    if (['zip', 'rar', '7z', 'tar'].includes(t)) return '#a855f7';
    if (['xls', 'xlsx', 'csv'].includes(t)) return '#10b981';
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp'].includes(t)) return '#3b82f6';
    return '#ef4444';
  };

  const storageUsedPercent = Math.min((stats.totalBytes / (2 * 1024 * 1024 * 1024)) * 100, 100);

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Blockchain Cloud Storage</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Store files securely on the decentralized network. Each file is encrypted, hashed, and recorded on-chain.
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#10b98115', color: '#10b981' }}>
            <FileText size={24} />
          </div>
          <div className="stat-info">
            <p>Files Stored</p>
            <h3>{stats.count}</h3>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#3b82f615', color: '#3b82f6' }}>
            <HardDrive size={24} />
          </div>
          <div className="stat-info">
            <p>Storage Used</p>
            <h3>{formatBytes(stats.totalBytes)}</h3>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#a855f715', color: '#a855f7' }}>
            <Lock size={24} />
          </div>
          <div className="stat-info">
            <p>Encryption</p>
            <h3 style={{ fontSize: '1rem', marginTop: '8px' }}>AES-256</h3>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f59e0b15', color: '#f59e0b' }}>
            <Globe size={24} />
          </div>
          <div className="stat-info">
            <p>Network</p>
            <h3 style={{ fontSize: '1rem', marginTop: '8px' }}>Decentralized</h3>
          </div>
        </div>
      </div>

      {/* Storage usage bar */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={18} color="#10b981" /> Storage Usage
          </h3>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {formatBytes(stats.totalBytes)} / 2.0 GB
          </span>
        </div>
        <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${storageUsedPercent}%`,
            background: 'linear-gradient(90deg, #10b981, #059669)',
            borderRadius: '5px',
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

{/* Upload Zone */}
      <div
        className="card"
        style={{
          padding: '32px',
          marginBottom: '24px',
          border: `2px dashed ${dragOver ? '#10b981' : 'var(--border)'}`,
          background: dragOver ? '#f0fdf4' : 'white',
          textAlign: 'center',
          cursor: uploading ? 'default' : 'pointer',
          transition: 'all 0.2s'
        }}
        onClick={() => { if (!uploading && fileInputRef.current) fileInputRef.current.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
        <div style={{
          width: '72px',
          height: '72px',
          background: uploading ? '#d1fae5' : '#f0fdf4',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: '#10b981'
        }}>
          {uploading ? <Loader2 size={36} className="spin" /> : <CloudUpload size={36} />}
        </div>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>
          {uploading ? 'Encrypting & Uploading to Decentralized Network...' : 'Drag & drop files here or click to browse'}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Drop files directly into this area or click to select files. Files are encrypted with AES-256 and hashed with SHA-256 before upload.
        </p>
        <div className="btn-primary" style={{ margin: '0 auto', width: 'fit-content', opacity: uploading ? 0.7 : 1 }}>
          {uploading ? <Loader2 size={18} className="spin" /> : <CloudUpload size={18} />}
          {uploading ? 'Uploading...' : 'Browse Files'}
        </div>
      </div>

      {/* Verify Result */}
      {verifyResult && (
        <div className="card" style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: verifyResult.matches ? '1px solid #bbf7d0' : '1px solid #fecaca',
          background: verifyResult.matches ? '#f0fdf4' : '#fef2f2'
        }}>
          {verifyResult.matches ? (
            <CheckCircle2 size={24} color="#10b981" />
          ) : (
            <X size={24} color="#ef4444" />
          )}
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              {verifyResult.name}: {verifyResult.matches ? 'Integrity Verified ✓' : 'Integrity Check Failed!'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              SHA-256: {verifyResult.currentHash?.substring(0, 40)}...
            </p>
          </div>
          <button onClick={() => setVerifyResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={16} color="var(--text-muted)" />
          </button>
        </div>
      )}

      {/* File List */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="#10b981" /> Stored Files
          </h3>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{files.length} file{files.length !== 1 ? 's' : ''}</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>File</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Size</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Uploaded</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Encrypted</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>IPFS CID</th>
            <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Tx Hash</th>
            <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No files stored yet. Upload your first file to get started.
                  </td>
                </tr>
              ) : (
                (Array.isArray(files) ? files : []).map((file) => (
                  <tr key={file.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: `${getColor(file.type)}15`, color: getColor(file.type), padding: '8px', borderRadius: '8px' }}>
                          {getIcon(file.type)}
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{file.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            <Fingerprint size={11} />
                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              CID: {file.cid}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>{formatBytes(file.size)}</td>
                    <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>{file.date}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        width: 'fit-content',
                        background: '#f0fdf4',
                        color: '#10b981'
                      }}>
                        <Lock size={12} /> AES-256
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                    {file.cid || 'Pending'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                    {file.txHash || 'Pending'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          onClick={() => handleVerify(file.id)}
                          title="Verify integrity"
                        >
                          <ShieldCheck size={14} /> Verify
                        </button>
                        <button
                          className="btn-primary"
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          onClick={() => handleDownload(file.id)}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          onClick={() => handleShare(file.id)}
                          title="Share file"
                        >
                          <Globe size={14} /> Share
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '6px', borderRadius: '8px', color: '#ef4444' }}
                          onClick={() => handleDelete(file.id)}
                          title="Delete file"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', marginTop: '24px', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #bbf7d0' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} color="#10b981" /> How Blockchain Storage Works
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '0.8125rem', color: '#334155' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <Lock size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span><strong>Encrypt</strong> — Files are encrypted with AES-256 before upload, ensuring only authorized parties can access them.</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <Fingerprint size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span><strong>Hash</strong> — A SHA-256 hash is computed and stored as a content fingerprint for integrity verification.</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <Globe size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span><strong>Decentralize</strong> — A content identifier (CID) is generated and immutably recorded, simulating on-chain storage.</span>
          </div>
        </div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default CloudStorageView;
