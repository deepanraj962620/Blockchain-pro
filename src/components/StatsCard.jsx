import React from 'react';
import { TrendingUp } from 'lucide-react';

const StatsCard = ({ icon, label, value, trend, color }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: `${color}15`, color: color }}>
        {icon}
      </div>
      <div className="stat-info">
        <p>{label}</p>
        <h3>{value}</h3>
        <div className="stat-trend trend-up">
          <TrendingUp size={12} />
          <span>{trend} this month</span>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
