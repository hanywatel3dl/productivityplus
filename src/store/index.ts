// File: src/store/index.ts
// Ensure this is how useStore is defined and exported

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FocusSession, Task, Note, TaskPriority, TaskCategory, TaskAttachment, SubTask } from '../types';
import { startOfDay, startOfWeek, startOfMonth, isWithinInterval, format, parseISO } from 'date-fns'; // Added format, parseISO
import { useHabitStore } from './habitStore';

// Interface AppState (as defined previously, including all properties)
interface AppState {
  calendar: Array<{ 
    date: string; 
    completed: boolean;
    prayers: number;
    tasks: number;
    quranPages: number[];
  }>;
  markDayCompleted: (date: string, completed: boolean) => void;
  getDayStats: (date: string) => {
    prayers: number;
    tasks: number;
    quranPages: number[];
    completed: boolean;
  };

  prayers: Array<{ name: string; date: string; completed: boolean }>;
  setPrayerCompleted: (name: string, completed: boolean, islamicDay?: string) => void;
  resetDailyPrayers: () => void;

  quranProgress: Array<{ page: number; date: string }>;
  markPageCompleted: (page: number, completed: boolean) => void;
  getCompletedPagesForDate: (date: string) => number[];

  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (tasks: Task[]) => void;
  addTaskAttachment: (taskId: string, attachment: TaskAttachment) => void;
  removeTaskAttachment: (taskId: string, attachmentId: string) => void;
  getTasksForDate: (date: string) => Task[];
  toggleSubTask: (parentId: string, subTaskId: string) => void;

  notes: Note[];
  currentNote: Note | null;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  setCurrentNote: (note: Note | null) => void;
  getNotesForDate: (date: string) => Note[];

  focusSessions: FocusSession[];
  addFocusSession: (session: FocusSession) => void;
  getFocusStats: () => {
    today: { sessions: number; minutes: number };
    week: { sessions: number; minutes: number };
    month: { sessions: number; minutes: number };
    total: { sessions: number; minutes: number };
    distribution: { [key: number]: number };
    averageMinutesPerSession: number;
  };
  getIntegratedStats: (date: string) => {
    habits: { completed: number; total: number; rate: number; };
    prayers: { completed: number; total: number; rate: number; };
    quran: { pages: number; target: number; rate: number; };
    tasks: { completed: number; total: number; rate: number; };
    pomodoro: { sessions: number; minutes: number; averagePerSession: number; };
  };
}


