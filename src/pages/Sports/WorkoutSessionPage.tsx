import React, { useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { Navigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Circle, Timer, Save } from 'lucide-react';
import './WorkoutSession.css';

export const WorkoutSessionPage: React.FC = () => {
  const { activeSession, elapsedSeconds, updateLog, finishWorkout, cancelWorkout } = useWorkout();
  
  // Estado para saber si estamos viendo el detalle de un ejercicio (por índice)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Si no hay sesión activa, expulsar al Home
  if (!activeSession) return <Navigate to="/sports" />;

  // Formato de tiempo (MM:SS)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- VISTA 2: DETALLE DE EJERCICIO ---
  if (focusedIndex !== null) { 
    const item = activeSession.exercises[focusedIndex];
    const log = activeSession.logs[focusedIndex]; // Acceso por índice correcto
    
    if (!item) return null;

    return (
      <div className="workout-focus-container">
        {/* Header Detalle */}
        <div className="focus-header">
          <button onClick={() => setFocusedIndex(null)} className="back-btn">
            <ArrowLeft size={24}/>
          </button>
          <h3>{item.exercise.name}</h3>
          <span className="timer-badge">{formatTime(elapsedSeconds)}</span>
        </div>

        {/* Video */}
        <div className="focus-video">
          {item.exercise.video_url ? (
            <video src={item.exercise.video_url} controls loop playsInline />
          ) : (
            <div className="no-video">Sin video</div>
          )}
        </div>

        {/* Formulario */}
        <div className="focus-form">
          <div className="input-group">
            <label>Peso (kg)</label>
            <input 
              type="number" 
              value={log.weight} 
              onChange={e => updateLog(focusedIndex, { weight: Number(e.target.value) })}
            />
          </div>
          <div className="input-group">
            <label>Reps</label>
            <input 
              type="text" 
              value={log.reps} 
              onChange={e => updateLog(focusedIndex, { reps: e.target.value })}
            />
          </div>
        </div>

        {/* Botón Completar */}
        <button 
          className="complete-btn"
          onClick={() => {
            updateLog(focusedIndex, { done: true });
            setFocusedIndex(null); // Volver a lista
          }}
        >
          <CheckCircle size={24} /> ¡COMPLETAR EJERCICIO!
        </button>
      </div>
    );
  }

  // --- VISTA 1: RESUMEN LISTA ---
  return (
    <div className="workout-overview-container">
      
      {/* Header Fijo */}
      <div className="workout-header-sticky">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <h2 className="routine-title">{activeSession.routineTitle}</h2>
            <div className="timer-display"><Timer size={16}/> {formatTime(elapsedSeconds)}</div>
          </div>
          <button onClick={cancelWorkout} style={{color:'#ff6b6b', fontSize:'0.8rem'}}>Cancelar</button>
        </div>
      </div>

      {/* Lista de Ejercicios */}
      <div className="workout-list">
        {activeSession.exercises.map((item, index) => { // <--- AQUÍ CAPTURAMOS EL INDEX
          const log = activeSession.logs[index]; // <--- CORRECCIÓN CLAVE: Usamos index, no ID
          
          // Protección extra por si acaso el log no existe aún (aunque debería)
          if (!log) return null; 
          
          const isDone = log.done;

          return (
            <div 
              key={index} // Usamos index como key porque puede haber ejercicios repetidos
              className={`workout-item-card ${isDone ? 'done' : ''}`}
              onClick={() => setFocusedIndex(index)} // Pasamos el índice para abrir detalle
            >
              <div className="workout-item-info">
                <h4>{item.exercise.name}</h4>
                <p>{item.sets} series x {log.reps} reps @ {log.weight}kg</p>
              </div>
              
              {/* Checkbox Rápido */}
              <button 
                className={`quick-check ${isDone ? 'checked' : ''}`}
                onClick={(e) => {
                  e.stopPropagation(); 
                  updateLog(index, { done: !isDone }); // Usamos index para actualizar
                }}
              >
                {isDone ? <CheckCircle size={28} /> : <Circle size={28} />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer Fijo: Terminar */}
      <div className="workout-footer">
        <button className="finish-workout-btn" onClick={finishWorkout}>
          <Save size={20}/> TERMINAR ENTRENAMIENTO
        </button>
      </div>

    </div>
  );
};