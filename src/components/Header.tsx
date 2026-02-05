import React from 'react';
import { BarChart2, Calendar, Dumbbell, Settings } from 'lucide-react'; // Iconos lindos
import './Header.css';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  onOpenCalendarSettings: () => void; // <--- Nueva prop
}


export const Header: React.FC<HeaderProps> = ({ onOpenCalendarSettings }) => {
  const { signOut } = useAuth();
  return (
    <header className="app-header">
      <nav className="nav-menu">
        <button className="nav-btn">
          <BarChart2 size={20} />
          <span className="nav-text">Estadísticas</span>
        </button>
        
        <button className="nav-btn active">
          <Calendar size={20} />
          <span className="nav-text">Calendario</span>
        </button>
        
        <button className="nav-btn">
          <Dumbbell size={20} />
          <span className="nav-text">Deporte</span>
        </button>
        <button className="nav-btn" onClick={onOpenCalendarSettings} title="Configurar Calendarios">
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