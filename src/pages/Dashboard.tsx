import React, { useState, useEffect } from 'react';
import { addDays, subDays, format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { CalendarGrid } from '../components/Calendar/CalendarGrid';
import { DayPanel } from '../components/DayPanel/DayPanel';
import { SettingsModal } from '../components/Settings/SettingsModal';

export const Dashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Detectamos si estamos en vista móvil (< 900px, igual que tu breakpoint de CSS)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  // En móvil empezamos con el calendario mensual plegado para ir directo al grano (DayPanel)
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDataChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleMobileDateSelect = (date: Date) => {
    setSelectedDate(date);
    // Al elegir un día en el calendario mensual móvil, plegamos el mes para ver el día
    setShowMobileCalendar(false);
  };

  const goPrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const goToday = () => setSelectedDate(new Date());

  return (
    <DashboardLayout onOpenSettings={() => setIsSettingsOpen(true)}>
      {/* --- BARRA RÁPIDA DE DÍA (SOLO MÓVIL) --- */}
      {isMobile && (
        <div className="mobile-day-strip">
          <div className="mobile-day-nav">
            <button onClick={goPrevDay} className="mobile-day-arrow" aria-label="Día anterior">
              <ChevronLeft size={22} />
            </button>

            <div className="mobile-day-title" onClick={goToday}>
              <span className="mobile-day-name">
                {isToday(selectedDate) ? 'Hoy' : format(selectedDate, 'EEEE', { locale: es })}
              </span>
              <span className="mobile-day-date">
                {format(selectedDate, "d 'de' MMMM", { locale: es })}
              </span>
            </div>

            <button onClick={goNextDay} className="mobile-day-arrow" aria-label="Día siguiente">
              <ChevronRight size={22} />
            </button>
          </div>

          <button
            className={`mobile-calendar-toggle ${showMobileCalendar ? 'active' : ''}`}
            onClick={() => setShowMobileCalendar(prev => !prev)}
          >
            <CalIcon size={16} />
            <span>{showMobileCalendar ? 'Ocultar mes' : 'Ver mes'}</span>
            {showMobileCalendar ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      )}

      {/* --- IZQUIERDA: Calendario (Siempre visible en Desktop, Plegable en Móvil) --- */}
      {(!isMobile || showMobileCalendar) && (
        <div className="dashboard-calendar-card">
          <CalendarGrid
            selectedDate={selectedDate}
            onDateSelect={isMobile ? handleMobileDateSelect : setSelectedDate}
            refreshTrigger={refreshTrigger}
          />
        </div>
      )}

      {/* --- DERECHA: Panel del Día --- */}
      <div className="dashboard-daypanel-card">
        <DayPanel
          selectedDate={selectedDate}
          onDataChange={handleDataChange}
          hideHeader={isMobile}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </DashboardLayout>
  );
};