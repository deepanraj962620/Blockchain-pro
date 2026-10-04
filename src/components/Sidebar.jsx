import React from 'react';
import { NavLink } from 'react-router-dom';
import { useWeb3 } from '../Web3Context';
import { 
  LayoutDashboard, 
  Send, 
  Download, 
  MessageSquare, 
  History, 
  ShieldCheck, 
  Users, 
  Settings,
  Hexagon,
  LogOut,
  X,
  Cloud
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { disconnectWallet } = useWeb3();
  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <Send size={20} />, label: 'Send File', path: '/send' },
    { icon: <Download size={20} />, label: 'Receive Files', path: '/receive' },
    { icon: <MessageSquare size={20} />, label: 'Chat', path: '/chat' },
    { icon: <History size={20} />, label: 'History', path: '/history' },
    { icon: <Cloud size={20} />, label: 'Cloud Storage', path: '/cloud' },
    { icon: <ShieldCheck size={20} />, label: 'Security', path: '/security' },
    { icon: <Users size={20} />, label: 'Contacts', path: '/contacts' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="logo">
        <div className="logo-icon">
          <Hexagon size={24} fill="currentColor" />
        </div>
        <div className="logo-text">
          <h2>SecureChain</h2>
          <p>Blockchain File Transfer</p>
        </div>
        {/* Close button - visible only on mobile */}
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <X size={22} />
        </button>
      </div>

      <nav className="nav-menu">
        {navItems.map((item, index) => (
          <NavLink 
            key={index} 
            to={item.path} 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button 
          onClick={() => { disconnectWallet(); onClose(); }}
          className="nav-item" 
          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', marginTop: 'auto', marginBottom: '20px' }}
        >
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
        <div className="promo-card">
          <ShieldCheck size={32} color="#10b981" style={{ marginBottom: '12px' }} />
          <h4>Your Data, Your Control</h4>
          <p>All files are end-to-end encrypted and stored on decentralized networks.</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
