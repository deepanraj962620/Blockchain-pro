import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import StatsCard from './StatsCard';
import SendFile from './SendFile';
import RecentTransfers from './RecentTransfers';
import RecentActivity from './RecentActivity';
import Chat from './Chat';
import { Send, Download, Files, HardDrive } from 'lucide-react';

const Dashboard = () => {
  const [transfers, setTransfers] = useState([
    { name: 'Project_Proposal.pdf', size: '2.4 MB', date: 'May 24, 2024', status: 'Confirmed', type: 'pdf', color: '#ef4444' },
    { name: 'Smart_Contract.docx', size: '1.1 MB', date: 'May 23, 2024', status: 'Confirmed', type: 'doc', color: '#3b82f6' },
    { name: 'Data_Analysis.xlsx', size: '950 KB', date: 'May 22, 2024', status: 'Confirmed', type: 'xls', color: '#10b981' },
    { name: 'Screenshot_2024.png', size: '1.8 MB', date: 'May 21, 2024', status: 'Pending', type: 'png', color: '#f59e0b' },
    { name: 'Presentation.pptx', size: '3.2 MB', date: 'May 20, 2024', status: 'Confirmed', type: 'ppt', color: '#a855f7' },
  ]);

  const [activities, setActivities] = useState([
    { type: 'sent', file: 'Project_Proposal.pdf', target: '0x7B21...a8F3', time: '10:30 AM', date: 'May 24, 2024' },
    { type: 'received', file: 'Smart_Contract.docx', target: '0x3C72...b9D8', time: '02:15 PM', date: 'May 23, 2024' },
    { type: 'sent', file: 'Data_Analysis.xlsx', target: '0x9A12...c4E7', time: '11:45 AM', date: 'May 22, 2024' },
    { type: 'received', file: 'Screenshot_2024.png', target: '0x1F87...d6A2', time: '09:20 AM', date: 'May 21, 2024' },
    { type: 'received', file: 'Presentation.pptx', target: '0x8B34...e7F1', time: '04:05 PM', date: 'May 20, 2024' },
  ]);

  const addTransfer = (file, recipient) => {
    const newTransfer = {
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Pending',
      type: file.name.split('.').pop(),
      color: '#10b981'
    };

    const newActivity = {
      type: 'sent',
      file: file.name,
      target: recipient.substring(0, 6) + '...' + recipient.substring(recipient.length - 4),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    setTransfers([newTransfer, ...transfers]);
    setActivities([newActivity, ...activities]);

    // Simulate confirmation
    setTimeout(() => {
      setTransfers(current => 
        current.map(t => t.name === file.name ? { ...t, status: 'Confirmed' } : t)
      );
    }, 5000);
  };

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <TopBar />
        
        <div className="dashboard-view">
          <div className="dashboard-left">
            <div className="welcome-card">
              <div className="welcome-text">
                <h1>Welcome back, User! 👋</h1>
                <p>Transfer files securely on the blockchain.<br/>Private. Encrypted. Decentralized.</p>
                <div className="welcome-actions">
                  <button className="btn-primary">
                    <Send size={18} /> Send File
                  </button>
                  <button className="btn-secondary">
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
              <StatsCard icon={<Send size={24} />} label="Files Sent" value={transfers.length} trend="12%" color="#10b981" />
              <StatsCard icon={<Download size={24} />} label="Files Received" value="18" trend="8%" color="#3b82f6" />
              <StatsCard icon={<Files size={24} />} label="Total Files" value={transfers.length + 18} trend="15%" color="#a855f7" />
              <StatsCard icon={<HardDrive size={24} />} label="Storage Used" value="2.45 GB" trend="6%" color="#f59e0b" />
            </div>

            <div className="content-row">
              <SendFile onSend={addTransfer} />
              <RecentTransfers transfers={transfers} />
            </div>

            <div style={{ marginTop: 24 }}>
              <RecentActivity activities={activities} />
            </div>
          </div>

          <div className="dashboard-right">
            <Chat />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
