import React, { useState, useEffect } from 'react';
import { X, Save, Calendar as CalIcon, Clock, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  syncCalendarSettings,
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  type GoogleEventDisplay,
} from '../../services/googleService';
import type { CalendarConfig } from '../../types';
import { format } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSuccess: () => void;
  eventToEdit?: GoogleEventDisplay | null; // <--- NUEVO: Si viene un evento, entra en modo Edición
}

export const AddEventModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedDate,
  onSuccess,
  eventToEdit = null,
}) => {
  const { session, googleToken } = useAuth();
  const activeGoogleToken = session?.provider_token || googleToken;
  const isEditMode = !!eventToEdit;

  // Estados del formulario
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedCalId, setSelectedCalId] = useState('');

  // Lista de calendarios disponibles
  const [calendars, setCalendars] = useState<CalendarConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar datos al abrir (Modo Crear vs Modo Editar)
  useEffect(() => {
    if (!isOpen) return;

    if (eventToEdit) {
      setTitle(eventToEdit.title === '(Sin título)' ? '' : eventToEdit.title);
      setEventDate(eventToEdit.date || format(selectedDate, 'yyyy-MM-dd'));
      setIsAllDay(eventToEdit.isAllDay);
      setStartTime(eventToEdit.startTimeInput || '09:00');
      setEndTime(eventToEdit.endTimeInput || '10:00');
      setSelectedCalId(eventToEdit.calendarId);
    } else {
      setTitle('');
      setEventDate(format(selectedDate, 'yyyy-MM-dd'));
      setIsAllDay(false);
      setStartTime('09:00');
      setEndTime('10:00');
    }

    if (activeGoogleToken) {
      loadCalendars(eventToEdit?.calendarId);
    }
  }, [isOpen, eventToEdit, selectedDate, activeGoogleToken]);

  const loadCalendars = async (preferredCalId?: string) => {
    if (!activeGoogleToken) return;
    setLoading(true);
    try {
      const list = await syncCalendarSettings(activeGoogleToken);
      setCalendars(list);

      if (preferredCalId) {
        setSelectedCalId(preferredCalId);
      } else {
        const primary = list.find((c) => c.google_id === 'primary');
        setSelectedCalId(primary ? primary.google_id : list[0]?.google_id || 'primary');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-ajustar hora fin si el usuario elige una hora inicio posterior a la hora fin
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    if (newStart >= endTime) {
      const [h, m] = newStart.split(':').map(Number);
      const nextHour = String((h + 1) % 24).padStart(2, '0');
      setEndTime(`${nextHour}:${String(m).padStart(2, '0')}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedCalId || !activeGoogleToken) return;

    setIsSaving(true);
    try {
      const dateBase = eventDate || format(selectedDate, 'yyyy-MM-dd');
      const start = new Date(`${dateBase}T${startTime}:00`);
      let end = new Date(`${dateBase}T${endTime}:00`);

      // Si la hora de término es menor o igual a la de inicio, sumamos 1 hora por seguridad
      if (!isAllDay && end <= start) {
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }

      if (isEditMode && eventToEdit) {
        await updateGoogleEvent(
          activeGoogleToken,
          eventToEdit.calendarId,
          selectedCalId,
          eventToEdit.id,
          {
            title: title.trim(),
            isAllDay,
            start,
            end,
          }
        );
      } else {
        await createGoogleEvent(activeGoogleToken, selectedCalId, {
          title: title.trim(),
          isAllDay,
          start,
          end,
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      alert(`Error ${isEditMode ? 'actualizando' : 'creando'} evento: ` + error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!eventToEdit || !activeGoogleToken) return;
    if (!confirm('¿Eliminar este evento de Google Calendar?')) return;

    setIsSaving(true);
    try {
      await deleteGoogleEvent(activeGoogleToken, eventToEdit.calendarId, eventToEdit.id);
      onSuccess();
      onClose();
    } catch (e) {
      alert('Error eliminando evento');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const selectedCalColor =
    calendars.find((c) => c.google_id === selectedCalId)?.color || 'var(--color-primary)';

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <form
        className="task-modal-card"
        style={{ maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="task-modal-drag-handle" />

        {/* HEADER */}
        <div className="task-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: selectedCalColor,
              }}
            />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
              {isEditMode ? 'Editar Evento' : 'Nuevo Evento'}
            </h2>
          </div>

          <button type="button" className="task-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="task-modal-body">
          {/* TÍTULO */}
          <input
            className="task-title-input"
            autoFocus
            required
            type="text"
            placeholder="Título del evento..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* FECHA Y CALENDARIO */}
          <div className="task-meta-grid">
            <div className="meta-field">
              <label>
                <CalIcon size={14} /> Fecha
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div className="meta-field">
              <label>Calendario</label>
              <select
                value={selectedCalId}
                onChange={(e) => setSelectedCalId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-text-main)',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              >
                {calendars.map((c) => (
                  <option key={c.google_id} value={c.google_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* HORARIO */}
          <div className="meta-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>
                <Clock size={14} /> Horario
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  textTransform: 'none',
                  fontSize: '0.82rem',
                  color: 'var(--color-text-main)',
                }}
              >
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  style={{ width: '18px', height: '18px' }}
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                />
                <span>Todo el día</span>
              </label>
            </div>

            {!isAllDay && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                />
                <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>→</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="task-modal-footer">
          {isEditMode ? (
            <button type="button" className="task-btn-delete" onClick={handleDelete}>
              <Trash2 size={16} />
              <span>Eliminar</span>
            </button>
          ) : (
            <div />
          )}

          <div className="task-footer-right">
            <button type="button" className="task-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="task-btn-save"
              disabled={isSaving || loading || !title.trim()}
            >
              <Save size={16} />
              <span>
                {isSaving ? 'Guardando...' : isEditMode ? 'Guardar cambios' : 'Crear evento'}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};