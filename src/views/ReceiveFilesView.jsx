import React, { useState, useRef, useEffect } from 'react';
import { Download, Search, Filter, FileText, MoreVertical, Lock, ShieldCheck, X, Trash2, Edit3 } from 'lucide-react';
import { useWeb3 } from '../Web3Context';

const ReceiveFilesView = () => {
  const { receivedFiles, downloadFile, deleteTransfer, editTransfer } = useWeb3();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeMenu, setActiveMenu] = useState(null);
  const [editingFile, setEditingFile] = useState(null);
  const [newName, setNewName] = useState("");

  const filteredFiles = (Array.isArray(receivedFiles) ? receivedFiles : []).filter(file => 
    file && file.name && file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadClick = async (file) => {
    if (file.password) {
      setSelectedFile(file);
      setPassword("");
      setError("");
    } else {
      await downloadFile(file.id, "");
    }
  };

  const confirmDownload = async () => {
    const result = await downloadFile(selectedFile.id, password);
    if (result.success) {
      setSelectedFile(null);
      setPassword("");
      setError("");
    } else {
      setError(result.message);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this file?")) {
      deleteTransfer(id);
      setActiveMenu(null);
    }
  };

  const startEdit = (file) => {
    setEditingFile(file);
    setNewName(file.name);
    setActiveMenu(null);
  };

  const saveEdit = () => {
    editTransfer(editingFile.id, { name: newName });
    setEditingFile(null);
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Receive Files</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage and download files sent to your wallet.</p>
        </div>
        <button className="btn-primary" onClick={() => alert("Downloading all files...")}>
          <Download size={18} /> Download All
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px' }}>
          <div className="search-bar" style={{ flex: 1, width: 'auto' }}>
            <Search size={18} color="#64748b" />
            <input 
              type="text" 
              placeholder="Search received files..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-secondary" style={{ padding: '8px 16px' }}>
            <Filter size={18} /> Filter
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>File Name</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>From</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Size</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Security</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(filteredFiles) ? filteredFiles : []).map(file => (
                <tr key={file.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: '#f0fdf4', color: '#10b981', padding: '8px', borderRadius: '8px' }}>
                        <FileText size={18} />
                      </div>
                      <span style={{ fontWeight: 600 }}>{file.name || 'Unknown File'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>{file.from || file.sender || 'Peer Wallet'}</td>
                  <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>{file.size}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      width: 'fit-content',
                      background: file.password ? '#fef2f2' : '#f0fdf4',
                      color: file.password ? '#ef4444' : '#10b981'
                    }}>
                      {file.password ? <Lock size={12} /> : <ShieldCheck size={12} />}
                      {file.password ? 'Secure' : 'Open'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                      <button 
                        className="btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        onClick={() => handleDownloadClick(file)}
                      >
                        Download
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '6px', borderRadius: '8px' }}
                        onClick={() => setActiveMenu(activeMenu === file.id ? null : file.id)}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeMenu === file.id && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          background: 'white',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          zIndex: 100,
                          minWidth: '120px',
                          overflow: 'hidden'
                        }}>
                          <button 
                            style={{ width: '100%', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem' }}
                            onClick={() => startEdit(file)}
                          >
                            <Edit3 size={14} /> Edit Name
                          </button>
                          <button 
                            style={{ width: '100%', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: '#ef4444' }}
                            onClick={() => handleDelete(file.id)}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingFile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '400px', padding: '24px' }}>
            <h3 style={{ marginBottom: '20px' }}>Edit File Name</h3>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '20px' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditingFile(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {selectedFile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ width: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={20} color="#ef4444" /> Enter Password
              </h3>
              <button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              The file <strong>{selectedFile.name}</strong> is password protected.
            </p>
            <div className="form-group">
              <input 
                type="password" 
                placeholder="Enter password to download" 
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmDownload()}
              />
              {error && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>{error}</p>}
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={confirmDownload}>
              Unlock & Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiveFilesView;
