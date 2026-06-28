import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TodaySchedule from './components/TodaySchedule';
import TimetableEditor from './components/TimetableEditor';
import AttendanceCalendar from './components/AttendanceCalendar';
import SubjectAnalytics from './components/SubjectAnalytics';
import { getDayOrderForDate, formatDateClean, formatDateISO, getAttendanceStats, getOverallStats } from './utils/helpers';
import { supabase } from './utils/supabase';
import { defaultAcademicCalendar } from './utils/academicCalendar';
import './App.css';

// Initial default data from your SRM FSH timetable scan
const defaultSubjects = [
  { id: "python-theory", name: "Python Theory", code: "PYTHON-TH", group: "Python" },
  { id: "python-lab", name: "Python Lab", code: "PYTHON-LAB", group: "Python" },
  { id: "dbms-theory", name: "DBMS Theory", code: "DBMS-TH", group: "DBMS" },
  { id: "dbms-lab", name: "DBMS Lab", code: "DBMS-LAB", group: "DBMS" },
  { id: "dl-theory", name: "DL Theory", code: "DL-TH", group: "DL Theory" },
  { id: "mdc", name: "MDC", code: "MDC", group: "MDC" },
  { id: "minor-elec", name: "Minor Elective", code: "MINOR-ELEC", group: "Minor Elective" }
];

const defaultSlots = [
  { id: 'slot-1', startTime: '12:35', endTime: '13:25', label: 'Session I' },
  { id: 'slot-2', startTime: '13:25', endTime: '14:15', label: 'Session II' },
  { id: 'slot-3', startTime: '14:15', endTime: '15:05', label: 'Session III' },
  { id: 'break-slot', startTime: '15:05', endTime: '15:20', label: 'BREAK', isBreak: true },
  { id: 'slot-4', startTime: '15:20', endTime: '16:05', label: 'Session IV' },
  { id: 'slot-5', startTime: '16:05', endTime: '16:50', label: 'Session V' },
  { id: 'slot-6', startTime: '', endTime: '', label: 'Online Hour', isOnline: true }
];

const defaultTimetable = {
  "1": {
    "slot-1": "python-theory",
    "slot-2": "dl-theory",
    "slot-3": "mdc",
    "slot-4": "dbms-lab"
  },
  "2": {
    "slot-1": "python-lab",
    "slot-2": "python-theory",
    "slot-3": "dl-theory",
    "slot-4": "minor-elec",
    "slot-5": "minor-elec"
  },
  "3": {
    "slot-1": "dbms-theory",
    "slot-2": "python-theory",
    "slot-3": "mdc",
    "slot-4": "dl-theory",
    "slot-6": "minor-elec"
  },
  "4": {
    "slot-1": "python-lab",
    "slot-2": "python-lab",
    "slot-3": "dbms-theory",
    "slot-4": "minor-elec",
    "slot-5": "minor-elec",
    "slot-6": "mdc"
  },
  "5": {
    "slot-1": "dbms-theory",
    "slot-2": "dl-theory",
    "slot-3": "mdc",
    "slot-4": "dbms-lab",
    "slot-5": "dbms-lab",
    "slot-6": "minor-elec"
  }
};

