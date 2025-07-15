// src/types/habits.ts

export interface HabitLink {
  id: string;
  name: string;
  url: string;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  frequency: {
    type: 'daily' | 'weekly' | 'monthly';
    days: number[]; // 0-6 for weekly, 1-31 for monthly
  };
  reminderTime?: string;
  reminders?: { time: string; active: boolean }[];
  createdAt: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  archivedAt?: string;
  links?: HabitLink[]; // إضافة الروابط

  // حقول الـ Streak
  currentStreak: number;
  bestStreak: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  notes?: string;
  createdAt: string;
}

export interface HabitStreak {
  current: number;
  longest: number;
  lastCompleted?: string;
}

export interface HabitStats {
  completionRate: number;
  totalCompletions: number;
  streak: HabitStreak;
  weeklyProgress: {
    completed: number;
    total: number;
    previousWeek: number;
  };
}