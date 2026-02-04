import React from 'react';
import { BarChart2, Calendar, Dumbbell } from 'lucide-react'; // Iconos lindos
import './Header.css';

export const Header: React.FC = () => {
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
      </nav>
    </header>
  );
};