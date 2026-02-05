import React from 'react';
import { Header } from './Header';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
  onOpenSettings: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, onOpenSettings }) => {
  return (
    <div className="dashboard-container">
      <Header onOpenCalendarSettings={onOpenSettings} /> {/* <--- Pasamos la función */}
      <main className="main-content">{children}</main>
    </div>
  );
};