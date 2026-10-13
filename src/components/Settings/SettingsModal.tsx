import React, { useState, useEffect } from 'react';
import {
  X,
  LayoutDashboard,
  Calendar,
  Dumbbell,
  BarChart2,
  Eye,
  EyeOff,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { syncCalendarSettings, saveCalendarSetting } from '../../services/googleService';
import type { CalendarConfig } from '../../types';
import './SettingsModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'general' | 'calendar' | 'sports' | 'stats';

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { session, googleToken, user, signOut } = useAuth();
  const { appSettings, updateAppSettings, refreshData, reconnectGoogleCalendar } = useData();

  const activeGoogleToken = session?.provider_token || googleToken;

  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [googleCalendars, setGoogleCalendars] = useState<CalendarConfig[]>([]);
  const [loadingCal, setLoadingCal] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'calendar' && activeGoogleToken) {
      setLoadingCal(true);
      syncCalendarSettings(activeGoogleToken)
        .then(setGoogleCalendars)
        .catch((err) => console.error('Error cargando calendarios:', err))
        .finally(() => setLoadingCal(false));
    }
  }, [isOpen, activeTab, activeGoogleToken]);

  const handleToggleGoogleCal = async (cal: CalendarConfig) => {
    const newConfig = { ...cal, is_visible: !cal.is_visible };
    setGoogleCalendars((prev) =>
      prev.map((c) => (c.google_id === cal.google_id ? newConfig : c))
    );
    await saveCalendarSetting(newConfig);
    refreshData();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* --- SIDEBAR (DESKTOP) / TABS SUPERIORES (MÓVIL) --- */}
        <div className="settings-sidebar">
          <div className="settings-sidebar-header">
            <h3 className="sidebar-title">Configuración</h3>
            <button onClick={onClose} className="mobile-close-btn" aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>

          <div className="settings-tabs-list">
            <SidebarBtn
              active={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
              icon={<LayoutDashboard size={17} />}
              label="Generales"
            />
            <SidebarBtn
              active={activeTab === 'calendar'}
              onClick={() => setActiveTab('calendar')}
              icon={<Calendar size={17} />}
              label="Calendario"
            />
            <SidebarBtn
              active={activeTab === 'sports'}
              onClick={() => setActiveTab('sports')}
              icon={<Dumbbell size={17} />}
              label="Deporte"
            />
            <SidebarBtn
              active={activeTab === 'stats'}
              onClick={() => setActiveTab('stats')}
              icon={<BarChart2 size={17} />}
              label="Stats"
            />
          </div>
        </div>

        {/* --- CONTENIDO PRINCIPAL --- */}
        <div className="settings-main">
          <button onClick={onClose} className="close-btn" aria-label="Cerrar">
            <X size={22} />
          </button>

          <div className="settings-scroll-body">
            {/* 1. GENERALES */}
            {activeTab === 'general' && (
              <div className="settings-section-stack">
                <h2 className="settings-h2">Ajustes Generales</h2>

                <div className="settings-card-group">
                  <p className="settings-subtitle">Visibilidad del Menú</p>
                  <p className="settings-desc">
                    Elige qué módulos quieres mostrar en la barra de navegación.
                  </p>

                  <ToggleRow
                    label="Mostrar Calendario"
                    checked={appSettings.show_calendar}
                    onChange={(v) => updateAppSettings({ ...appSettings, show_calendar: v })}
                  />
                  <ToggleRow
                    label="Mostrar Deporte"
                    checked={appSettings.show_sports}
                    onChange={(v) => updateAppSettings({ ...appSettings, show_sports: v })}
                  />
                  <ToggleRow
                    label="Mostrar Estadísticas"
                    checked={appSettings.show_stats}
                    onChange={(v) => updateAppSettings({ ...appSettings, show_stats: v })}
                  />
                </div>

                <div className="settings-card-group">
                  <p className="settings-subtitle">Apariencia</p>
                  <ToggleRow
                    label="Modo Oscuro"
                    checked={appSettings.theme === 'dark'}
                    onChange={(v) =>
                      updateAppSettings({ ...appSettings, theme: v ? 'dark' : 'light' })
                    }
                  />
                </div>

                <div className="settings-card-group account-group">
                  <div>
                    <p className="settings-subtitle" style={{ marginBottom: '2px' }}>
                      Cuenta activa
                    </p>
                    <p className="settings-desc" style={{ marginBottom: 0 }}>
                      {user?.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="settings-logout-btn"
                    onClick={() => {
                      onClose();
                      signOut();
                    }}
                  >
                    <LogOut size={16} />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. CALENDARIO */}
            {activeTab === 'calendar' && (
              <div className="settings-section-stack">
                <div className="settings-header-flex">
                  <h2 className="settings-h2" style={{ marginBottom: 0, borderBottom: 'none' }}>
                    Calendarios de Google
                  </h2>
                  <button
                    type="button"
                    className="sync-google-btn"
                    onClick={reconnectGoogleCalendar}
                  >
                    <RefreshCw size={14} />
                    <span>Resincronizar</span>
                  </button>
                </div>

                {!activeGoogleToken ? (
                  <div className="settings-card-group">
                    <p className="settings-desc">
                      La sesión de Google Calendar expiró. Conéctala para elegir qué calendarios ver.
                    </p>
                    <button
                      type="button"
                      className="sync-google-btn primary"
                      onClick={reconnectGoogleCalendar}
                    >
                      <RefreshCw size={15} />
                      <span>Conectar Google Calendar</span>
                    </button>
                  </div>
                ) : loadingCal ? (
                  <p className="settings-desc">Cargando tus calendarios...</p>
                ) : (
                  <div className="calendar-toggles-list">
                    {googleCalendars.map((cal) => (
                      <div
                        key={cal.google_id}
                        className="calendar-config-item"
                        onClick={() => handleToggleGoogleCal(cal)}
                      >
                        <div className="calendar-config-info">
                          <span
                            className="calendar-color-dot"
                            style={{ backgroundColor: cal.color }}
                          />
                          <span className="calendar-config-name">{cal.name}</span>
                        </div>
                        <button
                          type="button"
                          className="calendar-eye-btn"
                          aria-label="Cambiar visibilidad"
                        >
                          {cal.is_visible ? (
                            <Eye size={19} color="var(--color-primary)" />
                          ) : (
                            <EyeOff size={19} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. DEPORTE */}
            {activeTab === 'sports' && (
              <div className="settings-section-stack">
                <h2 className="settings-h2">Ajustes de Deporte</h2>
                <p className="settings-desc">
                  Próximamente podrás configurar tus unidades de peso (kg/lb) y tiempos de descanso
                  por defecto aquí.
                </p>
              </div>
            )}

            {/* 4. ESTADÍSTICAS */}
            {activeTab === 'stats' && (
              <div className="settings-section-stack">
                <h2 className="settings-h2">Ajustes de Estadísticas</h2>
                <p className="settings-desc">
                  Próximamente podrás definir tus metas semanales y mensuales.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SidebarBtn: React.FC<{
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`sidebar-btn ${active ? 'active' : ''}`}>
    {icon}
    <span>{label}</span>
  </button>
);

const ToggleRow: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <div className="toggle-row">
    <span>{label}</span>
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="slider"></span>
    </label>
  </div>
);