import React from 'react';
import { History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const RecentActivity = ({ activities }) => {
  return (
    <div className="card">
      <div className="card-header">
        <h3><History size={18} color="#10b981" /> Recent Activity</h3>
        <a href="#" className="view-all">View All</a>
      </div>

      <div className="transfer-list">
        {(Array.isArray(activities) ? activities : []).slice(0, 5).map((item, index) => (
          <div key={index} className="transfer-item">
            <div className="file-info">
              <div className="file-icon" style={{ 
                backgroundColor: item.type === 'sent' ? '#f0fdf4' : '#eff6ff', 
                color: item.type === 'sent' ? '#10b981' : '#3b82f6',
                borderRadius: '50%'
              }}>
                {item.type === 'sent' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
              </div>
              <div className="file-details">
                <h4>{item.type === 'sent' ? 'Sent' : 'Received'} {item.file}</h4>
                <p>{item.type === 'sent' ? 'To' : 'From'}: {item.target}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '10px', color: '#1e293b', fontWeight: 600 }}>{item.date}</p>
              <p style={{ fontSize: '10px', color: '#64748b' }}>{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;
