export interface Habit {
  id: number;
  user_id: string;
  name: string;
  frequency: number[]; // Array de días [1, 2, 3...]
  color?: string;
  created_at?: string;
}

export interface HabitLog {
  id: number;
  habit_id: number;
  date: string; // Formato YYYY-MM-DD
  completed: boolean;
}

export interface Task {
  id: number;
  user_id: string;
  title: string;
  date: string;
  completed: boolean;
  created_at: string;
}

export interface DayNote {
  id: number;
  user_id: string;
  date: string;
  content: string;
}

export interface CalendarConfig {
  google_id: string;
  name: string;
  color: string;
  is_visible: boolean;
}

export interface AppSettings {
  show_stats: boolean;
  show_calendar: boolean;
  show_sports: boolean;
}