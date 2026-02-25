import { supabase } from './supabase';

// --- PESO CORPORAL Y FOTOS ---

export interface ProgressEntry {
  id: number;
  date: string;
  weight: number;
  photo_url?: string;
  notes?: string;
}

export const getProgressHistory = async () => {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .order('date', { ascending: true }); // Orden cronológico para gráficos
  if (error) throw error;
  return data as ProgressEntry[];
};

export const addProgressEntry = async (weight: number, date: Date, file?: File) => {
  let photoUrl = null;

  if (file) {
    const fileName = `progress-${Date.now()}`;
    const { error: uploadError } = await supabase.storage
      .from('exercises') // Reusamos el bucket o creamos uno 'progress'
      .upload(fileName, file);
    
    if (!uploadError) {
      const { data } = supabase.storage.from('exercises').getPublicUrl(fileName);
      photoUrl = data.publicUrl;
    }
  }

  const { error } = await supabase.from('user_progress').insert([{
    date: date.toISOString().split('T')[0],
    weight,
    photo_url: photoUrl
  }]);

  if (error) throw error;
};

// --- GRÁFICO DE FUERZA ---

export const getStrengthHistory = async (exerciseId: number) => {
  // Obtenemos los logs de ese ejercicio
  const { data, error } = await supabase
    .from('workout_logs')
    .select('created_at, weight, reps')
    .eq('exercise_id', exerciseId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Procesamos para el gráfico: Solo el mejor set de cada día
  // (Simplificación: tomamos todos los puntos para ver volumen)
  return data.map(log => ({
    date: new Date(log.created_at).toLocaleDateString(),
    weight: log.weight,
    // Fórmula 1RM estimada (Epley): w * (1 + r/30)
    rm1: Math.round(log.weight * (1 + log.reps / 30))
  }));
};

export const deleteProgressEntry = async (id: number) => {
  const { error } = await supabase
    .from('user_progress')
    .delete()
    .eq('id', id);
  if (error) throw error;
};