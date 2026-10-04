import React, { useState } from 'react';
import { History, Search, Download, ExternalLink, MoreVertical, Trash2, Edit3, X } from 'lucide-react';
import { useWeb3 } from '../Web3Context';

const HistoryView = () => {
  const { activities, transfers, deleteActivity, editActivity } = useWeb3();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMenu, setActiveMenu] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [newName, setNewName] = useState("");

  const filteredActivities = (Array.isArray(activities) ? activities : []).filter(act => 
    (act && act.file && act.file.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (act && act.target && act.target.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = (file) => {
    if (window.confirm(`Delete activity record for ${file}?`)) {
      deleteActivity(file);
      setActiveMenu(null);
    }
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setNewName(item.file);
    setActiveMenu(null);
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Transaction History</h1>
        <p style={{ color: 'var(--text-muted)' }}>Complete log of your decentralized file transfers.</p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
          <div className="search-bar" style={{ width: '100%' }}>
            <Search size={18} color="#64748b" />
            <input 
              type="text" 
              placeholder="Search by filename or wallet..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Type</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>File</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Wallet</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Time</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Date</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No transactions found.
                  </td>
                </tr>
              ) : (
                (Array.isArray(filteredActivities) ? filteredActivities : []).map((tx, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        background: tx.type === 'sent' ? '#f0fdf4' : '#eff6ff',
                        color: tx.type === 'sent' ? '#10b981' : '#3b82f6',
                        textTransform: 'capitalize'
                      }}>{tx.type}</span>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.875rem' }}>{tx.file}</td>
                    <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>{tx.target}</td>
                    <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>{tx.time}</td>
                    <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>{tx.date}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ position: 'relative' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px', borderRadius: '8px' }}
                          onClick={() => setActiveMenu(activeMenu === i ? null : i)}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeMenu === i && (
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
                              onClick={() => startEdit(tx)}
                            >
                              <Edit3 size={14} /> Edit
                            </button>
                            <button 
                              style={{ width: '100%', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: '#ef4444' }}
                              onClick={() => handleDelete(tx.file)}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '400px', padding: '24px' }}>
            <h3 style={{ marginBottom: '20px' }}>Edit Record</h3>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '20px' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditingItem(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { editActivity(editingItem.file, newName); setEditingItem(null); }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
