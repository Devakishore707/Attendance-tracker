import React, { useState, useEffect } from 'react';
import { Check, X, CalendarX, RotateCcw, Clock } from 'lucide-react';
import { formatDateClean, formatDateISO, isTimeInSlot, getParticularsForDate } from '../utils/helpers';

export default function TodaySchedule({
  currentTime,
  currentDate,
  dayOrder,
  setTodayDayOrder,
  slots,
  timetable,
  subjects,
  attendanceLog,
  markAttendance,
  academicCalendar,
}) {
  const dateISO = formatDateISO(currentDate);
  const daySchedule = timetable[dayOrder] || {};
  
  // Format current system time as HH:MM for slot matching
  const currentHours = String(currentTime.getHours()).padStart(2, '0');
  const currentMinutes = String(currentTime.getMinutes()).padStart(2, '0');
  const systemTimeStr = `${currentHours}:${currentMinutes}`;

  // Find active slot based on current time
  const activeSlot = slots.find(slot => 
    isTimeInSlot(systemTimeStr, slot.startTime, slot.endTime)
  );

  // Selected slot for actions (defaults to active slot or the first slot of the day)
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  useEffect(() => {
    if (activeSlot && !activeSlot.isBreak) {
      setSelectedSlotId(activeSlot.id);
    } else if (slots.length > 0 && !selectedSlotId) {
      const firstNonBreak = slots.find(s => !s.isBreak);
      if (firstNonBreak) {
        setSelectedSlotId(firstNonBreak.id);
      }
    }
  }, [activeSlot, slots]);

  const selectedSlot = slots.find(s => s.id === selectedSlotId);
  const selectedSubjectId = selectedSlot ? daySchedule[selectedSlot.id] : null;
  const selectedSubject = subjects.find(sub => sub.id === selectedSubjectId);

  // Get attendance status for today's logs
  const todayLogs = attendanceLog[dateISO] || {};

  // Find countdown time remaining for the active class if there is one
  const [timeLeftStr, setTimeLeftStr] = useState('');
  useEffect(() => {
    if (activeSlot) {
      const endParts = activeSlot.endTime.split(':').map(Number);
      const endMs = new Date(currentDate).setHours(endParts[0], endParts[1], 0, 0);
      const diffMs = endMs - currentTime.getTime();
      
      if (diffMs > 0) {
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        setTimeLeftStr(`Ends in ${mins}m ${secs}s`);
      } else {
        setTimeLeftStr('');
      }
    } else {
      setTimeLeftStr('');
    }
  }, [currentTime, activeSlot, currentDate]);

  const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
  const isHoliday = !dayOrder && !isWeekend;

  // Day Order easy selector values: 1 to 5
  const dayOrders = [1, 2, 3, 4, 5];

  return (
    <div className="tab-content today-tab">
      <div className="today-grid">
        {/* Left Side: Active class and Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {isWeekend ? (
            <div className="card empty-state" style={{ height: '100%', justifyContent: 'center' }}>
              <CalendarX size={48} strokeWidth={1.5} />
              <div className="empty-state-title">It's the Weekend!</div>
              <div className="empty-state-text">
                No classes scheduled for today. Rest up, recharge, and review your stats page!
              </div>
            </div>
          ) : isHoliday ? (
            <div className="card empty-state" style={{ height: '100%', justifyContent: 'center', minHeight: '300px' }}>
              <CalendarX size={48} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
              <div className="empty-state-title">Holiday / Day Off</div>
              <div className="empty-state-text" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-primary)', marginTop: '8px', marginBottom: '8px' }}>
                {getParticularsForDate(dateISO, academicCalendar) || 'Semester Holiday / Off Day'}
              </div>
              <div className="empty-state-text">
                No Day Order is assigned for today. Enjoy your day!
              </div>
            </div>
          ) : selectedSlot && selectedSubject ? (
            <div className="card hero-class-card">
              {activeSlot?.id === selectedSlot.id && (
                <div className="badge-live">
                  <span className="pulse-dot"></span>
                  Happening Now
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 className="class-title">{selectedSubject.name}</h2>
                  <div className="class-time">
                    <Clock size={15} />
                    <span>{selectedSlot.startTime ? `${selectedSlot.startTime} - ${selectedSlot.endTime}` : 'Online Hour'} • {selectedSlot.label}</span>
                  </div>
                </div>
                {activeSlot?.id === selectedSlot.id && timeLeftStr && (
                  <span className="class-countdown">{timeLeftStr}</span>
                )}
              </div>

              <div style={{ marginTop: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Mark Attendance for this slot:
                </span>
                
                <div className="quick-actions">
                  <button 
                    className={`btn-action attended ${todayLogs[selectedSlot.id] === 'present' ? 'active' : ''}`}
                    onClick={() => markAttendance(dateISO, selectedSlot.id, selectedSubject.id, 'present')}
                  >
                    <Check />
                    <span>Attended</span>
                  </button>

                  <button 
                    className={`btn-action missed ${todayLogs[selectedSlot.id] === 'absent' ? 'active' : ''}`}
                    onClick={() => markAttendance(dateISO, selectedSlot.id, selectedSubject.id, 'absent')}
                  >
                    <X />
                    <span>Missed</span>
                  </button>

                  <button 
                    className={`btn-action off ${todayLogs[selectedSlot.id] === 'off' ? 'active' : ''}`}
                    onClick={() => markAttendance(dateISO, selectedSlot.id, selectedSubject.id, 'off')}
                  >
                    <CalendarX />
                    <span>Off / Cancelled</span>
                  </button>

                  <button 
                    className="btn-action clear"
                    onClick={() => markAttendance(dateISO, selectedSlot.id, selectedSubject.id, null)}
                  >
                    <RotateCcw />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card empty-state" style={{ minHeight: '300px' }}>
              <Clock size={40} />
              <div className="empty-state-title">No Class Scheduled</div>
              <div className="empty-state-text">
                There is no class assigned to the selected slot ({selectedSlot?.label || 'N/A'}) for Day Order {dayOrder}. You can configure your timetable on the Timetable page.
              </div>
            </div>
          )}

          {/* Today's Timeline View */}
          {!isWeekend && !isHoliday && (
            <div className="timeline-section">
              <h3 className="section-header">Today's Timeline</h3>
              <div className="timeline-list">
                {slots.map((slot) => {
                  if (slot.isBreak) {
                    return (
                      <div key={slot.id} className="timeline-break-item">
                        <div className="break-badge">BREAK</div>
                        <div className="break-time">{slot.startTime} - {slot.endTime}</div>
                      </div>
                    );
                  }

                  const subjectId = daySchedule[slot.id];
                  const subject = subjects.find(s => s.id === subjectId);
                  const status = todayLogs[slot.id];
                  const isCurrent = activeSlot?.id === slot.id;
                  
                  return (
                    <div 
                      key={slot.id} 
                      className={`timeline-item ${isCurrent ? 'active' : ''} ${selectedSlotId === slot.id ? 'selected' : ''}`}
                      style={{ cursor: 'pointer', borderLeft: selectedSlotId === slot.id ? '3px solid var(--color-primary)' : '' }}
                      onClick={() => setSelectedSlotId(slot.id)}
                    >
                      <div className="timeline-time">
                        {slot.startTime || 'Online'}
                      </div>
                      
                      <div className={`timeline-indicator ${status || ''} ${isCurrent ? 'active' : ''}`} />
                      
                      <div className="timeline-details">
                        <span className="subject-name">
                          {subject ? subject.name : <span style={{ color: 'var(--text-muted)' }}>Free Period</span>}
                        </span>
                        {subject && (
                          <span className={`status-text ${status || 'unmarked'}`}>
                            {status === 'present' && 'Attended'}
                            {status === 'absent' && 'Missed'}
                            {status === 'off' && 'Cancelled / Off'}
                            {!status && 'Unmarked'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Day Order Mapping Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="card dayorder-selector-widget">
            <h3 className="section-header" style={{ marginBottom: '8px' }}>Day Order Setting</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Day Orders cycle 1-5 on weekdays. Select today's actual Day Order below if it differs (e.g. after a holiday). This will automatically adjust subsequent days.
            </p>
            
            <div className="dayorder-badge-row">
              {dayOrders.map((d) => (
                <button
                  key={d}
                  className={`btn-dayorder ${dayOrder === d && !isWeekend ? 'active' : ''}`}
                  disabled={isWeekend}
                  onClick={() => setTodayDayOrder(d)}
                >
                  Day {d}
                </button>
              ))}
            </div>

            {isWeekend && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                Day Orders are only active on weekdays.
              </span>
            )}
          </div>
          
          {!isWeekend && !isHoliday && (
            <div className="card">
              <h3 className="section-header" style={{ marginBottom: '12px' }}>Day Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total slots today:</span>
                  <span style={{ fontWeight: 600 }}>{slots.filter(s => !s.isBreak).length} periods</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Classes scheduled:</span>
                  <span style={{ fontWeight: 600 }}>
                    {Object.entries(daySchedule).filter(([slotId, subId]) => subId && slots.find(s => s.id === slotId && !s.isBreak)).length} classes
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Marked present:</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                    {Object.values(todayLogs).filter(x => x === 'present').length}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Marked missed:</span>
                  <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>
                    {Object.values(todayLogs).filter(x => x === 'absent').length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
