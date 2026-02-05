import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { HabitsPage } from './pages/HabitsPage';
import { LoginPage } from './pages/LoginPage';
import { MobileDayPage } from './pages/MobileDayPage';
import { DataProvider } from './context/DataContext';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
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
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  )
}

export default App