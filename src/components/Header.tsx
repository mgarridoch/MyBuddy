import React from 'react';
import { BarChart2, Calendar, Dumbbell, Settings } from 'lucide-react'; // Iconos lindos
import './Header.css';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { useData } from '../context/DataContext'; // Importar contexto
import { useLocation, useNavigate } from 'react-router-dom';

interface HeaderProps {
  onOpenCalendarSettings: () => void; // <--- Nueva prop
}


export const Header: React.FC<HeaderProps> = ({ onOpenCalendarSettings }) => {
  const { appSettings } = useData(); // Usar el contexto para obtener configuraciones
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  return (
    <header className="app-header">
      <nav className="nav-menu">
        
        {/* Usamos appSettings.show_xxx para mostrar/ocultar */}
        
        {/* BOTÓN ESTADÍSTICAS */}
        {appSettings.show_stats && (
          <button 
            className={`nav-btn ${isActive('/stats') ? 'active' : ''}`}
            onClick={() => navigate('/stats')}
          >
            <BarChart2 size={20} />
            <span className="nav-text">Estadísticas</span>
          </button>
        )}
        
        {/* BOTÓN CALENDARIO (Home) */}
        {appSettings.show_calendar && (
          <button 
            className={`nav-btn ${isActive('/') && location.pathname !== '/sports' ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            <Calendar size={20} />
            <span className="nav-text">Calendario</span>
          </button>
        )}
        
        {/* BOTÓN DEPORTE */}
        {appSettings.show_sports && (
          <button 
            className={`nav-btn ${isActive('/sports') || isActive('/routines') || isActive('/exercises') ? 'active' : ''}`} 
            onClick={() => navigate('/sports')}
          >
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