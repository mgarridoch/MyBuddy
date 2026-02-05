import { startOfDay, endOfDay } from 'date-fns';
import { supabase } from './supabase';
import type { CalendarConfig } from '../types';

// interface GoogleEvent {
//  id: string;
//  summary: string; // El título del evento
//  start: { dateTime?: string; date?: string }; // Google devuelve dateTime (hora) o date (evento de todo el dia)
//  end: { dateTime?: string; date?: string };
//}

export interface CalendarEventSimple {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM (Opcional, si es todo el día no lleva)
  color: string;
  isAllDay: boolean;
}

export interface GoogleEventDisplay {
  id: string;
  title: string;
  time: string;
  isAllDay: boolean;
  color: string;     // <--- Nuevo: Color del calendario
  calendarName: string; // <--- Nuevo: Para saber de dónde viene
  startRaw: Date;    // <--- Nuevo: Para ordenar cronológicamente
}

// A. OBTENER LISTA DE CALENDARIOS DE GOOGLE
export const getGoogleCalendarsList = async (providerToken: string) => {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/users/me/calendarList`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) throw new Error('Error fetching calendars');
  const data = await response.json();
  return data.items; // Devuelve array con {id, summary, backgroundColor...}
};

// B. SINCRONIZAR PREFERENCIAS (Mezclar Google con Supabase)
export const syncCalendarSettings = async (providerToken: string) => {
  // 1. Traer lista fresca de Google
  const googleList = await getGoogleCalendarsList(providerToken);
  
  // 2. Traer configuraciones guardadas en Supabase
  const { data: savedSettings } = await supabase
    .from('calendar_settings')
    .select('*');

  // 3. Mezclar datos
  const mergedList: CalendarConfig[] = googleList.map((gCal: any) => {
    // Buscamos si ya tenemos configuración para este calendario
    const saved = savedSettings?.find(s => s.google_id === gCal.id);

    return {
      google_id: gCal.id,
      name: gCal.summary,
      // Si tenemos color guardado, úsalo. Si no, usa el de Google o un default.
      color: saved?.color || gCal.backgroundColor || '#9381ff',
      // Si tenemos visibilidad guardada, úsala. Si es nuevo, visible por defecto.
      is_visible: saved ? saved.is_visible : true
    };
  });

  return mergedList;
};

// C. GUARDAR PREFERENCIA (Toggle visibility o color)
export const saveCalendarSetting = async (config: CalendarConfig) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('calendar_settings')
    .upsert(
      { 
        user_id: user.id, 
        google_id: config.google_id,
        name: config.name,
        color: config.color,
        is_visible: config.is_visible
      }, 
      { onConflict: 'user_id, google_id' }
    );

  if (error) throw error;
};


export const getGoogleEvents = async (providerToken: string, date: Date) => {
  const timeMin = startOfDay(date).toISOString();
  const timeMax = endOfDay(date).toISOString();

  // 1. Averiguar qué calendarios quiere ver el usuario
  const { data: settings } = await supabase
    .from('calendar_settings')
    .select('*')
    .eq('is_visible', true); // Solo los visibles

  // Si el usuario es nuevo y no tiene settings, usamos 'primary' por defecto
  const calendarsToFetch = (settings && settings.length > 0) 
    ? settings 
    : [{ google_id: 'primary', color: '#9381ff', name: 'Principal' }];

  // 2. Crear una promesa de fetch por CADA calendario (En paralelo es más rápido)
  const fetchPromises = calendarsToFetch.map(async (cal) => {
    // Codificamos el ID porque algunos tienen caracteres raros (ej: group.v.calendar.google.com)
    const calendarId = encodeURIComponent(cal.google_id);
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${providerToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) return []; // Si falla uno (ej: sin permisos), lo ignoramos y seguimos

      const data = await response.json();
      
      // Mapeamos y le inyectamos el color de ESTE calendario
      return (data.items || []).map((event: any) => {
        const isAllDay = !!event.start.date;
        const startDt = new Date(event.start.dateTime || event.start.date);
        
        return {
          id: event.id,
          title: event.summary || '(Sin título)',
          time: isAllDay ? 'Todo el día' : startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAllDay,
          color: cal.color, // Usamos el color guardado en Supabase
          calendarName: cal.name,
          startRaw: startDt,
          calendarId: cal.google_id // <-- Nuevo: Para saber a qué calendario pertenece (útil para editar/eliminar)
        };
      });

    } catch (error) {
      console.error(`Error fetching calendar ${cal.name}`, error);
      return [];
    }
  });

  // 3. Esperar a que terminen todas las peticiones
  const results = await Promise.all(fetchPromises);

  // 4. Aplanar el array de arrays ( [[ev1], [ev2, ev3]] -> [ev1, ev2, ev3] )
  const allEvents = results.flat();

  // 5. Ordenar por hora real
  return allEvents.sort((a, b) => a.startRaw.getTime() - b.startRaw.getTime());
};

export const getGoogleEventsRange = async (providerToken: string, start: Date, end: Date) => {
  const timeMin = start.toISOString();
  const timeMax = end.toISOString();

  // 1. Obtener calendarios visibles
  const { data: settings } = await supabase
    .from('calendar_settings')
    .select('*')
    .eq('is_visible', true);

  const calendarsToFetch = (settings && settings.length > 0) 
    ? settings 
    : [{ google_id: 'primary', color: '#9381ff' }];

  // 2. Fetch en paralelo
  const fetchPromises = calendarsToFetch.map(async (cal) => {
    const calendarId = encodeURIComponent(cal.google_id);
    try {
      const response = await fetch(
        // Pedimos summary y start.dateTime/date
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&fields=items(id,summary,start,colorId)`, 
        {
          headers: { Authorization: `Bearer ${providerToken}` }
        }
      );
      
      if (!response.ok) return [];
      const data = await response.json();

      return (data.items || []).map((event: any) => {
        const rawDate = event.start.dateTime || event.start.date;
        const dateStr = rawDate.split('T')[0]; // "2024-02-05"
        const isAllDay = !event.start.dateTime;
        
        let timeStr = undefined;
        if (!isAllDay) {
          const dt = new Date(event.start.dateTime);
          timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        return {
          id: event.id,
          title: event.summary || '(Sin título)',
          date: dateStr,
          time: timeStr,
          color: cal.color,
          isAllDay
        } as CalendarEventSimple;
      });

    } catch (e) { return []; }
  });

  const results = await Promise.all(fetchPromises);
  return results.flat(); 
};

// D. CREAR EVENTO
export const createGoogleEvent = async (
  providerToken: string, 
  calendarId: string, 
  eventData: { title: string; start: Date; end: Date; isAllDay: boolean }
) => {
  const calIdEncoded = encodeURIComponent(calendarId);
  
  // Preparar el cuerpo según lo que pide Google
  const resource = {
    summary: eventData.title,
    start: eventData.isAllDay 
      ? { date: eventData.start.toISOString().split('T')[0] } // Solo fecha YYYY-MM-DD
      : { dateTime: eventData.start.toISOString() },          // Fecha y hora ISO
    end: eventData.isAllDay 
      ? { date: eventData.end.toISOString().split('T')[0] }
      : { dateTime: eventData.end.toISOString() }
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calIdEncoded}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resource)
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Error creando evento');
  }
};

// E. ELIMINAR EVENTO
export const deleteGoogleEvent = async (
  providerToken: string, 
  calendarId: string, 
  eventId: string
) => {
  const calIdEncoded = encodeURIComponent(calendarId);
  
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calIdEncoded}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${providerToken}`,
      },
    }
  );

  if (!response.ok) throw new Error('Error eliminando evento');
};