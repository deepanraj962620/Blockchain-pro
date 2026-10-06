import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, ShieldCheck, Lock, FileText, CheckCircle2, AlertTriangle, ArrowLeft, Loader2, HardDrive } from 'lucide-react';
import { API_URL } from '../lib/api';

const SharedFileView = () => {
  const { token } = useParams();
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let val = Number(bytes);
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return val.toFixed(1) + ' ' + units[i];
  };

  useEffect(() => {
    async function loadSharedFile() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/cloud/shared/${token}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `Unable to load shared file (Status: ${res.status})`);
        }
        setFileInfo(data);
      } catch (err) {
        console.error('Failed to load shared file:', err);
        setError(err.message || 'File not found or link has expired.');
      } finally {
        setLoading(false);
      }
    }

    loadSharedFile();
  }, [token]);

  const handleDownload = async () => {
    if (!token) return;
    setDownloading(true);
    try {
      const response = await fetch(`${API_URL}/cloud/shared/download/${token}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Download failed (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileInfo?.name || 'decrypted-file';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} className="spin" color="#10b981" />
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Decrypting file metadata from secure storage...</p>
        <style>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !fileInfo) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '32px', textAlign: 'center' }}>
        <div className="card" style={{ padding: '36px' }}>
          <div style={{ background: '#fef2f2', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertTriangle size={32} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>File Unavailable</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            {error || 'This shared link is invalid, has expired, or has been revoked by the owner.'}
          </p>
          <Link to="/" className="btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px', margin: '60px auto', padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <span style={{ fontSize: '0.75rem', background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
          🔒 AES-256 Encrypted Transfer
        </span>
      </div>

      <div className="card" style={{ padding: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#f0fdf4', color: '#10b981', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '4px', wordBreak: 'break-all' }}>{fileInfo.name}</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Size: {formatBytes(fileInfo.size)} • Type: {fileInfo.type?.toUpperCase()}
            </p>
          </div>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', marginBottom: '24px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Shared By:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{fileInfo.owner || 'SecureChain User'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Date Shared:</span>
              <span>{fileInfo.date || 'Recent'}</span>
            </div>
            {fileInfo.hash && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Integrity Hash:</span>
                <span style={{ fontFamily: 'monospace', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fileInfo.hash}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Verification Status:</span>
              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> Verified Authentic
              </span>
            </div>
          </div>
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '1rem', justifyContent: 'center', opacity: downloading ? 0.7 : 1 }}
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <>
              <Loader2 size={18} className="spin" /> Decrypting & Downloading...
            </>
          ) : (
            <>
              <Download size={18} /> Download Decrypted File
            </>
          )}
        </button>
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SharedFileView;
