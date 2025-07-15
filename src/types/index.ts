// File: src/types/index.ts

export interface PrayerTime {
  name: string;
  time: string;
  completed: boolean;
}

export interface QuranProgress {
  page: number;
  date: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskCategory = 'personal' | 'work' | 'study' | 'health' | 'other';

export interface TaskAttachment {
  id: string;
  name: string;
  type: 'link' | 'file';
  url: string;
  createdAt: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  parentId: string;
  url?: string; 
  urlAlias?: string; 
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  dueDate?: string;
  priority: TaskPriority;
  category: TaskCategory;
  attachments: TaskAttachment[];
  color?: string;
  subtasks?: SubTask[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface FocusSession {
  id: string;
  duration: number;
  startTime: string;
  endTime: string;
  completed: boolean;
}