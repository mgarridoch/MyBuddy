import { supabase } from './supabase';
import type { Exercise, Routine, RoutineExercise } from '../types';

// --- EJERCICIOS (CRUD) ---

export const getExercises = async () => {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data as Exercise[];
};

export const createExercise = async (exercise: Partial<Exercise>, file?: File) => {
  let videoUrl = null;

  // 1. Si hay archivo, subirlo primero
  if (file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('exercises')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Obtener URL pública
    const { data } = supabase.storage.from('exercises').getPublicUrl(filePath);
    videoUrl = data.publicUrl;
  }

  // 2. Guardar en BD
  const { data, error } = await supabase
    .from('exercises')
    .insert([{ ...exercise, video_url: videoUrl }])
    .select()
    .single();

  if (error) throw error;
  return data as Exercise;
};

export const updateExercise = async (id: number, updates: Partial<Exercise>) => {
  // 1. Actualizar el ejercicio (Nombre, tags, etc)
  const { error } = await supabase
    .from('exercises')
    .update(updates)
    .eq('id', id);
  if (error) throw error;

  // 2. DETECTAR CAMBIO DE PESO PARA HISTORIAL
  // Si updates trae 'last_weight', creamos un registro histórico
  if (updates.last_weight !== undefined) {
    
    // A. Buscamos o creamos un Workout "fantasma" del día de hoy para ajustes manuales
    // Esto evita crear 10 workouts si ajustas 10 ejercicios el mismo día
    const today = new Date().toISOString().split('T')[0];
    
    // Intentar buscar uno existente de hoy llamado "Ajuste Manual"
    let { data: manualWorkout } = await supabase
      .from('workouts')
      .select('id')
      .eq('routine_title', 'Ajuste Manual')
      .gte('start_time', `${today}T00:00:00`)
      .lte('start_time', `${today}T23:59:59`)
      .maybeSingle();

    // Si no existe, lo creamos
    if (!manualWorkout) {
      const { data: newWorkout } = await supabase
        .from('workouts')
        .insert([{
          routine_title: 'Ajuste Manual',
          start_time: new Date().toISOString(),
          duration_seconds: 0 // Duración 0 indica que no fue entrenamiento real
        }])
        .select()
        .single();
      manualWorkout = newWorkout;
    }

    // B. Insertar el Log
    if (manualWorkout) {
      await supabase.from('workout_logs').insert([{
        workout_id: manualWorkout.id,
        exercise_id: id,
        weight: updates.last_weight,
        reps: 0, // 0 reps indica ajuste manual
        exercise_name: updates.name || 'Ejercicio' // Fallback
      }]);
    }
  }
};

export const deleteExercise = async (id: number) => {
  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// --- RUTINAS (CRUD) ---

export const getRoutines = async () => {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Routine[];
};

// Obtener una rutina con sus ejercicios (Join)
export const getRoutineDetails = async (routineId: number) => {
  const { data, error } = await supabase
    .from('routine_exercises')
    .select(`
      *,
      exercise:exercises(*)
    `)
    .eq('routine_id', routineId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data as RoutineExercise[];
};

export const createRoutine = async (name: string) => {
  const { data, error } = await supabase
    .from('routines')
    .insert([{ name }])
    .select()
    .single();
  if (error) throw error;
  return data as Routine;
};

// Guardar ejercicios dentro de una rutina
export const addExerciseToRoutine = async (
  routineId: number, 
  exerciseId: number, 
  order: number,
  sets: number = 3, // Nuevo param
  reps: string = '10' // Nuevo param
) => {
  const { error } = await supabase
    .from('routine_exercises')
    .insert([{ 
      routine_id: routineId, 
      exercise_id: exerciseId,
      order_index: order,
      sets: sets, // Usar param
      reps: reps  // Usar param
    }]);
  if (error) throw error;
};

// Eliminar ejercicio de rutina
export const removeExerciseFromRoutine = async (linkId: number) => {
  const { error } = await supabase
    .from('routine_exercises')
    .delete()
    .eq('id', linkId);
  if (error) throw error;
};

// OBTENER HISTORIAL DE PESOS DE UN EJERCICIO
export const getExerciseHistory = async (exerciseId: number) => {
  // Buscamos en los logs de entrenamiento donde se usó este ejercicio
  const { data, error } = await supabase
    .from('workout_logs')
    .select('weight, created_at, reps')
    .eq('exercise_id', exerciseId)
    .order('created_at', { ascending: false }); // Los más recientes primero

  if (error) throw error;
  
  // Mapeamos para devolver un formato limpio
  return data.map(log => ({
    date: new Date(log.created_at).toLocaleDateString(),
    weight: log.weight,
    reps: log.reps
  }));
};

// ACTUALIZAR RUTINA
export const updateRoutine = async (id: number, name: string) => {
  const { error } = await supabase.from('routines').update({ name }).eq('id', id);
  if (error) throw error;
};

// ELIMINAR RUTINA
export const deleteRoutine = async (id: number) => {
  const { error } = await supabase.from('routines').delete().eq('id', id);
  if (error) throw error;
};

// LIMPIAR EJERCICIOS DE UNA RUTINA (Para cuando editamos y guardamos de nuevo)
export const clearRoutineExercises = async (routineId: number) => {
  const { error } = await supabase.from('routine_exercises').delete().eq('routine_id', routineId);
  if (error) throw error;
};