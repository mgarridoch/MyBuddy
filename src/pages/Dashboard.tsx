import React, { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { CalendarGrid } from '../components/Calendar/CalendarGrid';
import { DayPanel } from '../components/DayPanel/DayPanel';

// CAMBIO 1: Importamos el nuevo Modal de Ajustes Generales
// (Asegúrate de que la ruta coincida donde creaste el archivo)
import { SettingsModal } from '../components/Settings/SettingsModal';

export const Dashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Le cambié el nombre para que tenga más sentido
  
  // ESTADO SEÑAL
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDataChange = () => {
    // Esto sigue siendo útil para cuando DayPanel cambia cosas locales
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <DashboardLayout onOpenSettings={() => setIsSettingsOpen(true)}>
      
      {/* IZQUIERDA: Calendario */}
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-card)' }}>
        <CalendarGrid 
          selectedDate={selectedDate} 
          onDateSelect={setSelectedDate} 
          refreshTrigger={refreshTrigger} 
        />
      </div>

      {/* DERECHA: Panel del Día */}
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-secondary)', padding: '20px', overflowY: 'auto' }}>
        <DayPanel 
          selectedDate={selectedDate} 
          onDataChange={handleDataChange} 
        />
      </div>

      {/* CAMBIO 2: El Nuevo Modal Global */}
      <SettingsModal 
         isOpen={isSettingsOpen}
         onClose={() => setIsSettingsOpen(false)}
         // Ya no necesitamos onUpdate={...} porque el modal actualiza el Contexto internamente
       />

    </DashboardLayout>
  );
};