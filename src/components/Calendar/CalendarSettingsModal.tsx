import React, { useEffect, useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { syncCalendarSettings, saveCalendarSetting } from '../../services/googleService';
import type { CalendarConfig } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; // Para avisar al Dashboard que recargue eventos
}

export const CalendarSettingsModal: React.FC<Props> = ({ isOpen, onClose, onUpdate }) => {
  const { session } = useAuth();
  const [calendars, setCalendars] = useState<CalendarConfig[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar lista al abrir el modal
  useEffect(() => {
    if (isOpen && session?.provider_token) {
      loadCalendars();
    }
  }, [isOpen]);

  const loadCalendars = async () => {
    setLoading(true);
    try {
      const list = await syncCalendarSettings(session!.provider_token!);
      setCalendars(list);
    } catch (error) {
      console.error("Error cargando calendarios", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (cal: CalendarConfig) => {
    // Optimista
    const newConfig = { ...cal, is_visible: !cal.is_visible };
    setCalendars(prev => prev.map(c => c.google_id === cal.google_id ? newConfig : c));
    
    // Guardar en BD
    await saveCalendarSetting(newConfig);
    onUpdate(); // Avisar que hay cambios
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)',
        width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
          <h2 style={{fontSize:'1.2rem', color:'var(--color-text-main)'}}>Mis Calendarios</h2>
          <button onClick={onClose}><X size={20}/></button>
        </div>

        {loading ? <p>Cargando calendarios de Google...</p> : (
          <div style={{display:'flex', flexDirection:'column', gap:'10px', maxHeight:'300px', overflowY:'auto'}}>
            {calendars.map(cal => (
              <div key={cal.google_id} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'10px', border:'1px solid #eee', borderRadius:'var(--radius-sm)'
              }}>
                <div style={{display:'flex', alignItems:'center', gap:'10px', overflow:'hidden'}}>
                  <div style={{width:'12px', height:'12px', borderRadius:'50%', backgroundColor: cal.color, flexShrink:0}}></div>
                  <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{cal.name}</span>
                </div>
                
                <button onClick={() => handleToggle(cal)} style={{color: 'var(--color-text-muted)'}}>
                  {cal.is_visible ? <Eye size={20} color="var(--color-primary)"/> : <EyeOff size={20}/>}
                </button>
              </div>
            ))}
          </div>
        )}
        
        <button onClick={onClose} style={{
          marginTop:'1.5rem', width:'100%', padding:'10px', backgroundColor:'var(--color-bg)',
          borderRadius:'var(--radius-sm)', fontWeight:600, color:'var(--color-text-main)'
        }}>
          Listo
        </button>
      </div>
    </div>
  );
};