export const useStore = create<AppState>()( // Correct export
  persist(
    (set, get) => ({
      calendar: [],
      markDayCompleted: (date, completed) => {
        const { prayers, tasks, quranProgress } = get();
        const todaysPrayers = prayers.filter(p => p.date === date && p.completed).length;
        const todaysTasks = tasks.filter(task => {
          const taskDate = task.createdAt.split('T')[0]; // Assuming createdAt determines the "day" for this stat
          return taskDate === date && task.completed;
        }).length;
        const todaysQuranPages = quranProgress
          .filter(p => p.date === date)
          .map(p => p.page);

        set((state) => ({
          calendar: [
            ...state.calendar.filter((d) => d.date !== date),
            { 
              date, 
              completed,
              prayers: todaysPrayers,
              tasks: todaysTasks,
              quranPages: todaysQuranPages
            },
          ],
        }));
      },
      getDayStats: (date) => {
        const state = get();
        const dayRecord = state.calendar.find(d => d.date === date);
        return {
          prayers: dayRecord?.prayers || 0,
          tasks: dayRecord?.tasks || 0,
          quranPages: dayRecord?.quranPages || [],
          completed: dayRecord?.completed || false
        };
      },
      prayers: [],
      setPrayerCompleted: (name, completed, islamicDay) => {
        const dayToUse = islamicDay || new Date().toISOString().split('T')[0];
        set((state) => ({
          prayers: [
            ...state.prayers.filter(p => !(p.name === name && p.date === dayToUse)),
            { name, date: dayToUse, completed },
          ],
        }));
      },
      resetDailyPrayers: () => {
        const today = new Date().toISOString().split('T')[0];
        set((state) => ({
          prayers: state.prayers.filter(p => p.date !== today),
        }));
      },
      quranProgress: [],
      markPageCompleted: (page, completed) => {
        const today = new Date().toISOString().split('T')[0];
        set((state) => {
          if (completed) {
            return {
              quranProgress: [...state.quranProgress.filter(p => !(p.page === page && p.date === today)), { page, date: today }]
            };
          } else {
            return {
              quranProgress: state.quranProgress.filter(p => !(p.page === page && p.date === today))
            };
          }
        });
      },
      getCompletedPagesForDate: (date) => {
        const { quranProgress } = get();
        return quranProgress
          .filter(p => p.date === date)
          .map(p => p.page);
      },
      tasks: [],
      addTask: (task) => set((state) => ({ 
        tasks: [...state.tasks, { ...task, subtasks: task.subtasks || [] }] 
      })),
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, ...updates, subtasks: updates.subtasks || task.subtasks || [] } : task
        ),
      })),
      toggleTask: (id) => set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, completed: !task.completed } : task
        ),
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
      })),
      reorderTasks: (newTasksOrder) => set({ tasks: newTasksOrder }),
      addTaskAttachment: (taskId, attachment) => set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId 
            ? { ...task, attachments: [...task.attachments, attachment] } 
            : task
        ),
      })),
      removeTaskAttachment: (taskId, attachmentId) => set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId 
            ? { ...task, attachments: task.attachments.filter(a => a.id !== attachmentId) } 
            : task
        ),
      })),
      getTasksForDate: (date) => { // date is 'yyyy-MM-dd'
        const { tasks } = get();
        return tasks.filter(task => {
          if (task.dueDate) {
            // Compare only the date part, assuming dueDate is also 'yyyy-MM-dd' or ISO string
            return task.dueDate.startsWith(date);
          }
          return false; // Or handle tasks without dueDate differently if needed
        }).sort((a, b) => {
          const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          
          const colorOrder: Record<string, number> = { 
            red: 0, amber: 1, green: 2, blue: 3, purple: 4, 
            pink: 5, indigo: 6, teal: 7, '': 8 
          };
          return (colorOrder[a.color || ''] ?? 8) - (colorOrder[b.color || ''] ?? 8);
        });
      },
      toggleSubTask: (parentId, subTaskId) => set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === parentId
            ? {
                ...task,
                subtasks: (task.subtasks || []).map((sub) =>
                  sub.id === subTaskId ? { ...sub, completed: !sub.completed } : sub
                ),
              }
            : task
        ),
      })),
      notes: [],
      currentNote: null,
      addNote: (note) => set((state) => ({
        notes: [...state.notes, note],
        currentNote: null,
      })),
      updateNote: (id, updates) => set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id
            ? { ...note, ...updates, updatedAt: new Date().toISOString() }
            : note
        ),
        currentNote: state.currentNote?.id === id ? { ...state.currentNote, ...updates, updatedAt: new Date().toISOString() } : state.currentNote,
      })),
      deleteNote: (id) => set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
        currentNote: state.currentNote?.id === id ? null : state.currentNote,
      })),
      setCurrentNote: (note) => set({ currentNote: note }),
      getNotesForDate: (date) => {
        const { notes } = get();
        // Assuming note titles might contain dates, or you have a different logic for associating notes with dates
        return notes.filter(note => note.createdAt.startsWith(date)); // Example: notes created on that date
      },
      focusSessions: [],
      addFocusSession: (session) => set((state) => ({
        focusSessions: [...state.focusSessions, session],
      })),
      getFocusStats: () => {
        const { focusSessions } = get();
        const now = new Date();
        const todayStart = startOfDay(now);
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Assuming Monday is start of week
        const monthStart = startOfMonth(now);

        const getStatsForPeriod = (start: Date, end: Date) => {
          const periodSessions = focusSessions.filter((s) =>
            isWithinInterval(parseISO(s.startTime), { start, end }) && s.completed
          );
          return {
            sessions: periodSessions.length,
            minutes: periodSessions.reduce((acc, s) => acc + s.duration, 0),
          };
        };
        
        const distribution = focusSessions.reduce((acc, session) => {
            if(session.completed) {
                 acc[session.duration] = (acc[session.duration] || 0) + 1;
            }
            return acc;
        }, {} as { [key: number]: number });

        const completedSessions = focusSessions.filter(s => s.completed);
        const totalMinutes = completedSessions.reduce((acc, s) => acc + s.duration, 0);
        const averageMinutesPerSession = completedSessions.length
          ? Math.round(totalMinutes / completedSessions.length)
          : 0;

        return {
          today: getStatsForPeriod(todayStart, now),
          week: getStatsForPeriod(weekStart, now),
          month: getStatsForPeriod(monthStart, now),
          total: {
            sessions: completedSessions.length,
            minutes: totalMinutes,
          },
          distribution,
          averageMinutesPerSession,
        };
      },
      getIntegratedStats: (date: string) => { // date is 'yyyy-MM-dd'
        const state = get();
        const { habits, habitLogs } = useHabitStore.getState();
        const targetDateObj = parseISO(date);

        const activeHabitsForDay = habits.filter(habit => {
            if (habit.archivedAt || isBefore(targetDateObj, parseISO(habit.startDate))) {
                return false;
            }
            if (habit.frequency.type === 'daily') return true;
            if (habit.frequency.type === 'weekly') return habit.frequency.days.includes(targetDateObj.getDay());
            // Add monthly if needed
            return false;
        });
        
        const completedHabitsForDay = habitLogs.filter(log => 
            log.date === date && 
            log.completed &&
            activeHabitsForDay.some(h => h.id === log.habitId)
        ).length;

        const prayersForDay = state.prayers.filter(p => p.date === date);
        const completedPrayers = prayersForDay.filter(p => p.completed).length;
        
        const quranPagesForDay = state.quranProgress.filter(p => p.date === date).length;
        
        const tasksDueOnDate = state.tasks.filter(task => task.dueDate && task.dueDate.startsWith(date));
        const completedTasksOnDate = tasksDueOnDate.filter(t => t.completed).length;
        
        const pomodoroSessionsOnDate = state.focusSessions.filter(session => 
            session.startTime.startsWith(date) && session.completed
        );
        const totalPomodoroMinutes = pomodoroSessionsOnDate.reduce((acc, session) => acc + session.duration, 0);
        
        return {
          habits: {
            completed: completedHabitsForDay,
            total: activeHabitsForDay.length,
            rate: activeHabitsForDay.length > 0 ? (completedHabitsForDay / activeHabitsForDay.length) * 100 : 0,
          },
          prayers: {
            completed: completedPrayers,
            total: 5, 
            rate: (completedPrayers / 5) * 100,
          },
          quran: {
            pages: quranPagesForDay,
            target: 20, // Example target
            rate: quranPagesForDay >= 20 ? 100 : (quranPagesForDay / 20) * 100,
          },
          tasks: {
            completed: completedTasksOnDate,
            total: tasksDueOnDate.length,
            rate: tasksDueOnDate.length > 0 ? (completedTasksOnDate / tasksDueOnDate.length) * 100 : 0,
          },
          pomodoro: {
            sessions: pomodoroSessionsOnDate.length,
            minutes: totalPomodoroMinutes,
            averagePerSession: pomodoroSessionsOnDate.length > 0 ? Math.round(totalPomodoroMinutes / pomodoroSessionsOnDate.length) : 0,
          },
        };
      },
    }),
    {
      name: 'productivity-plus-storage',
      // partialize: (state) => ({ tasks: state.tasks, ... }) // if you want to persist only specific parts
    }
  )
);