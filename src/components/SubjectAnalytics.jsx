import React, { useState } from 'react';
import { Plus, Trash2, ShieldCheck, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import { getAttendanceStats, getOverallStats } from '../utils/helpers';

export default function SubjectAnalytics({
  subjects,
  setSubjects,
  attendanceLog,
  setAttendanceLog,
  timetable,
  setTimetable,
}) {
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');

  // Target percent configuration (default 75)
  const targetPercent = 75;

  // Calculate subject stats
  const subjectsStats = getAttendanceStats(subjects, attendanceLog, targetPercent);
  const overallStats = getOverallStats(subjectsStats, targetPercent);

  // Group subjects by range
  const greenSubjects = Object.values(subjectsStats).filter(s => s.status === 'green');
  const yellowSubjects = Object.values(subjectsStats).filter(s => s.status === 'yellow');
  const redSubjects = Object.values(subjectsStats).filter(s => s.status === 'red');

  // Radial progress calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallStats.percent / 100) * circumference;

  // Handle adding new subject
  const handleAddSubject = (e) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubCode.trim()) return;

    // Check for duplicate code
    if (subjects.some(s => s.code.toLowerCase() === newSubCode.toLowerCase())) {
      alert('A subject with this code already exists.');
      return;
    }

    const newSubObj = {
      id: `subj-${Date.now()}`,
      name: newSubName.trim(),
      code: newSubCode.trim().toUpperCase(),
    };

    setSubjects([...subjects, newSubObj]);
    setNewSubName('');
    setNewSubCode('');
  };

  // Handle deleting a subject
  const handleDeleteSubject = (subjectId) => {
    if (window.confirm('Are you sure you want to delete this subject? This will remove all logs and timetable entries associated with it.')) {
      // 1. Remove from subjects
      setSubjects(subjects.filter(s => s.id !== subjectId));

      // 2. Remove from timetable
      const updatedTimetable = { ...timetable };
      Object.keys(updatedTimetable).forEach(day => {
        Object.keys(updatedTimetable[day]).forEach(slot => {
          if (updatedTimetable[day][slot] === subjectId) {
            updatedTimetable[day][slot] = '';
          }
        });
      });
      setTimetable(updatedTimetable);

      // 3. Remove from logs
      const updatedLogs = { ...attendanceLog };
      Object.keys(updatedLogs).forEach(date => {
        Object.keys(updatedLogs[date]).forEach(slot => {
          if (updatedLogs[date][slot] === subjectId) {
            delete updatedLogs[date][slot];
          }
        });
        if (Object.keys(updatedLogs[date]).length === 0) {
          delete updatedLogs[date];
        }
      });
      setAttendanceLog(updatedLogs);
    }
  };

  // Calculate overall bunk advisor details
  const getOverallAdvisor = () => {
    const P = overallStats.attended;
    const T = overallStats.total;
    const R = targetPercent / 100;

    if (T === 0) {
      return {
        badge: 'No Data',
        badgeClass: 'yellow',
        text: 'Log your attendance from the <strong>Today</strong> or <strong>Calendar</strong> page to see analytics.'
      };
    }

    if (overallStats.percent >= targetPercent) {
      const maxBunk = Math.floor(P / R - T);
      return {
        badge: 'SAFE',
        badgeClass: 'green',
        text: maxBunk > 0 
          ? `Your attendance is above 75%. You can safely bunk up to <strong>${maxBunk}</strong> classes overall without falling below 75%.`
          : `Your attendance is at exactly <strong>75%</strong>. Bunking any classes will drop you below the threshold.`
      };
    } else {
      const reqAttend = Math.ceil((R * T - P) / (1 - R));
      return {
        badge: 'CRITICAL',
        badgeClass: 'red',
        text: `Your overall attendance is below 75%. You need to attend the next <strong>${reqAttend}</strong> classes consecutively to bring your overall average back to 75%.`
      };
    }
  };

  const overallAdvisor = getOverallAdvisor();

  return (
    <div className="tab-content analytics-tab" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Overall Progress Block */}
      <div className="card analytics-hero-row">
        <div className="circular-progress-card">
          <div className="progress-circle-container">
            <svg>
              <circle className="progress-circle-bg" cx="80" cy="80" r={radius} />
              <circle
                className="progress-circle-bar"
                cx="80"
                cy="80"
                r={radius}
                stroke={
                  overallStats.status === 'green'
                    ? 'var(--color-success)'
                    : overallStats.status === 'yellow'
                    ? 'var(--color-warning)'
                    : 'var(--color-danger)'
                }
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: isNaN(strokeDashoffset) ? circumference : strokeDashoffset,
                  filter: 
                    overallStats.status === 'green'
                      ? 'drop-shadow(0 0 6px var(--color-success))'
                      : overallStats.status === 'yellow'
                      ? 'drop-shadow(0 0 6px var(--color-warning))'
                      : 'drop-shadow(0 0 8px var(--color-danger))'
                }}
              />
            </svg>
            <div className="progress-percent-label">
              <span className="val">{overallStats.percent}%</span>
              <span className="lbl">Overall</span>
            </div>
          </div>
        </div>

        <div className="advisor-general-box">
          <span className={`advisor-status-badge ${overallAdvisor.badgeClass}`}>
            {overallAdvisor.badge}
          </span>
          <p 
            className="advisor-text-summary"
            dangerouslySetInnerHTML={{ __html: overallAdvisor.text }}
          />
          <div style={{ display: 'flex', gap: '20px', marginTop: '4px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attended</span>
              <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-success)' }}>{overallStats.attended}</p>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Classes</span>
              <p style={{ fontSize: '18px', fontWeight: 700 }}>{overallStats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subject list groupings */}
      <div className="subject-groups">
        {/* Red Line (< 75%) */}
        <div>
          <div className="group-title-row red">
            <div className="dot" />
            <span>Below 75% Criteria ({redSubjects.length})</span>
          </div>

          {redSubjects.length === 0 ? (
            <div className="card empty-state" style={{ padding: '24px' }}>
              <ShieldCheck size={28} style={{ color: 'var(--color-success)' }} />
              <div className="empty-state-title" style={{ color: 'var(--text-primary)' }}>All Clean!</div>
              <div className="empty-state-text">No subjects are below the 75% limit. Great job!</div>
            </div>
          ) : (
            <div className="subject-grid">
              {redSubjects.map(sub => (
                <div key={sub.id} className="card subject-card border-red">
                  <div className="subject-card-header">
                    <div>
                      <h4 className="subj-info-name">{sub.name}</h4>
                      <span className="subj-info-code">{sub.code}</span>
                    </div>
                    <span className="subj-info-pct red">{sub.percent}%</span>
                  </div>

                  <div className="subject-card-stats">
                    <span>Present: <strong>{sub.attended} / {sub.total}</strong></span>
                    <span>Missed: <strong>{sub.missed}</strong></span>
                  </div>

                  <div className="subject-card-advisor red">
                    <AlertCircle size={14} />
                    <span>Attend the next <strong>{sub.mustAttend}</strong> classes consecutively.</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Yellow Line (75% - 80%) */}
        <div>
          <div className="group-title-row yellow">
            <div className="dot" />
            <span>Borderline 75% - 80% ({yellowSubjects.length})</span>
          </div>

          {yellowSubjects.length === 0 ? (
            <div className="card empty-state" style={{ padding: '24px' }}>
              <HelpCircle size={28} />
              <div className="empty-state-title">Clear Borderline</div>
              <div className="empty-state-text">No subjects fall in the borderline warning zone.</div>
            </div>
          ) : (
            <div className="subject-grid">
              {yellowSubjects.map(sub => (
                <div key={sub.id} className="card subject-card border-yellow">
                  <div className="subject-card-header">
                    <div>
                      <h4 className="subj-info-name">{sub.name}</h4>
                      <span className="subj-info-code">{sub.code}</span>
                    </div>
                    <span className="subj-info-pct yellow">{sub.percent}%</span>
                  </div>

                  <div className="subject-card-stats">
                    <span>Present: <strong>{sub.attended} / {sub.total}</strong></span>
                    <span>Missed: <strong>{sub.missed}</strong></span>
                  </div>

                  <div className="subject-card-advisor yellow">
                    <AlertTriangle size={14} />
                    <span>Can bunk next <strong>{sub.canBunk}</strong> classes. Be careful!</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Green Line (>= 80%) */}
        <div>
          <div className="group-title-row green">
            <div className="dot" />
            <span>Safe Zone &gt;= 80% ({greenSubjects.length})</span>
          </div>

          {greenSubjects.length === 0 ? (
            <div className="card empty-state" style={{ padding: '24px' }}>
              <AlertCircle size={28} />
              <div className="empty-state-title">No Subjects in Safe Zone</div>
              <div className="empty-state-text">Attend classes regularly to reach the safe green zone.</div>
            </div>
          ) : (
            <div className="subject-grid">
              {greenSubjects.map(sub => (
                <div key={sub.id} className="card subject-card border-green">
                  <div className="subject-card-header">
                    <div>
                      <h4 className="subj-info-name">{sub.name}</h4>
                      <span className="subj-info-code">{sub.code}</span>
                    </div>
                    <span className="subj-info-pct green">{sub.percent}%</span>
                  </div>

                  <div className="subject-card-stats">
                    <span>Present: <strong>{sub.attended} / {sub.total}</strong></span>
                    <span>Missed: <strong>{sub.missed}</strong></span>
                  </div>

                  <div className="subject-card-advisor green">
                    <ShieldCheck size={14} />
                    <span>Can safely bunk the next <strong>{sub.canBunk}</strong> classes.</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subject Listing & Adding Management */}
      <div className="subject-manager-box">
        <h3 className="manager-title">Manage Subjects</h3>

        <form onSubmit={handleAddSubject} className="subject-creator-form">
          <input
            type="text"
            placeholder="Subject Name (e.g. Operating Systems)"
            value={newSubName}
            onChange={(e) => setNewSubName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Subject Code (e.g. CS202)"
            value={newSubCode}
            onChange={(e) => setNewSubCode(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary">
            <Plus size={16} />
            <span>Add Subject</span>
          </button>
        </form>

        <div className="manager-subj-list">
          {subjects.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
              No subjects registered. Add some subjects above to get started.
            </p>
          ) : (
            subjects.map(sub => (
              <div key={sub.id} className="manager-subj-row">
                <div className="manager-subj-details">
                  <span className="code">{sub.code}</span>
                  <span className="name">{sub.name}</span>
                </div>
                <button
                  type="button"
                  className="btn-icon-danger"
                  onClick={() => handleDeleteSubject(sub.id)}
                  title="Delete Subject"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
