import React from 'react';
import { useWeb3 } from '../Web3Context';
import StatsCard from '../components/StatsCard';
import SendFile from '../components/SendFile';
import RecentTransfers from '../components/RecentTransfers';
import RecentActivity from '../components/RecentActivity';
import { useNavigate } from 'react-router-dom';
import { Send, Download, Files, HardDrive, Cloud } from 'lucide-react';

const DashboardView = () => {
  const { transfers, activities, addTransfer, receivedFiles } = useWeb3();
  const safeTransfers = Array.isArray(transfers) ? transfers : [];
  const safeActivities = Array.isArray(activities) ? activities : [];
  const safeReceivedFiles = Array.isArray(receivedFiles) ? receivedFiles : [];
  const navigate = useNavigate();

  return (
    <div className="dashboard-view">
      <div className="dashboard-left">
        <div className="welcome-card">
          <div className="welcome-text">
            <h1>Welcome back, User! 👋</h1>
            <p>Transfer files securely on the blockchain.<br/>Private. Encrypted. Decentralized.</p>
            <div className="welcome-actions">
              <button className="btn-primary" onClick={() => navigate('/send')}>
                <Send size={18} /> Send File
              </button>
              <button className="btn-secondary" onClick={() => navigate('/receive')}>
                <Download size={18} /> Receive Files
              </button>
            </div>
          </div>
          <div className="welcome-image">
            <div style={{ position: 'relative', width: 200, height: 150 }}>
               <div style={{ position: 'absolute', top: 20, right: 0, width: 120, height: 100, background: '#10b981', borderRadius: 20, transform: 'rotate(5deg)', opacity: 0.1 }}></div>
               <div style={{ position: 'absolute', top: 0, right: 20, width: 120, height: 100, background: '#10b981', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Files size={48} />
               </div>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <StatsCard icon={<Send size={24} />} label="Files Sent" value={safeTransfers.length} trend="12%" color="#10b981" />
          <StatsCard icon={<Download size={24} />} label="Files Received" value={safeReceivedFiles.length} trend="8%" color="#3b82f6" />
          <StatsCard icon={<Files size={24} />} label="Total Files" value={safeTransfers.length + safeReceivedFiles.length} trend="15%" color="#a855f7" />
<StatsCard icon={<HardDrive size={24} />} label="Storage Used" value="2.45 GB" trend="6%" color="#f59e0b" />
          <StatsCard icon={<Cloud size={24} />} label="Cloud Storage" value="Encrypted" trend="Active" color="#0ea5e9" />
        </div>

        <div className="content-row">
          <SendFile onSend={addTransfer} />
          <RecentTransfers transfers={safeTransfers} />
        </div>

        <div style={{ marginTop: 24 }}>
          <RecentActivity activities={safeActivities} />
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
