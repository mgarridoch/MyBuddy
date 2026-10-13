import { startOfDay, endOfDay, format, addDays } from 'date-fns';
import { supabase } from './supabase';
import type { CalendarConfig } from '../types';

export interface CalendarEventSimple {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  color: string;
  isAllDay: boolean;
}

export interface GoogleEventDisplay {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // Texto legible para mostrar en la UI
  startTimeInput: string; // "HH:mm" formato 24h para rellenar <input type="time">
  endTimeInput: string;   // "HH:mm" formato 24h para rellenar <input type="time">
  isAllDay: boolean;
  color: string;
  calendarName: string;
  calendarId: string;
  startRaw: Date;
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

  if (response.status === 401) throw new Error('TOKEN_EXPIRED');
  if (!response.ok) throw new Error('Error fetching calendars');
  const data = await response.json();
  return data.items || [];
};

// B. SINCRONIZAR PREFERENCIAS (Mezclar Google con Supabase)
export const syncCalendarSettings = async (providerToken: string) => {
  const googleList = await getGoogleCalendarsList(providerToken);

  const { data: savedSettings } = await supabase
    .from('calendar_settings')
    .select('*');

  const mergedList: CalendarConfig[] = googleList.map((gCal: any) => {
    const saved = savedSettings?.find((s) => s.google_id === gCal.id);

    return {
      google_id: gCal.id,
      name: gCal.summary,
      color: saved?.color || gCal.backgroundColor || '#9381ff',
      is_visible: saved ? saved.is_visible : true,
    };
  });

  return mergedList;
};

// C. GUARDAR PREFERENCIA (Toggle visibility o color)
export const saveCalendarSetting = async (config: CalendarConfig) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('calendar_settings').upsert(
    {
      user_id: user.id,
      google_id: config.google_id,
      name: config.name,
      color: config.color,
      is_visible: config.is_visible,
    },
    { onConflict: 'user_id, google_id' }
  );

  if (error) throw error;
};

