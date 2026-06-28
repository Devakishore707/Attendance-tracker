import React from 'react';
import { BarChart3, Clock, Grid, Calendar } from 'lucide-react';

const Logo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="9" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40 15" />
    <path d="M9 12l2 2 4-4" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Sidebar({ currentTab, setCurrentTab }) {
  const menuItems = [
    { id: 'today', name: 'Today', icon: Clock },
    { id: 'timetable', name: 'Timetable', icon: Grid },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'subjects', name: 'Subjects & Stats', icon: BarChart3 },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon-wrapper">
          <Logo />
        </div>
        <span className="brand-name">Presenly</span>
      </div>

      <ul className="nav-links">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <li
              key={item.id}
              className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
              onClick={() => setCurrentTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </li>
          );
        })}
      </ul>

      <div style={{ padding: '0 20px', marginTop: 'auto', marginBottom: '15px' }}>
        <div className="profile-badge">
          <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '2px' }}>Student Profile</div>
          <div className="profile-name">Devakishore S</div>
          <div className="profile-reg">RA2531243010075</div>
        </div>
      </div>

      <div className="sidebar-footer">
        <p style={{ fontWeight: 600, marginBottom: '4px' }}>Presenly v1.0</p>
        <p>Premium Attendance Tracker. Safe threshold set to 75%.</p>
      </div>
    </aside>
  );
}

