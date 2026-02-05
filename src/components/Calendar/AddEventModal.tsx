import React, { useState, useEffect } from 'react';
import { X, Save, Calendar as CalIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { syncCalendarSettings, createGoogleEvent } from '../../services/googleService';
import type { CalendarConfig } from '../../types';
import { format } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSuccess: () => void;
}

export const AddEventModal: React.FC<Props> = ({ isOpen, onClose, selectedDate, onSuccess }) => {
  const { session } = useAuth();
  
  // Estados del formulario
  const [title, setTitle] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedCalId, setSelectedCalId] = useState('');
  
  // Lista de calendarios disponibles
  const [calendars, setCalendars] = useState<CalendarConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar calendarios al abrir
  useEffect(() => {
    if (isOpen && session?.provider_token) {
      loadCalendars();
      // Reset form
      setTitle('');
      setIsAllDay(false);
      setStartTime('09:00');
      setEndTime('10:00');
    }
  }, [isOpen]);

  const loadCalendars = async () => {
    setLoading(true);
    try {
      const list = await syncCalendarSettings(session!.provider_token!);
      // Filtramos solo los visibles o todos, a gusto. Usualmente se guarda en el principal
      setCalendars(list);
      // Seleccionar el "primary" o el primero por defecto
      const primary = list.find(c => c.google_id === 'primary');
      setSelectedCalId(primary ? primary.google_id : list[0]?.google_id);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedCalId) return;

    setIsSaving(true);
    try {
      // Construir objetos Date
      // OJO: selectedDate viene del calendario (00:00:00). 
      // Hay que sumarle la hora del input.
      const dateBase = format(selectedDate, 'yyyy-MM-dd');
      
      const start = new Date(`${dateBase}T${startTime}:00`);
      const end = new Date(`${dateBase}T${endTime}:00`);
      
      // Si es AllDay, Google ignora la hora, pero necesita objeto Date
      
      await createGoogleEvent(session!.provider_token!, selectedCalId, {
        title,
        isAllDay,
        start,
        end
      });

      onSuccess(); // Recargar datos
      onClose();   // Cerrar modal
    } catch (error) {
      alert('Error creando evento: ' + error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
    }}>
      <form onSubmit={handleSubmit} style={{
        backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)',
        width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
          <h2 style={{fontSize:'1.2rem', color:'var(--color-primary)'}}>Nuevo Evento</h2>
          <button type="button" onClick={onClose}><X size={20}/></button>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          
          {/* Título */}
          <div>
            <label style={{fontSize:'0.85rem', fontWeight:600, color:'#666'}}>Título</label>
            <input 
              autoFocus required
              type="text" placeholder="Ej: Cita dentista"
              value={title} onChange={e => setTitle(e.target.value)}
              style={{width:'100%', padding:'10px', borderRadius:'var(--radius-sm)', border:'1px solid #ccc', marginTop:'5px'}}
            />
          </div>

          {/* Calendario */}
          <div>
            <label style={{fontSize:'0.85rem', fontWeight:600, color:'#666'}}>Calendario</label>
            <div style={{position:'relative', marginTop:'5px'}}>
              <CalIcon size={16} style={{position:'absolute', left:'10px', top:'12px', color:'#888'}}/>
              <select 
                value={selectedCalId} onChange={e => setSelectedCalId(e.target.value)}
                style={{width:'100%', padding:'10px 10px 10px 35px', borderRadius:'var(--radius-sm)', border:'1px solid #ccc', appearance:'none', background:'white'}}
              >
                {calendars.map(c => (
                  <option key={c.google_id} value={c.google_id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Horas */}
          <div>
            <label style={{display:'flex', alignItems:'center', gap:'10px', fontSize:'0.85rem', fontWeight:600, color:'#666', marginBottom:'5px'}}>
              <input type="checkbox" checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)}/>
              Todo el día
            </label>
            
            {!isAllDay && (
              <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                <div style={{flex:1}}>
                   <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{width:'100%', padding:'8px', border:'1px solid #ccc', borderRadius:'var(--radius-sm)'}}/>
                </div>
                <span>→</span>
                <div style={{flex:1}}>
                   <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{width:'100%', padding:'8px', border:'1px solid #ccc', borderRadius:'var(--radius-sm)'}}/>
                </div>
              </div>
            )}
          </div>

        </div>

        <button disabled={isSaving || loading} type="submit" style={{
          marginTop:'1.5rem', width:'100%', padding:'12px', backgroundColor:'var(--color-primary)', color:'white',
          borderRadius:'var(--radius-sm)', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
          opacity: isSaving ? 0.7 : 1
        }}>
          {isSaving ? 'Guardando...' : <><Save size={18}/> Crear Evento</>}
        </button>
      </form>
    </div>
  );
};