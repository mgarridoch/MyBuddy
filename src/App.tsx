import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { HabitsPage } from './pages/HabitsPage';
import { LoginPage } from './pages/LoginPage';
import { MobileDayPage } from './pages/MobileDayPage';
import { DataProvider } from './context/DataContext';
import { PrivacyPage } from './pages/PrivacyPage';
import { ExercisesPage } from './pages/Sports/ExercisesPage';
import { RoutinesPage } from './pages/Sports/RoutinesPage';
import { SportsHub } from './pages/Sports/SportsHub';
import { WorkoutSessionPage } from './pages/Sports/WorkoutSessionPage';
import { WorkoutProvider } from './context/WorkoutContext';
import { StatsPage } from './pages/Sports/StatsPage';
import { TasksPage } from './pages/Tasks/TasksPage';
import { App as CapApp } from '@capacitor/app';



function App() {
  // Escucha cuando tocas un Widget y navega con React Router a /sports o /
  const WidgetDeepLinkHandler = () => {
    const navigate = useNavigate();

    useEffect(() => {
      const sub = CapApp.addListener('appUrlOpen', ({ url }) => {
        if (url.includes('?path=')) {
          const path = new URL(url).searchParams.get('path');
          if (path) {
            navigate(path);
          }
        }
      });
      return () => {
        sub.then((s) => s.remove());
      };
    }, [navigate]);

    return null;
  };
  return (
    <AuthProvider>
      <DataProvider>
        <WorkoutProvider>
          <BrowserRouter>
            <WidgetDeepLinkHandler />
            <Routes>
              {/* Ruta pública */}
              <Route path="/login" element={<LoginPage />} />

              {/* Rutas Protegidas */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              <Route path="/day" element={
                <ProtectedRoute>
                  <MobileDayPage />
                </ProtectedRoute>
              } />
              
              <Route path="/habits" element={
                <ProtectedRoute>
                  <HabitsPage />
                </ProtectedRoute>
              } />

              <Route path="/exercises" element={
              <ProtectedRoute>
                <ExercisesPage />
              </ProtectedRoute>
              } />

              <Route path="/routines" element={
              <ProtectedRoute>
                <RoutinesPage />
              </ProtectedRoute>
              } />

              <Route path="/sports" element={
              <ProtectedRoute>
                <SportsHub />
              </ProtectedRoute>
              } />

              <Route path="/workout-session" element={
              <ProtectedRoute>
                <WorkoutSessionPage />
              </ProtectedRoute>
              } />

              <Route path="/sportstats" element={
              <ProtectedRoute>
                <StatsPage />
              </ProtectedRoute>
              } />

              <Route path="/tasks" element={
              <ProtectedRoute>
                <TasksPage />
              </ProtectedRoute>
              } />

              <Route path="/privacy" element={<PrivacyPage />} />
            </Routes>
          </BrowserRouter>
        </WorkoutProvider>
      </DataProvider>
    </AuthProvider>
  )
}

export default App