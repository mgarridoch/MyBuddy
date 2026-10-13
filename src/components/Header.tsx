import React from 'react';
import { BarChart2, Calendar, Dumbbell, Settings, ListTodo, LogOut } from 'lucide-react';
import './Header.css';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useLocation, useNavigate } from 'react-router-dom';

interface HeaderProps {
  onOpenCalendarSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCalendarSettings }) => {
  const { appSettings } = useData();
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Verificación exacta para '/' y por prefijo para las demás secciones
  const isHomeActive = location.pathname === '/' || location.pathname === '/day';
  const isTasksActive = location.pathname.startsWith('/tasks');
  const isSportsActive =
    location.pathname.startsWith('/sports') ||
    location.pathname.startsWith('/routines') ||
    location.pathname.startsWith('/exercises') ||
    location.pathname.startsWith('/workout-session');
  const isStatsActive =
    location.pathname.startsWith('/sportstats') || location.pathname.startsWith('/stats');

  return (
    <header className="app-header">
      <nav className="nav-menu" aria-label="Navegación principal">
        {/* BOTÓN CALENDARIO / HOY (Primero en móvil por ergonomía) */}
        {appSettings.show_calendar && (
          <button
            className={`nav-btn ${isHomeActive ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            <Calendar size={20} className="nav-icon" />
            <span className="nav-text">Calendario</span>
          </button>
        )}

        {/* BOTÓN TAREAS (GTD) */}
        <button
          className={`nav-btn ${isTasksActive ? 'active' : ''}`}
          onClick={() => navigate('/tasks')}
        >
          <ListTodo size={20} className="nav-icon" />
          <span className="nav-text">Tareas</span>
        </button>

        {/* BOTÓN DEPORTE */}
        {appSettings.show_sports && (
          <button
            className={`nav-btn ${isSportsActive ? 'active' : ''}`}
            onClick={() => navigate('/sports')}
          >
            <Dumbbell size={20} className="nav-icon" />
            <span className="nav-text">Deporte</span>
          </button>
        )}

        {/* BOTÓN ESTADÍSTICAS (Corregido a /sportstats según tu App.tsx) */}
        {appSettings.show_stats && (
          <button
            className={`nav-btn ${isStatsActive ? 'active' : ''}`}
            onClick={() => navigate('/sportstats')}
          >
            <BarChart2 size={20} className="nav-icon" />
            <span className="nav-text">Stats</span>
          </button>
        )}

        {/* BOTÓN CONFIGURACIÓN */}
        <button
          className="nav-btn"
          onClick={onOpenCalendarSettings}
          title="Configuración"
        >
          <Settings size={20} className="nav-icon" />
          <span className="nav-text">Config</span>
        </button>

        {/* BOTÓN LOGOUT (Solo en Desktop o separado para evitar toques accidentales) */}
        <button
          className="nav-btn nav-btn-logout"
          onClick={signOut}
          title="Cerrar sesión"
        >
          <LogOut size={20} className="nav-icon" />
          <span className="nav-text nav-text-logout">Salir</span>
        </button>
      </nav>
    </header>
  );
};