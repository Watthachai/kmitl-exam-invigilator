import { parse } from 'date-fns';

export function normalizeDate(dateStr: string): Date {
  try {
    // Handle Thai Buddhist year (BE)
    if (parseInt(dateStr.split('/')[2]) > 2500) {
      const [day, month, yearBE] = dateStr.split('/');
      const yearCE = parseInt(yearBE) - 543;
      dateStr = `${day}/${month}/${yearCE}`;
    }
    
    // Try different date formats
    const formats = ['d/M/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd'];
    for (const formatStr of formats) {
      try {
        return parse(dateStr, formatStr, new Date());
      } catch (error) {
        continue;
      }
    }
    throw new Error('Invalid date format');
  } catch (error) {
    
    throw new Error(`Invalid date: ${dateStr}`);
  }
}

export function normalizeTime(timeStr: string): string {
  try {
    // Handle different time formats
    timeStr = timeStr.trim().toUpperCase();
    
    // Convert 12-hour format to 24-hour
    if (timeStr.includes('PM') || timeStr.includes('AM')) {
      const [time, meridiem] = timeStr.split(' ');
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours);
      
      if (meridiem === 'PM' && hour !== 12) hour += 12;
      if (meridiem === 'AM' && hour === 12) hour = 0;
      
      return `${hour.toString().padStart(2, '0')}:${minutes}:00`;
    }
    
    // Add seconds if missing
    if (timeStr.split(':').length === 2) {
      timeStr += ':00';
    }
    
    return timeStr;
  } catch (error) {
    throw new Error(`Invalid time: ${timeStr}`);
  }
}