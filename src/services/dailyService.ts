import { supabase } from './supabase';
import type { Task } from '../types';
import { format } from 'date-fns';
import type { DayNote } from '../types';

// --- TAREAS (TASKS) ---

export const getTasks = async (date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('date', dateStr)
    .order('created_at', { ascending: true }); // Las más viejas primero (orden de creación)

  if (error) throw error;
  return data as Task[];
};

export const createTask = async (title: string, date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('tasks')
    .insert([{ title, date: dateStr, completed: false }])
    .select()
    .single();

  if (error) throw error;
  return data as Task;
};

export const toggleTask = async (taskId: number, completed: boolean) => {
  const { error } = await supabase
    .from('tasks')
    .update({ completed })
    .eq('id', taskId);

  if (error) throw error;
};

export const deleteTask = async (taskId: number) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
};

// --- NOTAS (NOTES) ---

export const getDayNote = async (date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('day_notes')
    .select('content')
    .eq('date', dateStr)
    .maybeSingle(); // maybeSingle retorna null si no existe, en vez de error

  if (error) throw error;
  return data?.content || '';
};

export const saveDayNote = async (date: Date, content: string) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Obtenemos el usuario actual para el upsert
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");

  // Upsert: Si existe actualiza, si no existe crea.
  // IMPORTANTE: Requiere que haya una constraint unique en (user_id, date) en la BD (ya la creamos)
  const { error } = await supabase
    .from('day_notes')
    .upsert(
      { user_id: user.id, date: dateStr, content }, 
      { onConflict: 'user_id, date' }
    );

  if (error) throw error;
};

// OBTENER TAREAS POR RANGO
export const getTasksRange = async (start: Date, end: Date) => {
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .gte('date', startStr)
    .lte('date', endStr)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Task[];
};

// OBTENER NOTAS POR RANGO
export const getNotesRange = async (start: Date, end: Date) => {
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('day_notes')
    .select('*')
    .gte('date', startStr)
    .lte('date', endStr);

  if (error) throw error;
  return data as DayNote[]; // Asegúrate de tener la interfaz DayNote exportada en types
};