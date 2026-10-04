import React from 'react';
import { useWeb3 } from '../Web3Context';
import { Shield, Lock, Globe, Zap, Hexagon, Beaker } from 'lucide-react';

const LoginView = () => {
  const { connectWallet, mockConnectWallet, loading } = useWeb3();

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '20px'
    }}>
      <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '40px', textAlign: 'center' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: '#10b981', 
            borderRadius: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white',
            margin: '0 auto 16px',
            boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)'
          }}>
            <Hexagon size={32} fill="currentColor" />
          </div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>SecureChain</h1>
          <p style={{ color: 'var(--text-muted)' }}>Decentralized File Transfer Protocol</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px', textAlign: 'left' }}>
          <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '12px' }}>
            <Shield size={20} color="#10b981" style={{ marginBottom: '8px' }} />
            <h4 style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Secure</h4>
            <p style={{ fontSize: '0.625rem', color: '#64748b' }}>End-to-end encrypted transfers</p>
          </div>
          <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '12px' }}>
            <Lock size={20} color="#3b82f6" style={{ marginBottom: '8px' }} />
            <h4 style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Private</h4>
            <p style={{ fontSize: '0.625rem', color: '#64748b' }}>No personal data required</p>
          </div>
        </div>

        <button 
          className="btn-primary" 
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem', marginBottom: '12px' }}
          onClick={connectWallet}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Connect MetaMask Wallet'}
        </button>

        <button 
          className="btn-secondary" 
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem', background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          onClick={mockConnectWallet}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Continue as Guest'}
        </button>

        <p style={{ marginTop: '24px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Don't have a wallet? <a href="https://metamask.io/" target="_blank" rel="noreferrer" style={{ color: '#10b981', fontWeight: 600 }}>Get MetaMask</a>
        </p>

        <p style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          By connecting your real wallet, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
};

export default LoginView;
