import React, { useState } from 'react';
import { format, isAfter, startOfDay, getDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, CheckSquare, ListTodo, PenLine, Settings, X, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './DayPanel.css';

// Servicios y Tipos
import { toggleHabitLog } from '../../services/habitService';
import { createTask, toggleTask, deleteTask, saveDayNote } from '../../services/dailyService';
import { deleteGoogleEvent } from '../../services/googleService';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext'; // <--- IMPORTANTE
import confetti from 'canvas-confetti';

// Importamos el Modal Nuevo
import { AddEventModal } from '../Calendar/AddEventModal'; 

interface DayPanelProps {
  selectedDate: Date;
  onDataChange: () => void;
  hideHeader?: boolean; 
}

export const DayPanel: React.FC<DayPanelProps> = ({ selectedDate, onDataChange, hideHeader = false }) => {
  const navigate = useNavigate();
  const { session } = useAuth();
  
  // USAMOS EL CONTEXTO GLOBAL (Smart Cache)
  const { habits, habitLogs, tasks, notes, googleEvents, refreshData } = useData();
  
  // --- ESTADOS LOCALES (Solo para la UI inmediata) ---
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  const isFuture = isAfter(startOfDay(selectedDate), startOfDay(new Date()));
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // ---------------------------------------------------------
  // FILTRADO INSTANTÁNEO EN MEMORIA (Sin carga)
  // ---------------------------------------------------------
  
  // 1. Filtrar Hábitos del día
  let dayOfWeek = getDay(selectedDate); 
  if (dayOfWeek === 0) dayOfWeek = 7; 

  const todaysHabits = habits.filter(h => {
    const isScheduled = h.frequency.includes(dayOfWeek);
    if (!isScheduled) return false;
    if (h.created_at) {
      const viewDate = startOfDay(selectedDate);
      const creationDate = startOfDay(new Date(h.created_at));
      if (isBefore(viewDate, creationDate)) return false;
    }
    return true;
  });

  const completedHabitIds = habitLogs
    .filter(log => log.date === dateStr)
    .map(log => log.habit_id);

  // 2. Filtrar Tareas del día
  const todaysTasks = tasks.filter(t => t.date === dateStr);

  const totalTasksCount = todaysTasks.length;
  const doneTasksCount = todaysTasks.filter(t => t.completed).length;
  const pendingTasks = todaysTasks.filter(t => !t.completed);
  const completedTasks = todaysTasks.filter(t => t.completed);

  // 3. Obtener Nota del día
  const todaysNoteContent = notes.find(n => n.date === dateStr)?.content || '';

  // 4. Filtrar Eventos de Google
  const todaysEvents = googleEvents.filter(ev => ev.date === dateStr);

  // ---------------------------------------------------------
  // HANDLERS (Llaman a la BD y luego actualizan la memoria)
  // ---------------------------------------------------------
  
  const handleToggleHabit = async (habitId: number, isChecked: boolean) => {
    if (isChecked) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#9381ff', '#b8b8ff', '#ffd8be'] });
    }
    await toggleHabitLog(habitId, selectedDate, isChecked);
    refreshData(); // Esto actualiza habitLogs en el contexto automáticamente
    onDataChange(); // Actualiza el calendario
  };

// 1. Función genérica para guardar (sin depender del evento)
  const submitNewTask = async () => {
    if (newTaskTitle.trim()) {
      const titleToSave = newTaskTitle; // Guardamos ref local
      setNewTaskTitle(''); // Limpiamos UI rápido
      await createTask(titleToSave, selectedDate);
      refreshData();
    }
  };

  // 2. Handler para el teclado (Enter)
  const handleTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Evita que salte al siguiente input
      submitNewTask();
    }
  };

  const handleToggleTask = async (taskId: number, isChecked: boolean) => {
    await toggleTask(taskId, isChecked);
    refreshData();
  };

  const handleDeleteTask = async (taskId: number) => {
    await deleteTask(taskId);
    refreshData();
  };

  const handleSaveNote = async (newContent: string) => {
    if (newContent === todaysNoteContent) return; // Evitar guardado si no cambió
    setIsSavingNote(true);
    await saveDayNote(selectedDate, newContent);
    await refreshData();
    setIsSavingNote(false);
  };

  const handleDeleteGoogleEvent = async (calendarId: string, eventId: string) => {
    if (!calendarId) {
      alert("Error: No se encontró el ID del calendario para este evento.");
      return;
    }
    if (!confirm('¿Eliminar evento de Google Calendar?')) return;
    
    try {
      await deleteGoogleEvent(session!.provider_token!, calendarId, eventId);
      refreshData(); // Esto actualizará el cache y hará que desaparezca de la UI
      onDataChange(); // Esto actualizará los puntitos/barras del calendario
    } catch (e) { 
      alert('Error eliminando evento'); 
    }
  };

  return (
    <div className="panel-container">
      {!hideHeader && (
        <div className="panel-header">
          <h2 className="panel-date-title">
            {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
          </h2>
        </div>
      )}

      {/* SECCIÓN EVENTOS GOOGLE */}
      <section>
        <div className="section-title" style={{justifyContent: 'space-between'}}>
           <div style={{display:'flex', gap:'8px'}}><CalendarIcon size={18} /> Eventos</div>
           {session?.provider_token && (
             <button onClick={() => setIsAddEventOpen(true)} style={{color:'var(--color-primary)', cursor:'pointer'}}>
               <Plus size={20}/>
             </button>
           )}
        </div>
        
        <div className="item-list">
          {todaysEvents.length === 0 ? (
            <div className="empty-msg">- No hay eventos -</div>
          ) : (
            todaysEvents.map(ev => (
              <div key={ev.id} className="item-row" style={{ alignItems: 'stretch', position:'relative', paddingRight: '40px' }}>
                <div style={{ display:'flex', flexDirection:'column', borderLeft: `4px solid ${ev.color}`, paddingLeft: '12px', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: ev.color, fontWeight: 700 }}>{ev.time}</span>
                  <span className="item-text" style={{fontWeight: 500}}>{ev.title}</span>
                </div>
                <button onClick={() => handleDeleteGoogleEvent(ev.calendarId, ev.id)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                  <Trash2 size={16}/>
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* SECCIÓN RUTINAS */}
      <section>
        <div className="section-title" style={{justifyContent: 'space-between'}}>
          <div style={{display: 'flex', gap: '8px', alignItems:'center'}}><CheckSquare size={18} /> Rutinas</div>
          <Settings size={16} style={{cursor:'pointer'}} color="var(--color-text-muted)" onClick={() => navigate('/habits')} />
        </div>
        
        {isFuture ? <div className="empty-msg">⏳ No puedes completar rutinas del futuro.</div> :
         todaysHabits.length === 0 ? <div className="empty-msg">No hay rutinas hoy.</div> :
         <div className="item-list">
            {todaysHabits.map((habit, index) => {
              const isDone = completedHabitIds.includes(habit.id);
              return (
                <label key={habit.id} className="item-row animate-in" style={{animationDelay: `${index * 0.05}s`}}> 
                  <input type="checkbox" className="custom-checkbox" checked={isDone} onChange={(e) => handleToggleHabit(habit.id, e.target.checked)}/>
                  <span className={`item-text ${isDone ? 'completed' : ''}`}>{habit.name}</span>
                </label>
              );
            })}
         </div>
        }
      </section>

      {/* SECCIÓN TAREAS */}
      <section>
        <div className="section-title">
          <ListTodo size={18} /> 
          Tareas de Hoy {totalTasksCount > 0 && `(${doneTasksCount}/${totalTasksCount})`}
        </div>

        <div className="item-list">
          {/* A. MOSTRAR PRIMERO LAS PENDIENTES */}
          {pendingTasks.map(task => (
            <div key={task.id} className="item-row" style={{justifyContent: 'space-between'}}>
              <label style={{display:'flex', gap:'10px', alignItems:'center', flex: 1, cursor:'pointer'}}>
                <input type="checkbox" className="custom-checkbox" checked={task.completed} onChange={(e) => handleToggleTask(task.id, e.target.checked)} />
                <span className="item-text">{task.title}</span>
              </label>
              <button onClick={() => handleDeleteTask(task.id)} style={{color: 'var(--color-text-muted)', cursor:'pointer'}}><X size={14}/></button>
            </div>
          ))}

          {/* B. BOTÓN PARA MOSTRAR/OCULTAR COMPLETADAS */}
          {completedTasks.length > 0 && (
            <button 
              onClick={() => setShowCompletedTasks(!showCompletedTasks)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'none', border: 'none', padding: '8px 5px',
                color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 600,
                cursor: 'pointer', opacity: 0.8
              }}
            >
              {showCompletedTasks ? 'v Ocultar' : '> Mostrar'} tareas completadas ({completedTasks.length})
            </button>
          )}

          {/* C. LISTA DE COMPLETADAS (Condicional) */}
          {showCompletedTasks && completedTasks.map(task => (
            <div key={task.id} className="item-row" style={{justifyContent: 'space-between', opacity: 0.6}}>
              <label style={{display:'flex', gap:'10px', alignItems:'center', flex: 1, cursor:'pointer'}}>
                <input type="checkbox" className="custom-checkbox" checked={task.completed} onChange={(e) => handleToggleTask(task.id, e.target.checked)} />
                <span className="item-text completed">{task.title}</span>
              </label>
              <button onClick={() => handleDeleteTask(task.id)} style={{color: 'var(--color-text-muted)', cursor:'pointer'}}><X size={14}/></button>
            </div>
          ))}
          
          {/* INPUT PARA NUEVA TAREA (Siempre al final) */}
          <div className="item-row" style={{background: 'transparent', paddingLeft: 0, marginTop: '5px'}}>
             <button onClick={submitNewTask} style={{ background: 'none', border: 'none', padding: '5px', cursor: 'pointer' }}>
               <Plus size={18} color="var(--color-primary)"/>
             </button>
             <input 
               type="text" placeholder="Agregar nueva tarea..." value={newTaskTitle}
               onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={handleTaskKeyDown}
               enterKeyHint="done"
               style={{border: 'none', background:'transparent', width:'100%', outline:'none', fontSize:'0.95rem', color: 'var(--color-text-main)'}}
             />
          </div>
        </div>
      </section>
      {/* SECCIÓN NOTAS */}
      <section>
        <div className="section-title" style={{justifyContent:'space-between'}}>
          <div style={{display:'flex', gap:'8px'}}><PenLine size={18} /> Notas</div>
          {isSavingNote && <span style={{fontSize:'0.7rem', color:'var(--color-secondary)'}}>Guardando...</span>}
        </div>
        <textarea 
          className="notes-area" placeholder={`Escribe algo...`}
          defaultValue={todaysNoteContent} // Usamos defaultValue para que sea editable
          onBlur={(e) => handleSaveNote(e.target.value)}
        />
      </section>

      <AddEventModal 
        isOpen={isAddEventOpen} onClose={() => setIsAddEventOpen(false)} 
        selectedDate={selectedDate}
        onSuccess={() => { onDataChange(); refreshData(); }}
      />
    </div>
  );
};