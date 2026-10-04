import React from 'react';
import { ShieldCheck, Lock, Eye, AlertTriangle, RefreshCw } from 'lucide-react';

const SecurityView = () => {
  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Security Settings</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage your encryption keys and wallet permissions.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#f0fdf4', color: '#10b981', padding: '10px', borderRadius: '12px' }}>
              <Lock size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem' }}>End-to-End Encryption</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status: Active</p>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            All files are encrypted using your private key before leaving your device. Only the recipient with the corresponding key can decrypt them.
          </p>
          <button className="btn-secondary" style={{ width: '100%' }}>Rotate Keys</button>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '10px', borderRadius: '12px' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem' }}>Wallet Permissions</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Connected: MetaMask</p>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Manage the permissions granted to SecureChain. You can revoke access or change the connected wallet at any time.
          </p>
          <button className="btn-secondary" style={{ width: '100%' }}>Manage Permissions</button>
        </div>

        <div className="card" style={{ padding: '24px', gridColumn: 'span 2', border: '1px solid #fee2e2', background: '#fff5f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <AlertTriangle size={20} color="#ef4444" />
            <h3 style={{ fontSize: '1rem', color: '#991b1b' }}>Emergency Recovery</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '20px' }}>
            If you lose access to your wallet, you will lose access to all your encrypted files. We recommend backing up your secret recovery phrase in a safe place.
          </p>
          <button className="btn-primary" style={{ background: '#ef4444' }}>View Recovery Phrase</button>
        </div>
      </div>
    </div>
  );
};

export default SecurityView;
