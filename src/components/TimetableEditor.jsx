import React, { useState } from 'react';
import { Edit2, Save, Plus, Trash2, Clock } from 'lucide-react';

export default function TimetableEditor({
  timetable,
  setTimetable,
  slots,
  setSlots,
  subjects,
  currentTime,
  dayOrder,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [newSlotLabel, setNewSlotLabel] = useState('');
  const [newSlotStart, setNewSlotStart] = useState('09:00');
  const [newSlotEnd, setNewSlotEnd] = useState('10:00');

  const days = [1, 2, 3, 4, 5];

  // Check if a slot and day is currently active based on system time and active Day Order
  const isSlotActiveNow = (slot, dayNum) => {
    if (dayOrder !== dayNum) return false;
    const currentHours = String(currentTime.getHours()).padStart(2, '0');
    const currentMinutes = String(currentTime.getMinutes()).padStart(2, '0');
    const currentStr = `${currentHours}:${currentMinutes}`;
    
    const toMins = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    
    const cur = toMins(currentStr);
    const start = toMins(slot.startTime);
    const end = toMins(slot.endTime);
    return cur >= start && cur < end;
  };

  // Update cell subject ID
  const handleCellChange = (day, slotId, subjectId) => {
    const updatedTimetable = { ...timetable };
    if (!updatedTimetable[day]) {
      updatedTimetable[day] = {};
    }
    updatedTimetable[day][slotId] = subjectId;
    setTimetable(updatedTimetable);
  };

  // Add a new period slot
  const handleAddSlot = (e) => {
    e.preventDefault();
    if (!newSlotLabel.trim()) return;

    const newId = `slot-${Date.now()}`;
    const newSlot = {
      id: newId,
      label: newSlotLabel.trim(),
      startTime: newSlotStart,
      endTime: newSlotEnd,
    };

    // Sort slots by start time
    const updatedSlots = [...slots, newSlot].sort((a, b) => {
      const timeA = a.startTime.split(':').map(Number);
      const timeB = b.startTime.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    setSlots(updatedSlots);
    setNewSlotLabel('');
  };

  // Delete a slot
  const handleDeleteSlot = (slotId) => {
    if (window.confirm('Are you sure you want to delete this slot? This will remove all timetable assignments for this slot.')) {
      setSlots(slots.filter(s => s.id !== slotId));
      
      // Clean up timetable assignments
      const updatedTimetable = { ...timetable };
      days.forEach(d => {
        if (updatedTimetable[d]) {
          delete updatedTimetable[d][slotId];
        }
      });
      setTimetable(updatedTimetable);
    }
  };

  return (
    <div className="tab-content timetable-tab">
      <div className="timetable-header">
        <div>
          <h2>Full Schedule Grid</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Configure your classes for Day Orders 1 to 5. Active slots are highlighted based on system time.
          </p>
        </div>
        <button
          className={`btn-edit-mode ${isEditing ? 'editing' : ''}`}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (
            <>
              <Save size={16} />
              <span>Save Changes</span>
            </>
          ) : (
            <>
              <Edit2 size={16} />
              <span>Edit Timetable</span>
            </>
          )}
        </button>
      </div>

      <div className="card" style={{ padding: '4px', overflow: 'hidden' }}>
        <div className="timetable-wrapper">
          <div className="timetable-grid">
            {/* Headers */}
            <div className="grid-cell grid-header-cell">Slot / Day</div>
            {days.map(d => (
              <div key={d} className="grid-cell grid-header-cell">Day {d}</div>
            ))}

            {/* Grid rows by slots */}
            {slots.length === 0 ? (
              <div className="grid-cell" style={{ gridColumn: 'span 6', padding: '40px', color: 'var(--text-muted)' }}>
                No slots configured yet. Click "Edit Timetable" to add class periods.
              </div>
            ) : (
              slots.map(slot => {
                if (slot.isBreak) {
                  return (
                    <React.Fragment key={slot.id}>
                      {/* Slot Time Column */}
                      <div className="grid-cell grid-time-cell" style={{ background: 'rgba(16, 185, 129, 0.04)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-success)', marginBottom: '2px' }}>{slot.label}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'rgba(16, 185, 129, 0.6)', fontSize: '10px' }}>
                          <Clock size={10} />
                          {slot.startTime}-{slot.endTime}
                        </span>
                      </div>
                      {/* Merged Day Columns for BREAK */}
                      <div className="grid-cell timetable-break-grid-cell" style={{ gridColumn: 'span 5', background: 'rgba(16, 185, 129, 0.06)', color: 'var(--color-success)', fontWeight: 700, letterSpacing: '8px', fontSize: '11px', textTransform: 'uppercase', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'default', borderBottom: '1px solid rgba(16, 185, 129, 0.15)' }}>
                        BREAK
                      </div>
                    </React.Fragment>
                  );
                }

                return (
                  <React.Fragment key={slot.id}>
                    {/* Slot Time Column */}
                    <div className="grid-cell grid-time-cell">
                      <span style={{ fontWeight: 600, color: 'white', marginBottom: '2px' }}>{slot.label}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-muted)' }}>
                        <Clock size={10} />
                        {slot.startTime ? `${slot.startTime}-${slot.endTime}` : 'Online'}
                      </span>
                    </div>

                    {/* Day Columns */}
                    {days.map(day => {
                      const subjectId = timetable[day]?.[slot.id] || '';
                      const subject = subjects.find(sub => sub.id === subjectId);
                      const isActive = isSlotActiveNow(slot, day);

                      return (
                        <div
                          key={`${day}-${slot.id}`}
                          className={`grid-cell timetable-cell ${isActive ? 'active-time' : ''}`}
                          style={{
                            borderBottom: isActive ? '1px solid var(--color-primary)' : '',
                            borderRight: isActive ? '1px solid var(--color-primary)' : '',
                            boxShadow: isActive ? 'inset 0 0 10px rgba(99, 102, 241, 0.05)' : ''
                          }}
                        >
                          {isEditing ? (
                            <select
                              className="cell-select"
                              value={subjectId}
                              onChange={(e) => handleCellChange(day, slot.id, e.target.value)}
                            >
                              <option value="">-- Free --</option>
                              {subjects.map(sub => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name} ({sub.code})
                                </option>
                              ))}
                            </select>
                          ) : subject ? (
                            <>
                              <span className="cell-subject-name">{subject.name}</span>
                              <span className="cell-subject-code">{subject.code}</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>
                              Free
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Edit Mode Custom Slot Creator */}
      {isEditing && (
        <div className="card slots-manager">
          <h3 className="section-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            Manage Time Slots
          </h3>
          
          <div className="slots-list">
            {slots.map((slot, index) => (
              <div key={slot.id} className="slot-item-row">
                <span style={{ minWidth: '80px', fontWeight: 600, fontSize: '13px' }}>{slot.label}</span>
                <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>From:</span>
                  <input
                    type="time"
                    className="slot-input"
                    value={slot.startTime}
                    onChange={(e) => {
                      const updated = [...slots];
                      updated[index].startTime = e.target.value;
                      setSlots(updated);
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>To:</span>
                  <input
                    type="time"
                    className="slot-input"
                    value={slot.endTime}
                    onChange={(e) => {
                      const updated = [...slots];
                      updated[index].endTime = e.target.value;
                      setSlots(updated);
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="btn-icon-danger"
                  onClick={() => handleDeleteSlot(slot.id)}
                  title="Delete Slot"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddSlot} className="subject-creator-form" style={{ marginTop: '10px' }}>
            <input
              type="text"
              placeholder="Slot Name (e.g. Period 6)"
              value={newSlotLabel}
              onChange={(e) => setNewSlotLabel(e.target.value)}
              required
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="time"
                value={newSlotStart}
                onChange={(e) => setNewSlotStart(e.target.value)}
                required
              />
              <input
                type="time"
                value={newSlotEnd}
                onChange={(e) => setNewSlotEnd(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '0 20px' }}>
              <Plus size={16} />
              <span>Add Slot</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
