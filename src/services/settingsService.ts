import { supabase } from './supabase';
import type { AppSettings } from '../types';

export const getAppSettings = async (): Promise<AppSettings> => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .single();

  if (error || !data) {
    // Si no existe o error, devolvemos defaults (todo visible)
    return { show_stats: true, show_calendar: true, show_sports: true, theme: 'light' };
  }
  return data;
};

export const saveAppSettings = async (settings: AppSettings) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('app_settings')
    .upsert({ 
      user_id: user.id,
      ...settings,
      updated_at: new Date()
    });

  if (error) throw error;
};