import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, X, CalendarX, Info } from 'lucide-react';
import { formatDateISO, getDayOrderForDate, getParticularsForDate } from '../utils/helpers';

export default function AttendanceCalendar({
  attendanceLog,
  markAttendance,
  slots,
  timetable,
  subjects,
  currentDate,
  academicCalendar,
}) {
  const [viewDate, setViewDate] = useState(new Date(currentDate));
  const [selectedDateStr, setSelectedDateStr] = useState(formatDateISO(currentDate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
  // Convert standard JS getDay (0=Sun, 6=Sat) to Mon=0 ... Sun=6
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create an array representing all calendar cells
  const dayCells = [];
  // Empty slots before 1st of month
  for (let i = 0; i < startOffset; i++) {
    dayCells.push({ isEmpty: true });
  }
  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateStr = formatDateISO(dateObj);
    dayCells.push({
      isEmpty: false,
      dayNum: d,
      dateStr,
      dateObj,
    });
  }

  // Get weekday labels starting on Monday
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const selectedDateObj = new Date(selectedDateStr);
  const selectedDayOrder = getDayOrderForDate(selectedDateStr, undefined, undefined, academicCalendar);
  const selectedDaySchedule = selectedDayOrder ? timetable[selectedDayOrder] || {} : {};
  const selectedDateLogs = attendanceLog[selectedDateStr] || {};
  const isSelectedWeekend = selectedDateObj.getDay() === 0 || selectedDateObj.getDay() === 6;

  return (
    <div className="tab-content calendar-tab">
      <div className="calendar-layout-grid">
        {/* Left Side: Monthly Grid */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="calendar-widget-header">
            <h3 className="section-header">Monthly Logs</h3>
            <div className="calendar-navigation">
              <button className="btn-nav-cal" onClick={handlePrevMonth}>
                <ChevronLeft size={16} />
              </button>
              <span className="month-title">
                {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button className="btn-nav-cal" onClick={handleNextMonth}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="calendar-grid-container">
            <div className="calendar-weekdays-row">
              {weekdays.map(w => (
                <div key={w} className="weekday-header">{w}</div>
              ))}
            </div>

            <div className="calendar-days-grid">
              {dayCells.map((cell, idx) => {
                if (cell.isEmpty) {
                  return <div key={`empty-${idx}`} className="calendar-day-cell empty-day" />;
                }

                const dayOrderNum = getDayOrderForDate(cell.dateStr, undefined, undefined, academicCalendar);
                const dayLog = attendanceLog[cell.dateStr] || {};
                const schedule = dayOrderNum ? timetable[dayOrderNum] || {} : {};
                const hasTodayBorder = formatDateISO(currentDate) === cell.dateStr;
                const isSelected = selectedDateStr === cell.dateStr;

                // Collect attendance dots for classes scheduled
                const dots = [];
                if (dayOrderNum) {
                  slots.forEach(slot => {
                    if (slot.isBreak) return;
                    const subjectId = schedule[slot.id];
                    if (subjectId) {
                      const status = dayLog[slot.id]; // present, absent, off, undefined
                      dots.push({
                        slotId: slot.id,
                        status: status || 'unmarked'
                      });
                    }
                  });
                }

                return (
                  <div
                    key={cell.dateStr}
                    className={`calendar-day-cell ${hasTodayBorder ? 'today-cell' : ''} ${isSelected ? 'selected-day' : ''}`}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    title={getParticularsForDate(cell.dateStr, academicCalendar) || (dayOrderNum ? `Day Order ${dayOrderNum}` : '')}
                  >
                    <span className="day-number">{cell.dayNum}</span>
                    
                    {dayOrderNum && !cell.isEmpty && (
                      <span className="day-order-badge">
                        D{dayOrderNum}
                      </span>
                    )}

                    {/* Render dots for scheduled classes */}
                    {dots.length > 0 && (
                      <div className="calendar-dots">
                        {dots.map(dot => (
                          <div 
                            key={dot.slotId} 
                            className={`cal-dot ${dot.status}`}
                            title={dot.status.toUpperCase()}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Retroactive Log Editor */}
        <div className="calendar-side-panel">
          <div className="card" style={{ height: '100%' }}>
            <h3 className="selected-date-title">
              {new Date(selectedDateStr).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </h3>

            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {isSelectedWeekend ? (
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <CalendarX size={32} />
                  <span className="empty-state-title">Weekend</span>
                  <span className="empty-state-text">No classes scheduled on weekends.</span>
                </div>
              ) : selectedDayOrder ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <Info size={14} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Assigned schedule: <strong>Day Order {selectedDayOrder}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                    {slots.map(slot => {
                      if (slot.isBreak) return null;
                      const subjectId = selectedDaySchedule[slot.id];
                      const subject = subjects.find(sub => sub.id === subjectId);
                      const currentStatus = selectedDateLogs[slot.id];

                      if (!subject) return null;

                      return (
                        <div key={slot.id} className="panel-row-item">
                          <div className="panel-row-info">
                            <span className="panel-subj-name">{subject.name}</span>
                            <span className="panel-slot-time">
                              {slot.startTime ? `${slot.startTime} - ${slot.endTime} • ` : 'Online Hour • '}{slot.label}
                            </span>
                          </div>

                          <div className="panel-actions-row">
                            <button
                              className={`btn-mini-action attended ${currentStatus === 'present' ? 'active' : ''}`}
                              title="Mark Attended"
                              onClick={() => markAttendance(selectedDateStr, slot.id, subject.id, 'present')}
                            >
                              P
                            </button>
                            <button
                              className={`btn-mini-action missed ${currentStatus === 'absent' ? 'active' : ''}`}
                              title="Mark Missed"
                              onClick={() => markAttendance(selectedDateStr, slot.id, subject.id, 'absent')}
                            >
                              A
                            </button>
                            <button
                              className={`btn-mini-action off ${currentStatus === 'off' ? 'active' : ''}`}
                              title="Mark Off / Cancelled"
                              onClick={() => markAttendance(selectedDateStr, slot.id, subject.id, 'off')}
                            >
                              Off
                            </button>
                            <button
                              className="btn-mini-action"
                              title="Clear Log"
                              onClick={() => markAttendance(selectedDateStr, slot.id, subject.id, null)}
                            >
                              Clr
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {Object.keys(selectedDaySchedule).filter(k => selectedDaySchedule[k]).length === 0 && (
                      <div className="empty-state" style={{ padding: '20px 0' }}>
                        <Info size={30} />
                        <span className="empty-state-title">No timetable assigned</span>
                        <span className="empty-state-text">
                          You haven't assigned any subjects to Day Order {selectedDayOrder} in the Timetable page.
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <CalendarX size={32} />
                  <span className="empty-state-title" style={{ color: 'var(--color-primary)', marginTop: '8px', marginBottom: '8px' }}>
                    {getParticularsForDate(selectedDateStr, academicCalendar) || 'Holiday / Day Off'}
                  </span>
                  <span className="empty-state-text">
                    This day has no scheduled class Day Order. Enjoy your day!
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
