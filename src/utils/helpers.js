// Helper functions for date calculations, day orders, and attendance stats

// Convert time string (HH:MM) to minutes since midnight
export function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Check if a time is within a slot range
export function isTimeInSlot(currentTimeStr, slotStartTime, slotEndTime) {
  if (!slotStartTime || !slotEndTime) return false;
  const current = timeToMinutes(currentTimeStr);
  const start = timeToMinutes(slotStartTime);
  const end = timeToMinutes(slotEndTime);
  return current >= start && current < end;
}

// Calculate the Day Order for a target date (1 to 5)
// Reference Date should be a Monday that is Day 1
export function getDayOrderForDate(targetDateStr, refDateStr = '2026-06-22', refDayOrder = 1, academicCalendar = null) {
  if (academicCalendar && Object.keys(academicCalendar).length > 0) {
    if (academicCalendar[targetDateStr] !== undefined) {
      const val = academicCalendar[targetDateStr];
      if (typeof val === 'object' && val !== null) {
        return val.dayOrder;
      }
      return val;
    }
    const dates = Object.keys(academicCalendar).sort();
    if (dates.length > 0) {
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      if (targetDateStr >= minDate && targetDateStr <= maxDate) {
        return null;
      }
    }
  }
  const targetDate = new Date(targetDateStr);
  const refDate = new Date(refDateStr);
  
  // Set times to midnight
  targetDate.setHours(0,0,0,0);
  refDate.setHours(0,0,0,0);
  
  // If weekend, return null (off)
  const targetDayOfWeek = targetDate.getDay();
  if (targetDayOfWeek === 0 || targetDayOfWeek === 6) {
    return null;
  }
  
  if (targetDate.getTime() === refDate.getTime()) {
    return refDayOrder;
  }
  
  let diffDays = 0;
  const tempDate = new Date(refDate);
  const step = targetDate > refDate ? 1 : -1;
  
  while (tempDate.getTime() !== targetDate.getTime()) {
    tempDate.setDate(tempDate.getDate() + step);
    const dayOfWeek = tempDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      diffDays += step;
    }
  }
  
  let dayOrder = ((refDayOrder - 1 + diffDays) % 5);
  if (dayOrder < 0) dayOrder += 5;
  return dayOrder + 1;
}

// Formats a date into a clean string (e.g. "Sunday, June 28")
export function formatDateClean(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

// Formats date into YYYY-MM-DD
export function formatDateISO(date) {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}

// Calculate attendance stats for all subjects
export function getAttendanceStats(subjects, attendanceLog, targetPercent = 75) {
  const stats = {};
  
  // Initialize
  subjects.forEach(sub => {
    stats[sub.id] = {
      id: sub.id,
      name: sub.name,
      code: sub.code,
      attended: 0,
      missed: 0,
      total: 0,
      percent: 100,
      canBunk: 0,
      mustAttend: 0,
      status: 'green', // green (>=80), yellow (75-80), red (<75)
    };
  });
  
  // Aggregate from log
  Object.values(attendanceLog).forEach(dayLog => {
    Object.entries(dayLog).forEach(([subjectId, status]) => {
      if (stats[subjectId]) {
        if (status === 'present') {
          stats[subjectId].attended += 1;
          stats[subjectId].total += 1;
        } else if (status === 'absent') {
          stats[subjectId].missed += 1;
          stats[subjectId].total += 1;
        }
        // 'off' is ignored in calculation
      }
    });
  });
  
  // Compute final metrics
  Object.keys(stats).forEach(id => {
    const s = stats[id];
    if (s.total > 0) {
      s.percent = Math.round((s.attended / s.total) * 1000) / 10;
    } else {
      s.percent = 100.0; // Default to 100% if no classes taken yet
    }
    
    const P = s.attended;
    const T = s.total;
    const R = targetPercent / 100;
    
    if (s.percent >= targetPercent) {
      // Calculate how many we can safely bunk
      // P / (T + y) >= R => y <= P/R - T
      const maxBunk = Math.floor(P / R - T);
      s.canBunk = Math.max(0, maxBunk);
      s.mustAttend = 0;
    } else {
      // Calculate how many we must attend consecutively
      // (P + x) / (T + x) >= R => x >= (RT - P) / (1 - R)
      const reqAttend = Math.ceil((R * T - P) / (1 - R));
      s.mustAttend = Math.max(0, reqAttend);
      s.canBunk = 0;
    }
    
    // Status color code
    if (s.percent < targetPercent) {
      s.status = 'red';
    } else if (s.percent >= targetPercent && s.percent < 80) {
      s.status = 'yellow';
    } else {
      s.status = 'green';
    }
  });
  
  return stats;
}

// Calculate Overall Attendance Summary
export function getOverallStats(subjectsStats, targetPercent = 75) {
  let totalAttended = 0;
  let totalClasses = 0;
  
  Object.values(subjectsStats).forEach(s => {
    totalAttended += s.attended;
    totalClasses += s.total;
  });
  
  const percent = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 1000) / 10 : 100.0;
  
  let status = 'green';
  if (percent < targetPercent) {
    status = 'red';
  } else if (percent >= targetPercent && percent < 80) {
    status = 'yellow';
  }
  
  return {
    attended: totalAttended,
    total: totalClasses,
    percent,
    status
  };
}

// Fetch any particulars or holiday reason for a date
export function getParticularsForDate(targetDateStr, academicCalendar = null) {
  if (academicCalendar && academicCalendar[targetDateStr] !== undefined) {
    const val = academicCalendar[targetDateStr];
    if (typeof val === 'object' && val !== null) {
      return val.particulars || '';
    }
  }
  return '';
}

