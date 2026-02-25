import React from 'react';
import { Header } from './Header';
import './DashboardLayout.css';
import { SettingsModal } from './Settings/SettingsModal'; // Asegurar import

interface DashboardLayoutProps {
  children: React.ReactNode;
  onOpenSettings?: () => void;
  // NUEVA PROP: Para desactivar el grid de 2 columnas
  isFullWidth?: boolean; 
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  onOpenSettings,
  isFullWidth = false // Por defecto es falso (para el Dashboard)
}) => {
  // Manejo interno del modal de settings si no se pasa función
  const [internalSettingsOpen, setInternalSettingsOpen] = React.useState(false);
  
  const handleOpenSettings = onOpenSettings || (() => setInternalSettingsOpen(true));

  return (
    <div className="dashboard-container">
      <Header onOpenCalendarSettings={handleOpenSettings} />
      
      {/* Clase dinámica: Si es fullWidth, cambiamos el CSS */}
      <main className={`main-content ${isFullWidth ? 'layout-full-width' : ''}`}>
        {children}
      </main>

      {/* Modal interno por si el padre no lo maneja */}
      {!onOpenSettings && (
        <SettingsModal isOpen={internalSettingsOpen} onClose={() => setInternalSettingsOpen(false)}/>
      )}
    </div>
  );
};