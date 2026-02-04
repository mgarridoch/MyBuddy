import React from 'react';
import { Header } from './Header';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="dashboard-container">
      <Header />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};