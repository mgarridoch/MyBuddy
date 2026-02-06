import React, { useState, useEffect } from 'react';
import { X, LayoutDashboard, Calendar, Dumbbell, BarChart2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { syncCalendarSettings, saveCalendarSetting } from '../../services/googleService';
import type { CalendarConfig } from '../../types';
import './SettingsModal.css'; // <--- IMPORTANTE

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'general' | 'calendar' | 'sports' | 'stats';

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { session } = useAuth();
  const { appSettings, updateAppSettings, refreshData } = useData(); 
  
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [googleCalendars, setGoogleCalendars] = useState<CalendarConfig[]>([]);
  const [loadingCal, setLoadingCal] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'calendar' && session?.provider_token) {
      setLoadingCal(true);
      syncCalendarSettings(session.provider_token)
        .then(setGoogleCalendars)
        .finally(() => setLoadingCal(false));
    }
  }, [isOpen, activeTab]);

  const handleToggleGoogleCal = async (cal: CalendarConfig) => {
    const newConfig = { ...cal, is_visible: !cal.is_visible };
    setGoogleCalendars(prev => prev.map(c => c.google_id === cal.google_id ? newConfig : c));
    await saveCalendarSetting(newConfig);
    refreshData(); 
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        
        {/* --- SIDEBAR --- */}
        <div className="settings-sidebar">
          <h3 className="sidebar-title">Configuración</h3>

          <SidebarBtn active={activeTab==='general'} onClick={()=>setActiveTab('general')} icon={<LayoutDashboard size={18}/>} label="Generales" />
          <SidebarBtn active={activeTab==='calendar'} onClick={()=>setActiveTab('calendar')} icon={<Calendar size={18}/>} label="Calendario" />
          <SidebarBtn active={activeTab==='sports'} onClick={()=>setActiveTab('sports')} icon={<Dumbbell size={18}/>} label="Deporte" />
          <SidebarBtn active={activeTab==='stats'} onClick={()=>setActiveTab('stats')} icon={<BarChart2 size={18}/>} label="Estadísticas" />
        </div>

        {/* --- CONTENIDO --- */}
        <div className="settings-main">
          
          <button onClick={onClose} className="close-btn"><X size={24} /></button>

          <div style={{overflowY: 'auto', flex: 1, paddingRight:'10px'}}>
            
            {/* 1. GENERALES */}
            {activeTab === 'general' && (
              <div>
                <h2 className="settings-h2">Ajustes Generales</h2>
                
                <div style={{marginBottom:'2rem'}}>
                  <p className="settings-subtitle">Visibilidad del Menú</p>
                  <p className="settings-desc">Elige qué secciones quieres ver en la barra superior.</p>
                  
                  <ToggleRow label="Mostrar Calendario" checked={appSettings.show_calendar} onChange={(v) => updateAppSettings({...appSettings, show_calendar: v})} />
                  <ToggleRow label="Mostrar Deporte" checked={appSettings.show_sports} onChange={(v) => updateAppSettings({...appSettings, show_sports: v})} />
                  <ToggleRow label="Mostrar Estadísticas" checked={appSettings.show_stats} onChange={(v) => updateAppSettings({...appSettings, show_stats: v})} />
                </div>

                <div>
                  <p className="settings-subtitle">Apariencia</p>
                  <ToggleRow label="Modo Oscuro" checked={appSettings.theme === 'dark'} onChange={(v) => updateAppSettings({...appSettings, theme: v ? 'dark' : 'light'})} />
                </div>
              </div>
            )}

            {/* 2. CALENDARIO */}
            {activeTab === 'calendar' && (
              <div>
                <h2 className="settings-h2">Configuración de Calendario</h2>
                
                <div style={{marginBottom:'2rem'}}>
                  <p className="settings-subtitle">Mis Calendarios de Google</p>
                  {loadingCal ? <p style={{color:'var(--color-text-muted)'}}>Cargando...</p> : (
                    <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                      {googleCalendars.map(cal => (
                        <div key={cal.google_id} className="toggle-row" style={{border:'1px solid var(--color-border)', borderRadius:'8px', padding:'8px 12px'}}>
                           <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                             <div style={{width:'12px', height:'12px', borderRadius:'50%', background: cal.color}}></div>
                             <span style={{fontSize:'0.9rem'}}>{cal.name}</span>
                           </div>
                           <button onClick={() => handleToggleGoogleCal(cal)} style={{background:'none', border:'none', cursor:'pointer', color:'var(--color-text-muted)'}}>
                             {cal.is_visible ? <Eye size={20} color="var(--color-primary)"/> : <EyeOff size={20}/>}
                           </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. DEPORTE */}
            {activeTab === 'sports' && (
              <div>
                 <h2 className="settings-h2">Ajustes de Deporte</h2>
                 <p className="settings-desc">Próximamente podrás configurar tus rutinas de gimnasio aquí.</p>
              </div>
            )}

             {/* 4. ESTADÍSTICAS */}
             {activeTab === 'stats' && (
              <div>
                 <h2 className="settings-h2">Ajustes de Estadísticas</h2>
                 <p className="settings-desc">Próximamente podrás definir tus metas mensuales.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTES AUXILIARES ---

const SidebarBtn: React.FC<{active: boolean, icon: any, label: string, onClick: () => void}> = ({active, icon, label, onClick}) => (
  <button onClick={onClick} className={`sidebar-btn ${active ? 'active' : ''}`}>
    {icon} {label}
  </button>
);

const ToggleRow: React.FC<{label: string, checked: boolean, onChange: (v: boolean) => void}> = ({label, checked, onChange}) => (
  <div className="toggle-row">
    <span>{label}</span>
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="slider"></span>
    </label>
  </div>
);