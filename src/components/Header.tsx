import React from 'react';
import { BarChart2, Calendar, Dumbbell, Settings } from 'lucide-react'; // Iconos lindos
import './Header.css';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { useData } from '../context/DataContext'; // Importar contexto

interface HeaderProps {
  onOpenCalendarSettings: () => void; // <--- Nueva prop
}


export const Header: React.FC<HeaderProps> = ({ onOpenCalendarSettings }) => {
  const { appSettings } = useData(); // Usar el contexto para obtener configuraciones
  const { signOut } = useAuth();
  return (
    <header className="app-header">
      <nav className="nav-menu">
        
        {/* Usamos appSettings.show_xxx para mostrar/ocultar */}
        
        {appSettings.show_stats && (
          <button className="nav-btn">
            <BarChart2 size={20} />
            <span className="nav-text">Estadísticas</span>
          </button>
        )}
        
        {appSettings.show_calendar && (
          <button className="nav-btn active"> {/* Nota: Manejar clase 'active' dinámicamente luego */}
            <Calendar size={20} />
            <span className="nav-text">Calendario</span>
          </button>
        )}
        
        {appSettings.show_sports && (
          <button className="nav-btn">
            <Dumbbell size={20} />
            <span className="nav-text">Deporte</span>
          </button>
        )}

        {/* BOTONES FIJOS (Logout y Config siempre visibles) */}
        <button className="nav-btn" onClick={onOpenCalendarSettings} title="Configuración">
          <Settings size={20} />
          <span className="nav-text">Config</span>
        </button>
        <button className="nav-btn" onClick={signOut} style={{marginLeft: 'auto', backgroundColor: 'rgba(255,0,0,0.1)'}}>
          <LogOut size={20} color="white"/>
        </button>
      </nav>
    </header>
  );
};