import React, { useState } from 'react';
import { addDays, subDays, format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DayPanel } from '../components/DayPanel/DayPanel';
import { useAuth } from '../context/AuthContext';

export const MobileDayPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const navigate = useNavigate();
  const { signOut } = useAuth(); // Para el header mínimo

  // Navegación simple
  const goPrev = () => setSelectedDate(prev => subDays(prev, 1));
  const goNext = () => setSelectedDate(prev => addDays(prev, 1));
  const goToday = () => setSelectedDate(new Date());

  // Detectar gestos (Swipe) podría ser un plus futuro, por ahora flechas.

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--color-bg)', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      
      {/* 1. HEADER MÓVIL (Muy minimalista) */}
      <header style={{
        padding: '10px 15px',
        backgroundColor: 'var(--color-secondary)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>MyBuddy</span>
        <div style={{display:'flex', gap:'15px'}}>
           {/* Botón para ir a vista de mes completa si se necesita */}
           <button onClick={() => navigate('/')} style={{color:'white'}} title="Ver Mes">
             <CalIcon size={20}/>
           </button>
           <button onClick={signOut} style={{color:'white'}}>
             <LogOut size={20}/>
           </button>
        </div>
      </header>

      {/* 2. BARRA DE NAVEGACIÓN DE DÍAS (Sticky) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 15px',
        backgroundColor: 'var(--color-white)',
        borderBottom: '1px solid #eee',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button onClick={goPrev} style={{padding:'5px'}}><ChevronLeft size={24} color="#666"/></button>
        
        <div style={{textAlign:'center', cursor:'pointer'}} onClick={goToday}>
          <div style={{fontWeight: 700, fontSize:'1rem', color: 'var(--color-text-main)', textTransform:'capitalize'}}>
            {isToday(selectedDate) ? 'Hoy' : format(selectedDate, 'EEEE', { locale: es })}
          </div>
          <div style={{fontSize:'0.8rem', color: 'var(--color-text-muted)'}}>
            {format(selectedDate, "d 'de' MMMM", { locale: es })}
          </div>
        </div>

        <button onClick={goNext} style={{padding:'5px'}}><ChevronRight size={24} color="#666"/></button>
      </div>

      {/* 3. EL PANEL DEL DÍA (Reutilizamos el componente) */}
      <div style={{ flex: 1, padding: '15px', overflowY: 'auto' }}>
        {/* Ocultamos el header interno del DayPanel por CSS o prop, ya que tenemos el nuestro arriba */}
        <DayPanel 
          selectedDate={selectedDate} 
          onDataChange={() => {}} // En móvil no necesitamos refrescar un calendario vecino
          hideHeader={true}
        />
      </div>

    </div>
  );
};