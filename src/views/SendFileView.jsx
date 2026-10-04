import React from 'react';
import { useWeb3 } from '../Web3Context';
import SendFile from '../components/SendFile';
import { Shield, Lock, Globe } from 'lucide-react';

const SendFileView = () => {
  const { addTransfer } = useWeb3();

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Send Files Securely</h1>
        <p style={{ color: 'var(--text-muted)' }}>Upload your files and share them via the decentralized network.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
        <div>
          <SendFile onSend={addTransfer} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="#10b981" /> Security Info
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', gap: '12px', fontSize: '0.875rem' }}>
                <Lock size={16} color="var(--text-muted)" style={{ marginTop: '2px' }} />
                <span>Files are encrypted using AES-256 before being uploaded.</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', fontSize: '0.875rem' }}>
                <Globe size={16} color="var(--text-muted)" style={{ marginTop: '2px' }} />
                <span>Data is stored on IPFS, ensuring decentralized availability.</span>
              </li>
            </ul>
          </div>

          <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Pro Tip</h3>
            <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
              You can send multiple files at once by archiving them into a single .zip file for better performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendFileView;
