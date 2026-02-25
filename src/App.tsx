import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <WorkoutProvider>
          <BrowserRouter>
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

              <Route path="/privacy" element={<PrivacyPage />} />
            </Routes>
          </BrowserRouter>
        </WorkoutProvider>
      </DataProvider>
    </AuthProvider>
  )
}

export default App