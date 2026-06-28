import React from 'react';
import { Clock, Calendar, Grid, BarChart3 } from 'lucide-react';

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
          <Clock size={22} strokeWidth={2.5} />
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

      <div className="sidebar-footer">
        <p style={{ fontWeight: 600, marginBottom: '4px' }}>Presenly v1.0</p>
        <p>Premium Attendance Tracker. Safe threshold set to 75%.</p>
      </div>
    </aside>
  );
}
