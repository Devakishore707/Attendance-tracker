import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TodaySchedule from './components/TodaySchedule';
import TimetableEditor from './components/TimetableEditor';
import AttendanceCalendar from './components/AttendanceCalendar';
import SubjectAnalytics from './components/SubjectAnalytics';
import { getDayOrderForDate, formatDateClean, formatDateISO, getAttendanceStats, getOverallStats } from './utils/helpers';
import { supabase } from './utils/supabase';
import './App.css';

// Initial Mock/Default Data
const defaultSubjects = [
  { id: 'subj-1', name: 'Computer Networks', code: 'CS301' },
  { id: 'subj-2', name: 'Database Management Systems', code: 'CS302' },
  { id: 'subj-3', name: 'Software Engineering', code: 'CS303' },
  { id: 'subj-4', name: 'Artificial Intelligence', code: 'CS304' },
  { id: 'subj-5', name: 'Web Development Lab', code: 'CS305' },
];

const defaultSlots = [
  { id: 'slot-1', startTime: '09:00', endTime: '10:00', label: 'Period 1' },
  { id: 'slot-2', startTime: '10:00', endTime: '11:00', label: 'Period 2' },
  { id: 'slot-3', startTime: '11:00', endTime: '12:00', label: 'Period 3' },
  { id: 'slot-4', startTime: '13:00', endTime: '14:00', label: 'Period 4' },
  { id: 'slot-5', startTime: '14:00', endTime: '15:00', label: 'Period 5' },
];

const defaultTimetable = {
  1: { 'slot-1': 'subj-1', 'slot-2': 'subj-2', 'slot-3': 'subj-3', 'slot-4': 'subj-4', 'slot-5': 'subj-5' },
  2: { 'slot-1': 'subj-2', 'slot-2': 'subj-4', 'slot-3': 'subj-1', 'slot-4': 'subj-5', 'slot-5': 'subj-3' },
  3: { 'slot-1': 'subj-3', 'slot-2': 'subj-5', 'slot-3': 'subj-2', 'slot-4': 'subj-1', 'slot-5': 'subj-4' },
  4: { 'slot-1': 'subj-4', 'slot-2': 'subj-1', 'slot-3': 'subj-3', 'slot-4': 'subj-2', 'slot-5': 'subj-5' },
  5: { 'slot-1': 'subj-5', 'slot-2': 'subj-3', 'slot-3': 'subj-4', 'slot-4': 'subj-2', 'slot-5': 'subj-1' },
};

