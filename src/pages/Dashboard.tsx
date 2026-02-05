import React, { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { CalendarGrid } from '../components/Calendar/CalendarGrid';
import { DayPanel } from '../components/DayPanel/DayPanel';
import { CalendarSettingsModal } from '../components/Calendar/CalendarSettingsModal';

export const Dashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarSettingsOpen, setIsCalendarSettingsOpen] = useState(false);
  // ESTADO SEÑAL
  // Usamos un contador. Cada vez que aumenta, React detecta un cambio.
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDataChange = () => {
    // Aumentamos el contador para forzar la recarga del calendario
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <DashboardLayout onOpenSettings={() => setIsCalendarSettingsOpen(true)}>
      {/* IZQUIERDA: Escucha la señal */}
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-card)' }}>
        <CalendarGrid 
          selectedDate={selectedDate} 
          onDateSelect={setSelectedDate} 
          refreshTrigger={refreshTrigger} // <--- SE LA PASAMOS
        />
      </div>

      {/* DERECHA: Emite la señal */}
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-secondary)', padding: '20px', overflowY: 'auto' }}>
        <DayPanel 
          selectedDate={selectedDate} 
          onDataChange={handleDataChange} // <--- LE DAMOS EL CALLBACK
        />
      </div>
      <CalendarSettingsModal 
         isOpen={isCalendarSettingsOpen}
         onClose={() => setIsCalendarSettingsOpen(false)}
         onUpdate={() => setRefreshTrigger(prev => prev + 1)} // Reusamos el trigger para recargar
       />
    </DashboardLayout>
  );
};