// --- START OF FILE src/types/reminders.ts ---

export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ReminderCategory = 'personal' | 'work' | 'study' | 'health' | 'travel' | 'meeting' | 'other';
export type ReminderType = 'reminder' | 'task' | 'appointment' | 'event';

export interface ReminderAttachment {
  id: string;
  name: string;
  type: 'link' | 'file'; // Assuming only links for now, as per form
  url: string;
  // createdAt: string; // Optional
}

export interface RecurringPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // e.g., every 2 days, every 1 week
  daysOfWeek?: number[]; // 0 (Sun) - 6 (Sat), for weekly
  dayOfMonth?: number; // 1-31, for monthly/yearly
  monthOfYear?: number; // 1-12, for yearly
  endDate?: string; // ISO string
  // occurrences?: number; // Alternative to endDate
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime?: string;   // ISO string, for duration-based reminders
  isAllDay?: boolean; // For all-day events
  type: ReminderType;
  priority: ReminderPriority;
  category: ReminderCategory; // This will also serve as the "calendar" for filtering
  color?: string; // Custom color for the event, overrides category color
  isCompleted: boolean;
  
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  // recurringInstanceId?: string; // For specific instances of a recurring event if they are modified
  // originalRecurringEventId?: string; // If this is an exception to a recurring series

  linkedTaskId?: string;
  location?: string;
  notes?: string;
  attachments: ReminderAttachment[];
  
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// These might not be directly used in the new Google Calendar style but kept for potential future use
export interface TimeSlot {
  id: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  reminders: Reminder[];
}

export interface DaySchedule {
  date: string; // 'yyyy-MM-dd'
  timeSlots: TimeSlot[];
  totalReminders: number;
  completedReminders: number;
}
// --- END OF FILE src/types/reminders.ts ---