export const getGoogleEvents = async (providerToken: string, date: Date) => {
  const timeMin = startOfDay(date).toISOString();
  const timeMax = endOfDay(date).toISOString();

  const { data: settings } = await supabase
    .from('calendar_settings')
    .select('*')
    .eq('is_visible', true);

  const calendarsToFetch =
    settings && settings.length > 0
      ? settings
      : [{ google_id: 'primary', color: '#9381ff', name: 'Principal' }];

  const fetchPromises = calendarsToFetch.map(async (cal) => {
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

      if (!response.ok) return [];

      const data = await response.json();

      return (data.items || []).map((event: any) => {
        const isAllDay = !!event.start.date;
        const startDt = new Date(event.start.dateTime || event.start.date);
        const endDt = event.end?.dateTime
          ? new Date(event.end.dateTime)
          : new Date(startDt.getTime() + 60 * 60 * 1000);

        return {
          id: event.id,
          title: event.summary || '(Sin título)',
          date: (event.start.dateTime || event.start.date).split('T')[0],
          time: isAllDay
            ? 'Todo el día'
            : startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          startTimeInput: isAllDay ? '09:00' : format(startDt, 'HH:mm'),
          endTimeInput: isAllDay ? '10:00' : format(endDt, 'HH:mm'),
          isAllDay,
          color: cal.color,
          calendarName: cal.name,
          startRaw: startDt,
          calendarId: cal.google_id,
        } as GoogleEventDisplay;
      });
    } catch (error) {
      console.error(`Error fetching calendar ${cal.name}`, error);
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  const allEvents = results.flat();
  return allEvents.sort((a, b) => a.startRaw.getTime() - b.startRaw.getTime());
};

export const getGoogleEventsRange = async (providerToken: string, start: Date, end: Date) => {
  const timeMin = start.toISOString();
  const timeMax = end.toISOString();

  const { data: settings } = await supabase
    .from('calendar_settings')
    .select('*')
    .eq('is_visible', true);

  const calendarsToFetch =
    settings && settings.length > 0
      ? settings
      : [{ google_id: 'primary', color: '#9381ff' }];

  const fetchPromises = calendarsToFetch.map(async (cal) => {
    const calendarId = encodeURIComponent(cal.google_id);
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&fields=items(id,summary,start,end,colorId)`,
        {
          headers: { Authorization: `Bearer ${providerToken}` },
        }
      );

      if (response.status === 401) {
        throw new Error('TOKEN_EXPIRED');
      }

      if (!response.ok) return [];
      const data = await response.json();

      return (data.items || []).map((event: any) => {
        const rawDate = event.start.dateTime || event.start.date;
        const dateStr = rawDate.split('T')[0];
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
          isAllDay,
        } as CalendarEventSimple;
      });
    } catch (e) {
      return [];
    }
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

  // En eventos de "Todo el día", Google exige que 'end.date' sea el día siguiente (exclusivo)
  const startDateStr = format(eventData.start, 'yyyy-MM-dd');
  const endDateExclusiveStr = format(addDays(eventData.start, 1), 'yyyy-MM-dd');

  const resource = {
    summary: eventData.title,
    start: eventData.isAllDay
      ? { date: startDateStr }
      : { dateTime: eventData.start.toISOString() },
    end: eventData.isAllDay
      ? { date: endDateExclusiveStr }
      : { dateTime: eventData.end.toISOString() },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calIdEncoded}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resource),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Error creando evento');
  }
};

// E. EDITAR / ACTUALIZAR EVENTO (Soporta cambiar hora, fecha, título e incluso de calendario)
export const updateGoogleEvent = async (
  providerToken: string,
  originalCalendarId: string,
  targetCalendarId: string,
  eventId: string,
  eventData: { title: string; start: Date; end: Date; isAllDay: boolean }
) => {
  // Si el usuario cambió el evento a otro calendario distinto, lo creamos en el nuevo y borramos del viejo
  if (originalCalendarId !== targetCalendarId) {
    await createGoogleEvent(providerToken, targetCalendarId, eventData);
    await deleteGoogleEvent(providerToken, originalCalendarId, eventId);
    return;
  }

  const calIdEncoded = encodeURIComponent(originalCalendarId);
  const startDateStr = format(eventData.start, 'yyyy-MM-dd');
  const endDateExclusiveStr = format(addDays(eventData.start, 1), 'yyyy-MM-dd');

  // Al pasar de evento con hora a todo el día (o viceversa), Google pide null en el campo opuesto
  const resource = {
    summary: eventData.title,
    start: eventData.isAllDay
      ? { date: startDateStr, dateTime: null }
      : { dateTime: eventData.start.toISOString(), date: null },
    end: eventData.isAllDay
      ? { date: endDateExclusiveStr, dateTime: null }
      : { dateTime: eventData.end.toISOString(), date: null },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calIdEncoded}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resource),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Error actualizando evento');
  }
};

// F. ELIMINAR EVENTO
export const deleteGoogleEvent = async (
  providerToken: string,
  calendarId: string,
  eventId: string
) => {
  const calIdEncoded = encodeURIComponent(calendarId);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calIdEncoded}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${providerToken}`,
      },
    }
  );

  if (!response.ok) throw new Error('Error eliminando evento');
};

// G. OBTENER EVENTOS DEL MES COMPLETO (Con horas de inicio/fin para poder editarlos)
export const getGoogleEventsForMonth = async (providerToken: string, start: Date, end: Date) => {
  const timeMin = start.toISOString();
  const timeMax = end.toISOString();

  const { data: settings } = await supabase
    .from('calendar_settings')
    .select('*')
    .eq('is_visible', true);

  const calendarsToFetch =
    settings && settings.length > 0
      ? settings
      : [{ google_id: 'primary', color: '#9381ff', name: 'Principal' }];

  const fetchPromises = calendarsToFetch.map(async (cal) => {
    const calendarIdEncoded = encodeURIComponent(cal.google_id);
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarIdEncoded}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: { Authorization: `Bearer ${providerToken}` },
        }
      );

      if (response.status === 401) {
        throw new Error('TOKEN_EXPIRED');
      }

      if (!response.ok) {
        console.warn(`Calendario no encontrado o sin acceso: ${cal.name}`);
        return [];
      }

      const data = await response.json();

      return (data.items || []).map((event: any) => {
        const isAllDay = !!event.start.date;
        const startDt = new Date(event.start.dateTime || event.start.date);
        const endDt = event.end?.dateTime
          ? new Date(event.end.dateTime)
          : new Date(startDt.getTime() + 60 * 60 * 1000);

        return {
          id: event.id,
          title: event.summary || '(Sin título)',
          date: (event.start.dateTime || event.start.date).split('T')[0],
          time: isAllDay
            ? ''
            : startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          startTimeInput: isAllDay ? '09:00' : format(startDt, 'HH:mm'),
          endTimeInput: isAllDay ? '10:00' : format(endDt, 'HH:mm'),
          isAllDay,
          color: cal.color,
          calendarName: cal.name,
          calendarId: cal.google_id,
          startRaw: startDt,
        } as GoogleEventDisplay;
      });
    } catch (e: any) {
      if (e.message === 'TOKEN_EXPIRED') throw e;
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  const allEvents = results.flat();

  return allEvents.sort((a, b) => a.startRaw.getTime() - b.startRaw.getTime());
};