const defaultAttendanceLog = {};

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState('today');

  // Syncing state
  const [syncStatus, setSyncStatus] = useState('loading'); // 'loading', 'synced', 'syncing', 'error'
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [lastCloudUpdate, setLastCloudUpdate] = useState(null);

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

  const [academicCalendar, setAcademicCalendar] = useState(() => {
    const local = localStorage.getItem('presenly_academicCalendar');
    return local ? JSON.parse(local) : defaultAcademicCalendar;
  });

  // Reference Date for Day Order calculations (Monday as Day 1 by default)
  const [referenceDate, setReferenceDate] = useState(() => {
    return localStorage.getItem('presenly_refDate') || '2026-06-24';
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
          .select('payload, updated_at')
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
          if (p.academicCalendar) setAcademicCalendar(p.academicCalendar);
          setLastCloudUpdate(data.updated_at);
        } else {
          // No cloud data yet, initialize it with current state
          const initialPayload = {
            subjects,
            slots,
            timetable,
            attendanceLog,
            referenceDate,
            referenceDayOrder,
            academicCalendar,
          };
          const { error: upsertError } = await supabase
            .from('attendance_data')
            .upsert({ data_key: 'presenly_data', payload: initialPayload }, { onConflict: 'data_key' });
          
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

  useEffect(() => {
    localStorage.setItem('presenly_academicCalendar', JSON.stringify(academicCalendar));
  }, [academicCalendar]);

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
          academicCalendar,
        };
        const { error, data } = await supabase
          .from('attendance_data')
          .upsert({ data_key: 'presenly_data', payload, updated_at: new Date().toISOString() }, { onConflict: 'data_key' })
          .select('updated_at')
          .single();

        if (error) throw error;
        if (data && data.updated_at) {
          setLastCloudUpdate(data.updated_at);
        }
        setSyncStatus('synced');
      } catch (err) {
        console.error('Cloud Sync failed:', err);
        setSyncStatus('error');
      }
    }, 1500); // 1.5s debounce

    return () => clearTimeout(timer);
  }, [subjects, slots, timetable, attendanceLog, referenceDate, referenceDayOrder, academicCalendar, isInitialLoadDone]);

  // 4. Live Real-time 15-second Polling
  useEffect(() => {
    if (!isInitialLoadDone || !supabase) return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('attendance_data')
          .select('payload, updated_at')
          .eq('data_key', 'presenly_data')
          .maybeSingle();

        if (error) throw error;

        if (data && data.updated_at && data.updated_at !== lastCloudUpdate) {
          console.log('Realtime Poll: New cloud data found, updating state.');
          const p = data.payload;
          if (p.subjects) setSubjects(p.subjects);
          if (p.slots) setSlots(p.slots);
          if (p.timetable) setTimetable(p.timetable);
          if (p.attendanceLog) setAttendanceLog(p.attendanceLog);
          if (p.referenceDate) setReferenceDate(p.referenceDate);
          if (p.referenceDayOrder) setReferenceDayOrder(p.referenceDayOrder);
          if (p.academicCalendar) setAcademicCalendar(p.academicCalendar);
          setLastCloudUpdate(data.updated_at);
          setSyncStatus('synced');
        }
      } catch (err) {
        console.warn('Realtime Poll failed to fetch:', err);
      }
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [lastCloudUpdate, isInitialLoadDone]);

  // 4. Force Reset All Data
  const resetAllData = async () => {
    if (window.confirm('WARNING: This will permanently delete all attendance logs, custom timetables, and subjects from both local storage and the cloud. Are you sure you want to proceed?')) {
      setSyncStatus('syncing');
      localStorage.clear();
      setSubjects(defaultSubjects);
      setSlots(defaultSlots);
      setTimetable(defaultTimetable);
      setAttendanceLog({});
      setReferenceDate('2026-06-24');
      setReferenceDayOrder(1);
      setAcademicCalendar(defaultAcademicCalendar);

      try {
        if (supabase) {
          const defaultPayload = {
            subjects: defaultSubjects,
            slots: defaultSlots,
            timetable: defaultTimetable,
            attendanceLog: {},
            referenceDate: '2026-06-24',
            referenceDayOrder: 1,
            academicCalendar: defaultAcademicCalendar,
          };
          const { error } = await supabase
            .from('attendance_data')
            .upsert({ data_key: 'presenly_data', payload: defaultPayload }, { onConflict: 'data_key' });
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
  const currentDayOrder = getDayOrderForDate(todayISO, referenceDate, referenceDayOrder, academicCalendar);

  // Set manual day order for today (shifts reference point)
  const setTodayDayOrder = (d) => {
    setAcademicCalendar(prev => {
      const updated = { ...prev };
      if (updated[todayISO] && typeof updated[todayISO] === 'object') {
        updated[todayISO] = { ...updated[todayISO], dayOrder: d };
      } else {
        updated[todayISO] = { dayOrder: d, particulars: 'Manual Override' };
      }
      return updated;
    });
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
          <div className="dashboard-title-row">
            <div className="dashboard-title">
              <h1 style={{ color: 'white' }}>Presenly Dashboard</h1>
              <p>
                {currentTab === 'today' && "Today's classes, live schedules, and quick logs."}
                {currentTab === 'timetable' && "Overview and schedule assignments."}
                {currentTab === 'calendar' && "Retroactive logging and calendar overview."}
                {currentTab === 'subjects' && "Performance metrics and attend/bunk counselor."}
              </p>
            </div>
            
            <div className="header-profile-badge">
              <div className="avatar">DS</div>
              <div className="details">
                <span className="name">Devakishore S</span>
                <span className="reg">RA2531243010075</span>
              </div>
            </div>
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
            dayOrder={currentDayOrder}
            setTodayDayOrder={setTodayDayOrder}
            slots={slots}
            timetable={timetable}
            subjects={subjects}
            attendanceLog={attendanceLog}
            markAttendance={markAttendance}
            academicCalendar={academicCalendar}
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
            academicCalendar={academicCalendar}
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
