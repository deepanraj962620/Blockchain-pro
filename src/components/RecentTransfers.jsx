import React, { useState } from 'react';
import { Zap, FileText, FileCode, BarChart3, Image as ImageIcon, FileArchive, MoreVertical, Trash2, Edit3 } from 'lucide-react';
import { useWeb3 } from '../Web3Context';

const RecentTransfers = ({ transfers }) => {
  const { deleteTransfer, editTransfer } = useWeb3();
  const [activeMenu, setActiveMenu] = useState(null);
  const [editingFile, setEditingFile] = useState(null);
  const [newName, setNewName] = useState("");

  const getIcon = (type) => {
    const t = type?.toLowerCase();
    if (t?.includes('pdf')) return <FileText size={18} />;
    if (t?.includes('doc')) return <FileCode size={18} />;
    if (t?.includes('xls')) return <BarChart3 size={18} />;
    if (t?.includes('png') || t?.includes('jpg') || t?.includes('jpeg')) return <ImageIcon size={18} />;
    if (t?.includes('zip') || t?.includes('rar') || t?.includes('ppt')) return <FileArchive size={18} />;
    return <FileText size={18} />;
  };

  const getColor = (type) => {
    const t = type?.toLowerCase();
    if (t?.includes('pdf')) return '#ef4444';
    if (t?.includes('doc')) return '#3b82f6';
    if (t?.includes('xls')) return '#10b981';
    if (t?.includes('png') || t?.includes('jpg')) return '#f59e0b';
    return '#a855f7';
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this transfer record?")) {
      deleteTransfer(id);
      setActiveMenu(null);
    }
  };

  const startEdit = (file) => {
    setEditingFile(file);
    setNewName(file.name);
    setActiveMenu(null);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3><Zap size={18} color="#10b981" /> Recent Transfers</h3>
        <a href="#" className="view-all">View All</a>
      </div>

      <div className="transfer-list">
        {(Array.isArray(transfers) ? transfers : []).slice(0, 5).map((item, index) => (
          <div key={index} className="transfer-item" style={{ position: 'relative' }}>
            <div className="file-info">
              <div className="file-icon" style={{ backgroundColor: `${getColor(item.type)}15`, color: getColor(item.type) }}>
                {getIcon(item.type)}
              </div>
              <div className="file-details">
                <h4>{item.name}</h4>
                <p>To: {item.recipient ? (item.recipient.substring(0, 6) + '...') : '0x7B21...a8F3'} • {item.size}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>{item.date}</p>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                  {item.color === '#8b5cf6' && (
                    <span className="status-badge" style={{ background: '#f3e8ff', color: '#8b5cf6' }}>
                      P2P
                    </span>
                  )}
                  <span className={`status-badge status-${String(item.status || 'pending').toLowerCase()}`}>
                    {item.status}
                  </span>
                </div>
              </div>
              <button 
                className="btn-secondary" 
                style={{ padding: '4px', borderRadius: '4px' }}
                onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
              >
                <MoreVertical size={14} />
              </button>

              {activeMenu === item.id && (
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
                    onClick={() => startEdit(item)}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button 
                    style={{ width: '100%', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: '#ef4444' }}
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

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
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { editTransfer(editingFile.id, { name: newName }); setEditingFile(null); }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentTransfers;