const defaultAttendanceLog = {
  '2026-06-22': { 'slot-1': 'present', 'slot-2': 'present', 'slot-3': 'present', 'slot-4': 'absent', 'slot-5': 'present' },
  '2026-06-23': { 'slot-1': 'present', 'slot-2': 'present', 'slot-3': 'present', 'slot-4': 'present', 'slot-5': 'present' },
  '2026-06-24': { 'slot-1': 'absent', 'slot-2': 'present', 'slot-3': 'present', 'slot-4': 'present', 'slot-5': 'absent' },
  '2026-06-25': { 'slot-1': 'present', 'slot-2': 'present', 'slot-3': 'present', 'slot-4': 'present', 'slot-5': 'present' },
  '2026-06-26': { 'slot-1': 'present', 'slot-2': 'absent', 'slot-3': 'present', 'slot-4': 'off', 'slot-5': 'present' },
};

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState('today');

  // Syncing state
  const [syncStatus, setSyncStatus] = useState('loading'); // 'loading', 'synced', 'syncing', 'error'
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  // Core States (initially fallback to localStorage or default mock data)
  const [subjects, setSubjects] = useState(() => {
    const local = localStorage.getItem('presenly_subjects');
    return local ? JSON.parse(local) : defaultSubjects;
  });

  const [slots, setSlots] = useState(() => {
    const local = localStorage.getItem('presenly_slots');
    return local ? JSON.parse(local) : defaultSlots;
  });

  const [timetable, setTimetable] = useState(() => {
    const local = localStorage.getItem('presenly_timetable');
    return local ? JSON.parse(local) : defaultTimetable;
  });

  const [attendanceLog, setAttendanceLog] = useState(() => {
    const local = localStorage.getItem('presenly_attendanceLog');
    return local ? JSON.parse(local) : defaultAttendanceLog;
  });

  // Reference Date for Day Order calculations (Monday as Day 1 by default)
  const [referenceDate, setReferenceDate] = useState(() => {
    return localStorage.getItem('presenly_refDate') || '2026-06-22';
  });

  const [referenceDayOrder, setReferenceDayOrder] = useState(() => {
    return Number(localStorage.getItem('presenly_refDayOrder')) || 1;
  });

  // Ticking Time State
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Initial Load from Supabase
  useEffect(() => {
    async function loadCloudData() {
      if (!supabase) {
        setSyncStatus('error');
        setIsInitialLoadDone(true);
        return;
      }
      setSyncStatus('loading');
      try {
        const { data, error } = await supabase
          .from('attendance_data')
          .select('payload')
          .eq('data_key', 'presenly_data')
          .maybeSingle();

        if (error) throw error;

        if (data && data.payload) {
          const p = data.payload;
          if (p.subjects) setSubjects(p.subjects);
          if (p.slots) setSlots(p.slots);
          if (p.timetable) setTimetable(p.timetable);
          if (p.attendanceLog) setAttendanceLog(p.attendanceLog);
          if (p.referenceDate) setReferenceDate(p.referenceDate);
          if (p.referenceDayOrder) setReferenceDayOrder(p.referenceDayOrder);
        } else {
          // No cloud data yet, initialize it with current state
          const initialPayload = {
            subjects,
            slots,
            timetable,
            attendanceLog,
            referenceDate,
            referenceDayOrder,
          };
          const { error: upsertError } = await supabase
            .from('attendance_data')
            .upsert({ data_key: 'presenly_data', payload: initialPayload });
          
          if (upsertError) throw upsertError;
        }
        setSyncStatus('synced');
      } catch (err) {
        console.error('Error connecting to Supabase:', err);
        setSyncStatus('error');
      } finally {
        setIsInitialLoadDone(true);
      }
    }
    loadCloudData();
  }, []);

  // 2. LocalStorage Syncing
  useEffect(() => {
    localStorage.setItem('presenly_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('presenly_slots', JSON.stringify(slots));
  }, [slots]);

  useEffect(() => {
    localStorage.setItem('presenly_timetable', JSON.stringify(timetable));
  }, [timetable]);

  useEffect(() => {
    localStorage.setItem('presenly_attendanceLog', JSON.stringify(attendanceLog));
  }, [attendanceLog]);

  useEffect(() => {
    localStorage.setItem('presenly_refDate', referenceDate);
    localStorage.setItem('presenly_refDayOrder', String(referenceDayOrder));
  }, [referenceDate, referenceDayOrder]);

  // 3. Debounced Supabase Syncing
  useEffect(() => {
    if (!isInitialLoadDone) return;

    setSyncStatus('syncing');
    const timer = setTimeout(async () => {
      try {
        if (!supabase) throw new Error('No Supabase connection');
        const payload = {
          subjects,
          slots,
          timetable,
          attendanceLog,
          referenceDate,
          referenceDayOrder,
        };
        const { error } = await supabase
          .from('attendance_data')
          .upsert({ data_key: 'presenly_data', payload, updated_at: new Date().toISOString() });

        if (error) throw error;
        setSyncStatus('synced');
      } catch (err) {
        console.error('Cloud Sync failed:', err);
        setSyncStatus('error');
      }
    }, 1500); // 1.5s debounce

    return () => clearTimeout(timer);
  }, [subjects, slots, timetable, attendanceLog, referenceDate, referenceDayOrder, isInitialLoadDone]);

  // 4. Force Reset All Data
  const resetAllData = async () => {
    if (window.confirm('WARNING: This will permanently delete all attendance logs, custom timetables, and subjects from both local storage and the cloud. Are you sure you want to proceed?')) {
      setSyncStatus('syncing');
      localStorage.clear();
      setSubjects(defaultSubjects);
      setSlots(defaultSlots);
      setTimetable(defaultTimetable);
      setAttendanceLog({});
      setReferenceDate('2026-06-22');
      setReferenceDayOrder(1);

      try {
        if (supabase) {
          const defaultPayload = {
            subjects: defaultSubjects,
            slots: defaultSlots,
            timetable: defaultTimetable,
            attendanceLog: {},
            referenceDate: '2026-06-22',
            referenceDayOrder: 1,
          };
          const { error } = await supabase
            .from('attendance_data')
            .upsert({ data_key: 'presenly_data', payload: defaultPayload });
          if (error) throw error;
        }
        setSyncStatus('synced');
        alert('All attendance records and configurations have been successfully reset.');
      } catch (err) {
        console.error('Failed to reset cloud database:', err);
        setSyncStatus('error');
        alert('Local data reset, but failed to sync reset to cloud.');
      }
    }
  };

  // Determine current day order
  const todayISO = formatDateISO(currentDate);
  const currentDayOrder = getDayOrderForDate(todayISO, referenceDate, referenceDayOrder);

  // Set manual day order for today (shifts reference point)
  const setTodayDayOrder = (d) => {
    setReferenceDate(todayISO);
    setReferenceDayOrder(d);
  };

  // Mark attendance log entry
  const markAttendance = (dateStr, slotId, subjectId, status) => {
    setAttendanceLog((prevLog) => {
      const updatedLog = { ...prevLog };
      
      if (!updatedLog[dateStr]) {
        updatedLog[dateStr] = {};
      }
      
      if (status === null) {
        // Clear/delete specific slot log
        delete updatedLog[dateStr][slotId];
      } else {
        // Log status
        updatedLog[dateStr][slotId] = status;
      }
      
      // Clean up empty date entries
      if (Object.keys(updatedLog[dateStr]).length === 0) {
        delete updatedLog[dateStr];
      }
      
      return updatedLog;
    });
  };

  // Calculate stats for current dashboard headers
  const subjectsStats = getAttendanceStats(subjects, attendanceLog, 75);
  const overallStats = getOverallStats(subjectsStats, 75);

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Panel */}
      <main className="main-content">
        {/* Dashboard Header */}
        <header className="dashboard-header">
          <div className="dashboard-title">
            <h1 style={{ color: 'white' }}>Presenly Dashboard</h1>
            <p>
              {currentTab === 'today' && "Today's classes, live schedules, and quick logs."}
              {currentTab === 'timetable' && "Overview and schedule assignments."}
              {currentTab === 'calendar' && "Retroactive logging and calendar overview."}
              {currentTab === 'subjects' && "Performance metrics and attend/bunk counselor."}
            </p>
          </div>

          <div className="time-widget">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div className="clock">
                {currentDate.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              
              <div className={`sync-badge ${syncStatus}`} title="Supabase Database Connection Status">
                <span className="dot"></span>
                <span>
                  {syncStatus === 'synced' && 'Cloud Active'}
                  {syncStatus === 'syncing' && 'Syncing...'}
                  {syncStatus === 'loading' && 'Connecting...'}
                  {syncStatus === 'error' && 'Local Mode'}
                </span>
              </div>
            </div>
            
            <div className="date-info">
              {formatDateClean(currentDate)}
              {currentDayOrder ? ` • Day Order ${currentDayOrder}` : ' • Weekend'}
            </div>
          </div>
        </header>

        {/* Tab Routing content */}
        {currentTab === 'today' && (
          <TodaySchedule
            currentTime={currentDate}
            currentDate={currentDate}
            dayOrder={currentDayOrder || 1} // defaults to Day 1 if weekend or null
            setTodayDayOrder={setTodayDayOrder}
            slots={slots}
            timetable={timetable}
            subjects={subjects}
            attendanceLog={attendanceLog}
            markAttendance={markAttendance}
          />
        )}

        {currentTab === 'timetable' && (
          <TimetableEditor
            timetable={timetable}
            setTimetable={setTimetable}
            slots={slots}
            setSlots={setSlots}
            subjects={subjects}
            currentTime={currentDate}
            dayOrder={currentDayOrder || 1}
          />
        )}

        {currentTab === 'calendar' && (
          <AttendanceCalendar
            attendanceLog={attendanceLog}
            markAttendance={markAttendance}
            slots={slots}
            timetable={timetable}
            subjects={subjects}
            currentDate={currentDate}
          />
        )}

        {currentTab === 'subjects' && (
          <SubjectAnalytics
            subjects={subjects}
            setSubjects={setSubjects}
            attendanceLog={attendanceLog}
            setAttendanceLog={setAttendanceLog}
            timetable={timetable}
            setTimetable={setTimetable}
            resetAllData={resetAllData}
          />
        )}
      </main>
    </div>
  );
}
