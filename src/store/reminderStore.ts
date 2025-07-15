import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Reminder, ReminderCategory } from '../types/reminders';
import { 
  parseISO, isValid, startOfDay, endOfDay, 
  isBefore, isAfter, isEqual, isWithinInterval,
  isSameDay, addHours, differenceInMinutes,
  differenceInSeconds, differenceInDays,
  differenceInWeeks, format
} from 'date-fns';

export type ViewModeGoogle = 'day' | 'week' | 'month' | 'list';
export type TimelineZoomLevel = 'hour' | 'halfHour' | 'quarterHour';

const allReminderCategories: ReminderCategory[] = ['personal', 'work', 'study', 'health', 'travel', 'meeting', 'other'];

interface ReminderState {
  reminders: Reminder[];
  selectedDate: Date;
  viewMode: ViewModeGoogle;
  timelineZoom: TimelineZoomLevel;
  visibleCategories: ReminderCategory[];
  lastUpdateTime: number;

  // CRUD Operations
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => Reminder;
  updateReminder: (id: string, updates: Partial<Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteReminder: (id: string) => void;
  duplicateReminder: (id: string) => void;
  toggleReminderCompletion: (id: string) => void;
  
  // Timeline Operations
  moveReminder: (id: string, newStartTime: string, newEndTime?: string) => void;
  resizeReminder: (id: string, newStartTime: string, newEndTime?: string) => void;
  
  // Data Retrieval
  getRemindersForDate: (date: Date) => Reminder[];
  getRemindersForDateRange: (start: Date, end: Date) => Reminder[];
  getUpcomingReminders: (hoursAhead?: number) => Reminder[];
  getOverdueReminders: () => Reminder[];
  
  // View Management
  setSelectedDate: (date: Date) => void;
  setViewMode: (mode: ViewModeGoogle) => void;
  setTimelineZoom: (zoom: TimelineZoomLevel) => void;
  toggleCategoryVisibility: (category: ReminderCategory) => void;
  setAllCategoriesVisibility: (visible: boolean) => void;
  
  // Real-time updates
  forceUpdate: () => void;
  getDetailedTimeUntil: (dateString: string) => {
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
    totalSeconds: number;
  };
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      reminders: [],
      selectedDate: new Date(),
      viewMode: 'week', // تغيير الافتراضي إلى الأسبوع
      timelineZoom: 'hour',
      visibleCategories: [...allReminderCategories],
      lastUpdateTime: Date.now(),

      addReminder: (reminderData) => {
        const newReminder: Reminder = {
          ...reminderData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        set((state) => ({
          reminders: [...state.reminders, newReminder],
          lastUpdateTime: Date.now()
        }));
        
        return newReminder;
      },
      
      updateReminder: (id, updates) => set((state) => ({
        reminders: state.reminders.map((r) =>
          r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
        ),
        lastUpdateTime: Date.now()
      })),
      
      deleteReminder: (id) => set((state) => ({
        reminders: state.reminders.filter((r) => r.id !== id),
        lastUpdateTime: Date.now()
      })),

      duplicateReminder: (id) => set((state) => {
        const original = state.reminders.find(r => r.id === id);
        if (!original) return state;
        
        const duplicate: Reminder = {
          ...original,
          id: crypto.randomUUID(),
          title: `${original.title} (نسخة)`,
          startTime: addHours(parseISO(original.startTime), 1).toISOString(),
          endTime: original.endTime ? addHours(parseISO(original.endTime), 1).toISOString() : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        return {
          reminders: [...state.reminders, duplicate],
          lastUpdateTime: Date.now()
        };
      }),

      toggleReminderCompletion: (id) => set((state) => ({
        reminders: state.reminders.map((r) =>
          r.id === id ? { ...r, isCompleted: !r.isCompleted, updatedAt: new Date().toISOString() } : r
        ),
        lastUpdateTime: Date.now()
      })),
      
      moveReminder: (id, newStartTime, newEndTime) => set((state) => ({
        reminders: state.reminders.map((r) =>
          r.id === id 
            ? { 
                ...r, 
                startTime: newStartTime, 
                endTime: newEndTime || r.endTime,
                updatedAt: new Date().toISOString() 
              } 
            : r
        ),
        lastUpdateTime: Date.now()
      })),

      resizeReminder: (id, newStartTime, newEndTime) => set((state) => ({
        reminders: state.reminders.map((r) =>
          r.id === id 
            ? { 
                ...r, 
                startTime: newStartTime || r.startTime, 
                endTime: newEndTime || r.endTime,
                updatedAt: new Date().toISOString() 
              } 
            : r
        ),
        lastUpdateTime: Date.now()
      })),
      
      getRemindersForDate: (date) => {
        const { reminders, visibleCategories } = get();
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        return reminders.filter(reminder => {
          if (!visibleCategories.includes(reminder.category)) return false;
          if (!reminder.startTime || !isValid(parseISO(reminder.startTime))) return false;
          
          const eventStart = parseISO(reminder.startTime);
          const eventEnd = reminder.endTime && isValid(parseISO(reminder.endTime)) 
                           ? parseISO(reminder.endTime) 
                           : eventStart;
          
          return isWithinInterval(eventStart, { start: dayStart, end: dayEnd }) ||
                 isWithinInterval(eventEnd, { start: dayStart, end: dayEnd }) ||
                 (isBefore(eventStart, dayStart) && isAfter(eventEnd, dayEnd));
        }).sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
      },

      getRemindersForDateRange: (startDate, endDate) => {
        const { reminders, visibleCategories } = get();
        const rangeStart = startOfDay(startDate);
        const rangeEnd = endOfDay(endDate);

        return reminders.filter(reminder => {
          if (!visibleCategories.includes(reminder.category)) return false;
          if (!reminder.startTime || !isValid(parseISO(reminder.startTime))) return false;

          const eventStart = parseISO(reminder.startTime);
          const eventEnd = reminder.endTime && isValid(parseISO(reminder.endTime)) 
                           ? parseISO(reminder.endTime) 
                           : eventStart;

          return isWithinInterval(eventStart, { start: rangeStart, end: rangeEnd }) ||
                 isWithinInterval(eventEnd, { start: rangeStart, end: rangeEnd }) ||
                 (isBefore(eventStart, rangeStart) && isAfter(eventEnd, rangeEnd));
        }).sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
      },

      getUpcomingReminders: (hoursAhead = 48) => {
        const { reminders } = get();
        const now = new Date();
        const futureLimit = addHours(now, hoursAhead);
        
        return reminders.filter(reminder => {
          if (!reminder.startTime || !isValid(parseISO(reminder.startTime))) return false;
          if (reminder.isCompleted) return false;
          
          const eventStart = parseISO(reminder.startTime);
          return isAfter(eventStart, now) && isBefore(eventStart, futureLimit);
        }).sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
      },

      getOverdueReminders: () => {
        const { reminders } = get();
        const now = new Date();
        
        return reminders.filter(reminder => {
          if (!reminder.startTime || !isValid(parseISO(reminder.startTime))) return false;
          if (reminder.isCompleted) return false;
          
          const eventStart = parseISO(reminder.startTime);
          return isBefore(eventStart, now);
        }).sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
      },

      getDetailedTimeUntil: (dateString: string) => {
        if (!dateString || !isValid(parseISO(dateString))) {
          return { weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: false, totalSeconds: 0 };
        }
        
        const targetTime = parseISO(dateString);
        const now = new Date();
        const totalSeconds = Math.abs(differenceInSeconds(targetTime, now));
        const isOverdue = isBefore(targetTime, now);
        
        const weeks = Math.floor(totalSeconds / (7 * 24 * 60 * 60));
        const days = Math.floor((totalSeconds % (7 * 24 * 60 * 60)) / (24 * 60 * 60));
        const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
        const seconds = totalSeconds % 60;
        
        return { weeks, days, hours, minutes, seconds, isOverdue, totalSeconds };
      },
            
      setSelectedDate: (date) => set({ selectedDate: date }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setTimelineZoom: (zoom) => set({ timelineZoom: zoom }),
      
      toggleCategoryVisibility: (categoryToToggle) => set((state) => {
        const newVisibleCategories = state.visibleCategories.includes(categoryToToggle)
          ? state.visibleCategories.filter(c => c !== categoryToToggle)
          : [...state.visibleCategories, categoryToToggle];
        return { visibleCategories: newVisibleCategories };
      }),

      setAllCategoriesVisibility: (visible) => set({
        visibleCategories: visible ? [...allReminderCategories] : []
      }),

      forceUpdate: () => set((state) => ({
        lastUpdateTime: Date.now()
      })),
    }),
    {
      name: 'reminders-store',
      partialize: (state) => ({
        reminders: state.reminders,
        viewMode: state.viewMode,
        timelineZoom: state.timelineZoom,
        visibleCategories: state.visibleCategories,
      }),
    }
  )
);