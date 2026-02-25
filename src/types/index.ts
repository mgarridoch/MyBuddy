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
  theme: 'light' | 'dark'; // <--- Nuevo campo
}

// --- DEPORTE ---

export interface Exercise {
  id: number;
  user_id: string;
  name: string;
  video_url?: string;
  last_weight: number;
  tags: string[]; // Array de strings
  notes?: string;
  created_at?: string;
}

export interface Routine {
  id: number;
  user_id: string;
  name: string;
  estimated_time?: number;
  // Opcional: A veces querremos traer la rutina CON sus ejercicios ya cargados
  exercises?: RoutineExercise[]; 
}

export interface RoutineExercise {
  id: number;
  routine_id: number;
  exercise_id: number;
  sets: number;
  reps: string; // "10-12"
  order_index: number;
  // Para mostrar detalles en la lista, unimos con la tabla exercises
  exercise?: Exercise; 
}

export interface Workout {
  id: number;
  routine_title: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
}

export interface WorkoutLog {
  id: number;
  workout_id: number;
  exercise_id: number;
  exercise_name: string;
  weight: number;
  reps: number;
  created_at: string;
}