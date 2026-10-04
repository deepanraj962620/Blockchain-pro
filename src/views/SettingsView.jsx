import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell, ChevronLeft, ChevronRight, CreditCard, Eye, EyeOff, Globe, Moon,
  Save, Trash2, User, CheckCircle2, Loader2
} from 'lucide-react';
import { useWeb3 } from '../Web3Context';
import { useTheme, THEMES } from '../ThemeContext';
import { API_URL, apiFetch, authHeaders } from '../lib/api';

const defaultNotifications = {
  transferCompleted: true,
  newFileReceived: true,
  messageAlerts: true,
  securityAlerts: true
};

const SettingsView = () => {
  const { account, authToken, copyAddress, disconnectWallet, network } = useWeb3();
  const { primaryColor, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('main');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [displayName, setDisplayName] = useState('BlockUser_1');
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [selectedNetwork, setSelectedNetwork] = useState(network || 'Ethereum Mainnet');
  const [ipfsGateway, setIpfsGateway] = useState('https://ipfs.io/ipfs/');
  const [subscription, setSubscription] = useState('Free');

  const sections = useMemo(() => [
    { id: 'profile', icon: <User size={20} />, title: 'Profile Settings', desc: 'Manage your display name and wallet profile' },
    { id: 'notifications', icon: <Bell size={20} />, title: 'Notifications', desc: 'Configure transfer, message and security alerts' },
    { id: 'network', icon: <Globe size={20} />, title: 'Network & API', desc: 'Review backend, blockchain network and IPFS settings' },
    { id: 'appearance', icon: <Moon size={20} />, title: 'Appearance', desc: 'Choose and save your application color theme' },
    { id: 'subscription', icon: <CreditCard size={20} />, title: 'Subscription', desc: 'View and save your selected storage plan' },
  ], []);

  useEffect(() => {
    if (!account || !authToken || !API_URL) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await apiFetch('/settings', { headers: authHeaders(authToken) });
        if (cancelled) return;
        setDisplayName(profile.display_name || 'BlockUser_1');
        setNotifications({ ...defaultNotifications, ...(profile.notifications || {}) });
        setSelectedNetwork(profile.network || network || 'Ethereum Mainnet');
        setIpfsGateway(profile.ipfs_gateway || 'https://ipfs.io/ipfs/');
        setSubscription(profile.subscription || 'Free');
        if (profile.theme) setTheme(profile.theme);
      } catch (error) {
        setStatus(error.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [account, authToken, network, setTheme]);

  const saveSettings = async (updates, successMessage = 'Settings saved') => {
    if (!authToken) {
      setStatus('Connect your wallet again to save settings.');
      return;
    }
    setSaving(true);
    setStatus('');
    try {
      const saved = await apiFetch('/settings', {
        method: 'PUT',
        headers: authHeaders(authToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(updates)
      });
      if (saved.display_name) localStorage.setItem('displayName', saved.display_name);
      setStatus(successMessage);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  };

  const clearAllData = async () => {
    if (!window.confirm('This will permanently clear application data. Continue?')) return;
    try {
      await apiFetch('/clear', { method: 'DELETE', headers: authHeaders(authToken) });
      alert('Database data cleared successfully.');
      window.location.reload();
    } catch (error) {
      alert(error.message);
    }
  };

  const Toggle = ({ enabled, onClick }) => (
    <button type="button" onClick={onClick} aria-pressed={enabled} style={{
      width: 46, height: 26, border: 0, borderRadius: 14, padding: 0,
      background: enabled ? 'var(--primary)' : '#cbd5e1', position: 'relative', cursor: 'pointer'
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
        left: enabled ? 23 : 3, transition: 'left .2s ease', boxShadow: '0 1px 3px rgba(0,0,0,.2)'
      }} />
    </button>
  );

  const SaveButton = ({ onClick, children = 'Save Changes' }) => (
    <button className="btn-primary" onClick={onClick} disabled={saving} style={{ marginTop: 16 }}>
      {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />} {children}
    </button>
  );

  const renderContent = () => {
    if (loading) return <div className="card" style={{ padding: 28 }}>Loading wallet settings...</div>;

    switch (activeTab) {
      case 'profile':
        return <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}><User size={34} /></div>
            <div><strong>Wallet Profile</strong><div style={{ color: 'var(--text-muted)', marginTop: 4 }}>Stored in Supabase using your wallet address.</div></div>
          </div>
          <div className="form-group"><label>Display Name</label><input value={displayName} onChange={e => setDisplayName(e.target.value)} /></div>
          <div className="form-group"><label>Wallet Address</label><div style={{ display: 'flex', gap: 8 }}><input readOnly value={account || ''} style={{ flex: 1 }} /><button className="btn-secondary" onClick={copyAddress}>Copy</button></div></div>
          <SaveButton onClick={() => saveSettings({ display_name: displayName }, 'Profile saved to Supabase')} />
          <hr style={{ margin: '28px 0', border: 0, borderTop: '1px solid var(--border)' }} />
          <button className="btn-secondary" style={{ color: '#ef4444' }} onClick={disconnectWallet}>Disconnect Wallet</button>
        </div>;

      case 'notifications': {
        const items = [
          ['transferCompleted', 'Transfer Completed', 'Alert after a successful transfer'],
          ['newFileReceived', 'New File Received', 'Alert when a file reaches your wallet'],
          ['messageAlerts', 'Message Alerts', 'Notify for new chat messages'],
          ['securityAlerts', 'Security Alerts', 'Important wallet and security notifications']
        ];
        return <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 22 }}>Notification Preferences</h3>
          {items.map(([key, title, desc]) => <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div><strong>{title}</strong><div style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: 3 }}>{desc}</div></div>
            <Toggle enabled={notifications[key]} onClick={() => setNotifications(v => ({ ...v, [key]: !v[key] }))} />
          </div>)}
          <SaveButton onClick={() => saveSettings({ notifications }, 'Notification settings saved')} />
        </div>;
      }

      case 'network':
        return <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 22 }}>Network Configuration</h3>
          <div className="form-group"><label>Blockchain Network</label><select value={selectedNetwork} onChange={e => setSelectedNetwork(e.target.value)} style={{ width: '100%', padding: 11, borderRadius: 8, border: '1px solid var(--border)' }}><option>Ethereum Mainnet</option><option>Sepolia</option><option>Polygon POS</option><option>Arbitrum One</option><option>Optimism</option></select></div>
          <div className="form-group"><label>IPFS Gateway</label><input value={ipfsGateway} onChange={e => setIpfsGateway(e.target.value)} /></div>
          <div className="form-group"><label>Render Backend API</label><input readOnly value={API_URL || 'VITE_API_URL not configured'} /></div>
          <div className="form-group"><label>Backend Key</label><div style={{ display: 'flex', gap: 8 }}><input type={showApiKey ? 'text' : 'password'} readOnly value={authToken ? `${authToken.slice(0, 18)}...` : 'Not authenticated'} style={{ flex: 1 }} /><button className="btn-secondary" onClick={() => setShowApiKey(v => !v)}>{showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          <SaveButton onClick={() => saveSettings({ network: selectedNetwork, ipfs_gateway: ipfsGateway }, 'Network settings saved')} />
        </div>;

      case 'appearance':
        return <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 8 }}>Theme Color</h3><p style={{ color: 'var(--text-muted)', marginBottom: 22 }}>Changes apply immediately and are saved to your wallet profile.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px,1fr))', gap: 12 }}>
            {Object.values(THEMES).map(theme => <button key={theme.name} className="btn-secondary" onClick={() => setTheme(theme.primary)} style={{ padding: 12, borderColor: primaryColor === theme.primary ? theme.primary : 'var(--border)' }}><span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: theme.primary, marginRight: 8 }} />{theme.name}</button>)}
          </div>
          <div className="form-group" style={{ marginTop: 22 }}><label>Custom Color</label><input type="color" value={primaryColor} onChange={e => setTheme(e.target.value)} style={{ height: 48 }} /></div>
          <SaveButton onClick={() => saveSettings({ theme: primaryColor }, 'Appearance saved')} />
        </div>;

      case 'subscription':
        return <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 8 }}>Storage Plan</h3><p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Plan selection is stored in your profile. Billing is not enabled in this demo.</p>
          {['Free', 'Pro', 'Enterprise'].map(plan => <label key={plan} style={{ display: 'flex', justifyContent: 'space-between', padding: 16, border: `1px solid ${subscription === plan ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 12, marginBottom: 10, cursor: 'pointer' }}><span><strong>{plan}</strong><div style={{ color: 'var(--text-muted)', fontSize: '.83rem', marginTop: 3 }}>{plan === 'Free' ? 'Basic encrypted storage' : plan === 'Pro' ? 'Higher limits and priority storage' : 'Team and managed deployment'}</div></span><input type="radio" name="plan" checked={subscription === plan} onChange={() => setSubscription(plan)} /></label>)}
          <SaveButton onClick={() => saveSettings({ subscription }, 'Subscription preference saved')} />
        </div>;

      default:
        return <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sections.map(section => <button key={section.id} className="card" onClick={() => setActiveTab(section.id)} style={{ border: '1px solid var(--border)', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', background: 'var(--card-bg, #fff)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}><div style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: 10, borderRadius: 11 }}>{section.icon}</div><div><h3 style={{ fontSize: '1rem', marginBottom: 4 }}>{section.title}</h3><p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>{section.desc}</p></div></div><ChevronRight size={20} />
            </button>)}
          </div>
          <div style={{ marginTop: 30, padding: 22, border: '1px solid #fecdd3', background: '#fff1f2', borderRadius: 14 }}><h3 style={{ color: '#be123c', display: 'flex', alignItems: 'center', gap: 8 }}><Trash2 size={18} /> Danger Zone</h3><p style={{ color: '#9f1239', margin: '10px 0 14px', fontSize: '.875rem' }}>Deletes app records from the configured database. Use only for development/reset.</p><button className="btn-secondary" style={{ color: '#e11d48' }} onClick={clearAllData}>Clear Database Data</button></div>
        </>;
    }
  };

  return <div style={{ padding: 32, maxWidth: 860 }}>
    <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
      {activeTab !== 'main' && <button className="btn-secondary" style={{ padding: 8 }} onClick={() => setActiveTab('main')}><ChevronLeft size={20} /></button>}
      <div><h1 style={{ fontSize: '2rem', marginBottom: 4 }}>{activeTab === 'main' ? 'Settings' : sections.find(s => s.id === activeTab)?.title}</h1><p style={{ color: 'var(--text-muted)' }}>{activeTab === 'main' ? 'Wallet-linked settings with Supabase persistence.' : sections.find(s => s.id === activeTab)?.desc}</p></div>
    </div>
    {status && <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: status.toLowerCase().includes('saved') ? '#ecfdf5' : '#fff7ed', color: status.toLowerCase().includes('saved') ? '#047857' : '#9a3412', display: 'flex', gap: 8, alignItems: 'center' }}><CheckCircle2 size={17} /> {status}</div>}
    {renderContent()}
  </div>;
};

export default SettingsView;
