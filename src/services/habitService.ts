import { supabase } from './supabase';
import type { Habit } from '../types';
import { format } from 'date-fns';

// 1. OBTENER TODAS LAS RUTINAS DEL USUARIO
export const getMyHabits = async () => {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data as Habit[];
};

// 2. CREAR UNA NUEVA RUTINA
export const createHabit = async (name: string, frequency: number[]) => {
  const { data, error } = await supabase
    .from('habits')
    .insert([{ name, frequency }])
    .select()
    .single();

  if (error) throw error;
  return data as Habit;
};

// 3. ELIMINAR RUTINA
export const deleteHabit = async (habitId: number) => {
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId);
    
  if (error) throw error;
};

// 4. OBTENER EL PROGRESO DE UN DÍA ESPECÍFICO
export const getDayLogs = async (date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  const { data, error } = await supabase
    .from('habit_logs')
    .select('habit_id')
    .eq('date', dateStr);

  if (error) throw error;
  // Retornamos solo los IDs de los hábitos completados ese día
  return data.map((log: any) => log.habit_id) as number[];
};

// 5. MARCAR/DESMARCAR (TOGGLE) RUTINA
export const toggleHabitLog = async (habitId: number, date: Date, isCompleted: boolean) => {
  const dateStr = format(date, 'yyyy-MM-dd');

  if (isCompleted) {
    // Si se marcó -> Insertamos registro
    const { error } = await supabase
      .from('habit_logs')
      .insert([{ habit_id: habitId, date: dateStr, completed: true }]);
    if (error) throw error;
  } else {
    // Si se desmarcó -> Borramos registro
    const { error } = await supabase
      .from('habit_logs')
      .delete()
      .eq('habit_id', habitId)
      .eq('date', dateStr);
    if (error) throw error;
  }
};

// 6. OBTENER LOGS DE UN RANGO DE FECHAS (Para el Calendario Mensual)
export const getRangeLogs = async (startDate: Date, endDate: Date) => {
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('habit_logs')
    .select('habit_id, date') // Solo necesitamos saber qué y cuándo
    .gte('date', startStr) // Mayor o igual al inicio
    .lte('date', endStr);  // Menor o igual al final

  if (error) throw error;
  return data as { habit_id: number; date: string }[];
};

// ... imports y funciones anteriores

// 6. ACTUALIZAR FRECUENCIA (Días)
export const updateHabitFrequency = async (id: number, frequency: number[]) => {
  const { error } = await supabase
    .from('habits')
    .update({ frequency })
    .eq('id', id);
  if (error) throw error;
};

// 7. ACTUALIZAR NOMBRE (Renombrar)
export const updateHabitName = async (id: number, name: string) => {
  const { error } = await supabase
    .from('habits')
    .update({ name })
    .eq('id', id);
  if (error) throw error;
};