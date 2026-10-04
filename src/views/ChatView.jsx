import React, { useState } from 'react';
import Chat from '../components/Chat';
import { Search, UserPlus, Wallet, MoreVertical, Edit2, Trash2, Plus } from 'lucide-react';
import { useWeb3 } from '../Web3Context';

const ChatView = () => {
  const { account, connectWallet, messages } = useWeb3();
  const [activeContact, setActiveContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenuId, setShowMenuId] = useState(null);

  const [contacts, setContacts] = useState([
    { id: '0x7B21...a8F3', name: 'Alex Thompson', status: 'online' },
    { id: '0x3C72...b9D8', name: 'Sarah Chen', status: 'offline' },
    { id: '0x9A12...c4E7', name: 'Michael Ross', status: 'online' },
    { id: '0x1F87...d6A2', name: 'Project Alpha Vault', status: 'online' },
  ]);

  const allContacts = [...contacts];
  
  // Add any new recipients from messages that aren't in default
  Object.keys(messages).forEach(address => {
    if (!allContacts.find(c => c.id === address)) {
      allContacts.push({
        id: address,
        name: address,
        status: 'online'
      });
    }
  });

  const filteredContacts = allContacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id) => {
    setContacts((Array.isArray(contacts) ? contacts : []).filter(c => c.id !== id));
    if (activeContact?.id === id) setActiveContact(null);
    setShowMenuId(null);
  };

  const handleEdit = (contact) => {
    const newName = prompt('Enter new name for ' + contact.name, contact.name);
    if (newName) {
      setContacts((Array.isArray(contacts) ? contacts : []).map(c => c.id === contact.id ? { ...c, name: newName } : c));
    }
    setShowMenuId(null);
  };

  const handleCreate = () => {
    const newName = prompt('Enter new contact name');
    const newId = prompt('Enter new contact ID (e.g. 0x...)');
    if (newName && newId) {
      setContacts([...(Array.isArray(contacts) ? contacts : []), { id: newId, name: newName, status: 'online' }]);
    }
    setShowMenuId(null);
  };

  if (!account) {
    return (
      <div style={{ height: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <Wallet size={64} color="#64748b" style={{ marginBottom: '24px' }} />
        <h2 style={{ marginBottom: '16px', fontSize: '1.5rem', color: 'var(--text)' }}>Connect Wallet to Chat</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '400px', textAlign: 'center' }}>
          Secure, decentralized P2P messaging and file sharing require an active wallet connection to authenticate your identity.
        </p>
        <button className="btn-primary" onClick={connectWallet} style={{ padding: '12px 24px', fontSize: '1.1rem' }}>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', height: 'calc(100vh - 72px)' }}>
      <div style={{ borderRight: '1px solid var(--border)', background: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Messages</h2>
            <button className="btn-secondary" style={{ padding: '8px' }} onClick={handleCreate}>
              <UserPlus size={18} />
            </button>
          </div>
          <div className="search-bar" style={{ width: '100%' }}>
            <Search size={18} color="#64748b" />
            <input 
              type="text" 
              placeholder="Search contacts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {(Array.isArray(filteredContacts) ? filteredContacts : []).map(contact => {
            const chatHistory = messages[contact.id] || [];
            const lastMsgObj = chatHistory[chatHistory.length - 1];
            const lastMsgText = lastMsgObj ? (lastMsgObj.isFile ? `📁 ${lastMsgObj.fileName}` : lastMsgObj.text) : 'Start a conversation';
            const lastMsgTime = lastMsgObj ? lastMsgObj.time : '';
            
            return (
              <div 
                key={contact.id} 
                onClick={() => setActiveContact(contact)}
                style={{ 
                  padding: '16px 24px', 
                  display: 'flex', 
                  gap: '12px', 
                  cursor: 'pointer', 
                  background: activeContact?.id === contact.id ? '#f0fdf4' : 'transparent',
                  borderLeft: activeContact?.id === contact.id ? '4px solid #10b981' : 'none',
                  borderBottom: '1px solid var(--border)'
                }}
                className="chat-list-item"
              >
                <div style={{ width: 48, height: 48, background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, position: 'relative' }}>
                  {contact.name.substring(0, 4)}
                  {contact.status === 'online' && (
                    <div style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, background: '#10b981', border: '2px solid white', borderRadius: '50%' }}></div>
                  )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '0.875rem' }}>{contact.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lastMsgTime}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lastMsgText}
                  </p>
                </div>
                
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setShowMenuId(showMenuId === contact.id ? null : contact.id); 
                    }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8' }}
                    className="menu-btn"
                  >
                    <MoreVertical size={16} />
                  </button>
                  
                  {showMenuId === contact.id && (
                    <div style={{ 
                      position: 'absolute', 
                      right: 0, 
                      top: '100%', 
                      background: 'white', 
                      border: '1px solid var(--border)', 
                      borderRadius: '8px', 
                      zIndex: 50, 
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      minWidth: '120px',
                      overflow: 'hidden'
                    }}>
                      <div 
                        onClick={(e) => { e.stopPropagation(); handleEdit(contact); }} 
                        style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}
                        className="menu-item"
                      >
                        <Edit2 size={14} /> Edit
                      </div>
                      <div 
                        onClick={(e) => { e.stopPropagation(); handleDelete(contact.id); }} 
                        style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#ef4444', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}
                        className="menu-item"
                      >
                        <Trash2 size={14} /> Delete
                      </div>
                      <div 
                        onClick={(e) => { e.stopPropagation(); handleCreate(); }} 
                        style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#10b981', fontSize: '0.875rem' }}
                        className="menu-item"
                      >
                        <Plus size={14} /> Create
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <style>{`
          .chat-list-item:hover { background: #f8fafc; }
          .menu-btn:hover { color: #334155 !important; background: #e2e8f0; border-radius: 4px; }
          .menu-item:hover { background: #f1f5f9; }
        `}</style>
      </div>

      <div style={{ background: '#f8fafc', padding: '24px' }}>
        <Chat activeContactFromView={activeContact} />
      </div>
    </div>
  );
};

export default ChatView;
