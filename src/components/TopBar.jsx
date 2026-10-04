import React from 'react';
import { Search, Bell, ChevronDown, Menu } from 'lucide-react';
import { useWeb3 } from '../Web3Context';

const TopBar = ({ onToggleSidebar }) => {
  const { account, connectWallet, network, copyAddress, isP2pMode, setIsP2pMode } = useWeb3();

  return (
    <header className="top-bar">
      {/* Hamburger button - visible on mobile only */}
      <button 
        className="hamburger-btn" 
        onClick={onToggleSidebar}
        aria-label="Toggle menu"
      >
        <Menu size={24} />
      </button>

      <div className="search-bar">
        <Search size={18} color="#64748b" />
        <input type="text" placeholder="Search anything..." />
      </div>

      <div className="top-bar-right">
        <div className="network-selector">
          <div className="status-dot"></div>
          <span>{network || 'Ethereum Mainnet'}</span>
          <ChevronDown size={16} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 12px', borderRadius: '8px', background: '#f8fafc' }}>
          <span style={{ fontSize: '0.8rem' }}>P2P</span>
          <div 
            style={{ 
              width: '36px', 
              height: '20px', 
              background: isP2pMode ? '#8b5cf6' : '#d1d5db', 
              borderRadius: '10px', 
              position: 'relative', 
              cursor: 'pointer' 
            }} 
            onClick={() => setIsP2pMode(!isP2pMode)}
            title={isP2pMode ? "P2P Direct Mode Enabled (Fastest)" : "Switch to P2P Direct Mode"}
          >
            <div style={{ 
              width: '16px', 
              height: '16px', 
              background: 'white', 
              borderRadius: '50%', 
              position: 'absolute', 
              top: '2px', 
              left: isP2pMode ? '20px' : '2px', 
              transition: 'left 0.2s ease'
            }} />
          </div>
        </div>

        <button className="wallet-btn" onClick={account ? copyAddress : connectWallet} title={account ? "Click to copy address" : "Connect Wallet"}>
          {account ? (
            <>
              <div className="wallet-avatar"></div>
              <span style={{ fontWeight: 600 }}>
                {account.substring(0, 6)}...{account.substring(account.length - 4)}
              </span>
              <div className="status-dot" style={{ width: 6, height: 6, background: '#10b981' }}></div>
              <span style={{ fontSize: '10px', color: '#10b981' }}>Connected</span>
            </>
          ) : (
            <>
              <div className="wallet-avatar" style={{ background: '#e2e8f0' }}></div>
              <span style={{ fontWeight: 600 }}>Connect Wallet</span>
            </>
          )}
        </button>

        <div className="icon-btn" style={{ position: 'relative' }}>
          <Bell size={20} color="#64748b" />
          <div style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 14,
            height: 14,
            background: '#10b981',
            borderRadius: '50%',
            border: '2px solid white',
            fontSize: '8px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>3</div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
