import React, { useState, useEffect } from 'react';
import { X, LayoutDashboard, Calendar, Dumbbell, BarChart2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { syncCalendarSettings, saveCalendarSetting } from '../../services/googleService';
import type { CalendarConfig } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'general' | 'calendar' | 'sports' | 'stats';

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { session } = useAuth();
  const { appSettings, updateAppSettings, refreshData } = useData(); // Usamos el contexto
  
  const [activeTab, setActiveTab] = useState<Tab>('general');
  
  // Estado local para calendarios de Google
  const [googleCalendars, setGoogleCalendars] = useState<CalendarConfig[]>([]);
  const [loadingCal, setLoadingCal] = useState(false);

  // Cargar calendarios Google solo si entramos a la tab 'calendar'
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
    refreshData(); // Recargar eventos en el dashboard
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: 'var(--radius-lg)',
        width: '90%', maxWidth: '800px', height: '500px',
        display: 'flex', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
      }}>
        
        {/* --- SIDEBAR IZQUIERDO --- */}
        <div style={{
          width: '200px', backgroundColor: '#f9f9fc', borderRight: '1px solid #eee',
          padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '5px'
        }}>
          <h3 style={{fontSize:'1.1rem', marginBottom:'1.5rem', color:'var(--color-primary)', fontWeight:800, paddingLeft:'10px'}}>
            Configuración
          </h3>

          <SidebarBtn active={activeTab==='general'} onClick={()=>setActiveTab('general')} icon={<LayoutDashboard size={18}/>} label="Generales" />
          <SidebarBtn active={activeTab==='calendar'} onClick={()=>setActiveTab('calendar')} icon={<Calendar size={18}/>} label="Calendario" />
          <SidebarBtn active={activeTab==='sports'} onClick={()=>setActiveTab('sports')} icon={<Dumbbell size={18}/>} label="Deporte" />
          <SidebarBtn active={activeTab==='stats'} onClick={()=>setActiveTab('stats')} icon={<BarChart2 size={18}/>} label="Estadísticas" />
        </div>

        {/* --- CONTENIDO DERECHO --- */}
        <div style={{ flex: 1, padding: '2rem', display:'flex', flexDirection:'column', position:'relative' }}>
          
          <button onClick={onClose} style={{position:'absolute', top:'15px', right:'15px', color:'#aaa'}}>
            <X size={24} />
          </button>

          {/* CONTENIDO SEGÚN TAB */}
          <div style={{overflowY: 'auto', flex: 1, paddingRight:'10px'}}>
            
            {/* 1. GENERALES */}
            {activeTab === 'general' && (
              <div>
                <h2 style={titleStyle}>Ajustes Generales</h2>
                <div style={sectionStyle}>
                  <p style={subTitleStyle}>Visibilidad del Menú</p>
                  <p style={{fontSize:'0.85rem', color:'#666', marginBottom:'15px'}}>Elige qué secciones quieres ver en la barra superior.</p>
                  
                  <ToggleRow 
                    label="Mostrar Calendario" 
                    checked={appSettings.show_calendar} 
                    onChange={(v) => updateAppSettings({...appSettings, show_calendar: v})} 
                  />
                  <ToggleRow 
                    label="Mostrar Deporte" 
                    checked={appSettings.show_sports} 
                    onChange={(v) => updateAppSettings({...appSettings, show_sports: v})} 
                  />
                  <ToggleRow 
                    label="Mostrar Estadísticas" 
                    checked={appSettings.show_stats} 
                    onChange={(v) => updateAppSettings({...appSettings, show_stats: v})} 
                  />
                </div>
              </div>
            )}

            {/* 2. CALENDARIO */}
            {activeTab === 'calendar' && (
              <div>
                <h2 style={titleStyle}>Configuración de Calendario</h2>
                
                <div style={sectionStyle}>
                  <p style={subTitleStyle}>Mis Calendarios de Google</p>
                  {loadingCal ? <p>Cargando...</p> : (
                    <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                      {googleCalendars.map(cal => (
                        <div key={cal.google_id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px', border:'1px solid #eee', borderRadius:'8px'}}>
                           <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                             <div style={{width:'12px', height:'12px', borderRadius:'50%', background: cal.color}}></div>
                             <span>{cal.name}</span>
                           </div>
                           <button onClick={() => handleToggleGoogleCal(cal)}>
                             {cal.is_visible ? <Eye size={20} color="var(--color-primary)"/> : <EyeOff size={20} color="#ccc"/>}
                           </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Separador de ejemplo para futuros ajustes */}
                <div style={dividerStyle}></div>
                
                <div style={sectionStyle}>
                   <p style={subTitleStyle}>Apariencia (Próximamente)</p>
                   <p style={{fontSize:'0.8rem', color:'#999'}}>Aquí podrás cambiar colores y vistas.</p>
                </div>
              </div>
            )}

            {/* 3. Placeholder DEPORTE */}
            {activeTab === 'sports' && (
              <div>
                 <h2 style={titleStyle}>Ajustes de Deporte</h2>
                 <p>Próximamente podrás configurar tus rutinas de gimnasio aquí.</p>
              </div>
            )}

             {/* 4. Placeholder ESTADÍSTICAS */}
             {activeTab === 'stats' && (
              <div>
                 <h2 style={titleStyle}>Ajustes de Estadísticas</h2>
                 <p>Próximamente podrás definir tus metas mensuales.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTES PARA ESTILOS ---

const SidebarBtn: React.FC<{active: boolean, icon: any, label: string, onClick: () => void}> = ({active, icon, label, onClick}) => (
  <button onClick={onClick} style={{
    display:'flex', alignItems:'center', gap:'10px', padding:'10px 15px', 
    borderRadius:'8px', width:'100%', textAlign:'left', transition:'all 0.2s',
    backgroundColor: active ? 'rgba(147, 129, 255, 0.1)' : 'transparent',
    color: active ? 'var(--color-primary)' : '#666',
    fontWeight: active ? 600 : 400
  }}>
    {icon} {label}
  </button>
);

const ToggleRow: React.FC<{label: string, checked: boolean, onChange: (v: boolean) => void}> = ({label, checked, onChange}) => (
  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0'}}>
    <span>{label}</span>
    <label style={{position:'relative', display:'inline-block', width:'40px', height:'20px'}}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{opacity:0, width:0, height:0}} />
      <span style={{
        position:'absolute', cursor:'pointer', top:0, left:0, right:0, bottom:0, 
        backgroundColor: checked ? 'var(--color-primary)' : '#ccc', borderRadius:'20px', transition:'.4s'
      }}></span>
      <span style={{
        position:'absolute', content:"", height:'16px', width:'16px', left:'2px', bottom:'2px', 
        backgroundColor:'white', borderRadius:'50%', transition:'.4s',
        transform: checked ? 'translateX(20px)' : 'translateX(0)'
      }}></span>
    </label>
  </div>
);

// Estilos rápidos (puedes moverlos a CSS)
const titleStyle = { color: 'var(--color-primary)', marginBottom: '1.5rem', borderBottom:'2px solid #f0f0f0', paddingBottom:'10px' };
const subTitleStyle = { fontWeight: 700, marginBottom: '10px', color: '#444' };
const sectionStyle = { marginBottom: '2rem' };
const dividerStyle = { height: '1px', backgroundColor: 'var(--color-secondary)', margin: '2rem 0', opacity: 0.3 };