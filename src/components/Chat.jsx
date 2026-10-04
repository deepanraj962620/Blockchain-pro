import React, { useState, useEffect } from 'react';
import { MessageSquare, MoreHorizontal, Smile, Send, Info, ChevronLeft, Plus, Edit2, Trash2, Check, X, Wallet } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useWeb3 } from '../Web3Context';

const Chat = ({ activeContactFromView }) => {
  const location = useLocation();
  const { messages, sendMessage, sendFileMessage, deleteMessage, editMessage, account, connectWallet } = useWeb3();
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState("");
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editInput, setEditInput] = useState("");

  // Contacts for the list
  const contacts = [
    { id: '0x7B21...a8F3', name: 'Alex Thompson', status: 'online' },
    { id: '0x3C72...b9D8', name: 'Sarah Chen', status: 'offline' },
    { id: '0x9A12...c4E7', name: 'Michael Ross', status: 'online' },
    { id: '0x1F87...d6A2', name: 'Project Alpha Vault', status: 'online' },
  ];

  useEffect(() => {
    if (activeContactFromView) {
      setActiveChatId(activeContactFromView.id);
    } else if (location.state?.contact) {
      setActiveChatId(location.state.contact.address);
    }
  }, [activeContactFromView, location.state]);

  const handleSend = () => {
    if (!input.trim() || !activeChatId) return;
    sendMessage(activeChatId, input);
    setInput("");
  };

  const activeMessages = messages[activeChatId] || [];
  const activeContact = contacts.find(c => c.id === activeChatId) || { name: activeChatId, status: 'unknown' };

  const startEditing = (msg) => {
    setEditingMsgId(msg.id);
    setEditInput(msg.text);
  };

  const saveEdit = (msgId) => {
    if (editInput.trim() && activeChatId) {
      editMessage(activeChatId, msgId, editInput);
    }
    setEditingMsgId(null);
  };

  if (!activeChatId) {
    return (
      <div className="card chat-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <h3>Select a conversation</h3>
          <p>Choose a contact from the list to start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card chat-panel">
      <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setActiveChatId(null)}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <h4 style={{ fontSize: '0.875rem' }}>{activeContact.name}</h4>
            <p style={{ fontSize: '0.75rem', color: activeContact.status === 'online' ? '#10b981' : 'var(--text-muted)' }}>
              {activeContact.status === 'online' ? '● Online' : 'Offline'}
            </p>
          </div>
        </div>
        <MoreHorizontal size={20} color="#64748b" />
      </div>

      <div className="chat-history">
        {(Array.isArray(activeMessages) ? activeMessages : []).length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No messages yet. Say hi!
          </div>
        ) : (
          (Array.isArray(activeMessages) ? activeMessages : []).map(msg => (
            <div key={msg.id} className={`message ${msg.type}`} style={{ position: 'relative', paddingRight: msg.type === 'sent' && !msg.isFile ? '40px' : undefined }}>
              {editingMsgId === msg.id ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    value={editInput}
                    onChange={(e) => setEditInput(e.target.value)}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'inherit', padding: '4px', borderRadius: '4px' }}
                    autoFocus
                  />
                  <Check size={16} style={{ cursor: 'pointer' }} onClick={() => saveEdit(msg.id)} />
                  <X size={16} style={{ cursor: 'pointer' }} onClick={() => setEditingMsgId(null)} />
                </div>
              ) : (
                <>
                  {msg.isFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{msg.fileName}</div>
                        <div style={{ fontSize: '10px', opacity: 0.8 }}>{msg.fileSize}</div>
                      </div>
                    </div>
                  ) : (
                    msg.text
                  )}
                  {msg.type === 'sent' && !msg.isFile && (
                    <div className="message-actions" style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.2s' }}>
                      <Edit2 size={12} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => startEditing(msg)} />
                      <Trash2 size={12} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => deleteMessage(activeChatId, msg.id)} />
                    </div>
                  )}
                </>
              )}
              <p style={{ fontSize: '9px', marginTop: 4, textAlign: 'right', opacity: 0.7 }}>
                {msg.time}
              </p>
            </div>
          ))
        )}
      </div>
      <style>{`
        .message:hover .message-actions { opacity: 1 !important; }
      `}</style>

      <div className="chat-input">
        <div className="input-with-icon" style={{ flex: 1 }}>
          <input 
            type="text" 
            placeholder="Type a message..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <Smile className="input-icon" size={18} />
        </div>
        <button className="btn-primary" style={{ padding: '8px 12px' }} onClick={handleSend}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default Chat;
