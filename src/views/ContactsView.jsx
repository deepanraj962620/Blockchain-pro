import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, MoreVertical, MessageSquare, Send, Trash2, Edit3, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { API_URL } from '../lib/api';

const ContactsView = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMenu, setActiveMenu] = useState(null);
  const [contacts, setContacts] = useState([]);
  
  // Add Contact Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', address: '', alias: '' });
  
  // Edit Contact Modal State
  const [editingContact, setEditingContact] = useState(null);
  const [editContact, setEditContact] = useState({ name: '', address: '', alias: '' });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_URL}/contacts`);
      const data = await res.json().catch(() => []);
      setContacts(res.ok && Array.isArray(data) ? data : []);
      if (!res.ok) console.error('Contacts API error:', data);
    } catch (err) {
      console.error('Failed to fetch contacts', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this contact?")) {
      try {
        await fetch(`${API_URL}/contacts/${id}`, { method: 'DELETE' });
        setContacts((Array.isArray(contacts) ? contacts : []).filter(c => c.id !== id));
        setActiveMenu(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.name || !newContact.address) return;

    const contactData = {
      id: newContact.address,
      name: newContact.name,
      alias: newContact.alias || 'Contact',
      status: 'offline',
      dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    try {
      await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });
      setContacts([...(Array.isArray(contacts) ? contacts : []), contactData]);
      setShowAddModal(false);
      setNewContact({ name: '', address: '', alias: '' });
    } catch (err) {
      console.error(err);
      alert("Failed to add contact.");
    }
  };

  const handleEditContact = async (e) => {
    e.preventDefault();
    if (!editContact.name) return;

    const contactData = {
      id: editingContact.id,
      name: editContact.name,
      alias: editContact.alias || editingContact.alias || '',
      status: editingContact.status,
      dateAdded: editingContact.dateAdded
    };

    try {
      await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });
      fetchContacts();
      setEditingContact(null);
      setEditContact({ name: '', address: '', alias: '' });
    } catch (err) {
      console.error(err);
      alert("Failed to save changes.");
    }
  };

  const handleChat = (contact) => {
    navigate('/chat', { state: { contact } });
  };

  const handleSend = (contact) => {
    navigate('/send', { state: { recipient: contact.id } });
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Contacts</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your frequent recipients and saved wallet addresses.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <UserPlus size={18} /> Add New Contact
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
          <div className="search-bar" style={{ width: '100%' }}>
            <Search size={18} color="#64748b" />
            <input 
              type="text" 
              placeholder="Search by name, alias or address..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {(Array.isArray(contacts) ? contacts : []).length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <h3>No contacts found</h3>
            <p>You haven't added any contacts yet. Click "Add New Contact" to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', padding: '24px' }}>
            {(Array.isArray(contacts) ? contacts : []).filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((contact) => (
              <div key={contact.id} className="card" style={{ padding: '20px', position: 'relative' }}>
                <button 
                  style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  onClick={() => setActiveMenu(activeMenu === contact.id ? null : contact.id)}
                >
                  <MoreVertical size={18} />
                </button>

                {activeMenu === contact.id && (
                  <div style={{
                    position: 'absolute',
                    top: '40px',
                    right: '16px',
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
                      onClick={() => { setEditingContact(contact); setEditContact(contact); setActiveMenu(null); }}
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    <button 
                      style={{ width: '100%', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: '#ef4444' }}
                      onClick={() => handleDelete(contact.id)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ width: 48, height: 48, background: '#f0fdf4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>
                    {contact.name ? contact.name[0].toUpperCase() : 'C'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem' }}>{contact.name}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contact.alias || 'Contact'}</p>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Wallet Address</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'monospace' }}>
                    {contact.id.length > 20 ? `${contact.id.substring(0,6)}...${contact.id.substring(contact.id.length-4)}` : contact.id}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" style={{ flex: 1, gap: '8px', fontSize: '0.875rem', justifyContent: 'center' }} onClick={() => handleChat(contact)}>
                    <MessageSquare size={16} /> Chat
                  </button>
                  <button className="btn-secondary" style={{ flex: 1, gap: '8px', fontSize: '0.875rem', justifyContent: 'center' }} onClick={() => handleSend(contact)}>
                    <Send size={16} /> Send
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

{showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Add New Contact</h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowAddModal(false)} />
            </div>
            
            <form onSubmit={handleAddContact}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. John Doe" 
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Alias / Role (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Designer" 
                  value={newContact.alias}
                  onChange={(e) => setNewContact({...newContact, alias: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Wallet Address</label>
                <input 
                  type="text" 
                  required
                  placeholder="0x..." 
                  value={newContact.address}
                  onChange={(e) => setNewContact({...newContact, address: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Save Contact</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingContact && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Edit Contact</h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setEditingContact(null)} />
            </div>
            
            <form onSubmit={handleEditContact}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. John Doe" 
                  value={editContact.name}
                  onChange={(e) => setEditContact({...editContact, name: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Alias / Role (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Designer" 
                  value={editContact.alias}
                  onChange={(e) => setEditContact({...editContact, alias: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Wallet Address</label>
                <input 
                  type="text" 
                  required
                  placeholder="0x..." 
                  value={editingContact.id}
                  readOnly
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#f8fafc' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditingContact(null)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsView;
