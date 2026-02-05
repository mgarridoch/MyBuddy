import React, { useEffect, useState } from 'react';
import { format, isAfter, startOfDay, getDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, CheckSquare, ListTodo, PenLine, Settings, X, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './DayPanel.css';

// Servicios y Tipos
import { getMyHabits, getDayLogs, toggleHabitLog } from '../../services/habitService';
import { getTasks, createTask, toggleTask, deleteTask, getDayNote, saveDayNote } from '../../services/dailyService';
import { getGoogleEvents, deleteGoogleEvent } from '../../services/googleService';
import { useAuth } from '../../context/AuthContext';
import type { Habit, Task } from '../../types';
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
  const isFuture = isAfter(startOfDay(selectedDate), startOfDay(new Date()));
  
  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  
  // Hábitos
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedHabitIds, setCompletedHabitIds] = useState<number[]>([]);
  
  // Tareas y Notas
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Google Calendar
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [googleError, setGoogleError] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false); // Estado para abrir el modal

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    setLoading(true);
    setGoogleError(false);
    try {
      // 1. Hábitos
      const allHabits = await getMyHabits();
      let dayOfWeek = getDay(selectedDate); 
      if (dayOfWeek === 0) dayOfWeek = 7; 

      const todaysHabits = allHabits.filter(h => {
        const isScheduledForToday = h.frequency.includes(dayOfWeek);
        if (!isScheduledForToday) return false;
        if (h.created_at) {
          const viewDate = startOfDay(selectedDate);
          const creationDate = startOfDay(new Date(h.created_at));
          if (isBefore(viewDate, creationDate)) return false;
        }
        return true;
      });
      setHabits(todaysHabits);
      setCompletedHabitIds(await getDayLogs(selectedDate));

      // 2. Tareas y Notas
      setTasks(await getTasks(selectedDate));
      setNoteContent(await getDayNote(selectedDate));

      // 3. Google Calendar
      if (session?.provider_token) {
        try {
          const gEvents = await getGoogleEvents(session.provider_token, selectedDate);
          setGoogleEvents(gEvents);
        } catch (err) {
          console.error("Error Google Calendar:", err);
          setGoogleError(true);
        }
      }
    } catch (error) {
      console.error("Error general:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, session]);


  // --- HANDLERS ---
  const handleToggleHabit = async (habitId: number, isChecked: boolean) => {
    if (isChecked) {
      setCompletedHabitIds([...completedHabitIds, habitId]);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#9381ff', '#b8b8ff', '#ffd8be'], disableForReducedMotion: true });
    } else {
      setCompletedHabitIds(completedHabitIds.filter(id => id !== habitId));
    }
    await toggleHabitLog(habitId, selectedDate, isChecked);
    onDataChange();
  };

  const handleCreateTask = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      const newTask = await createTask(newTaskTitle, selectedDate);
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
    }
  };

  const handleToggleTask = async (taskId: number, isChecked: boolean) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: isChecked } : t));
    await toggleTask(taskId, isChecked);
  };

  const handleDeleteTask = async (taskId: number) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    await deleteTask(taskId);
  };

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    await saveDayNote(selectedDate, noteContent);
    setIsSavingNote(false);
  };

  // --- HANDLER BORRAR EVENTO GOOGLE ---
  const handleDeleteGoogleEvent = async (calendarId: string, eventId: string) => {
    if (!confirm('¿Eliminar evento de Google Calendar?')) return;
    try {
      await deleteGoogleEvent(session!.provider_token!, calendarId, eventId);
      onDataChange(); // Actualizar grilla
      // Actualizar lista localmente rápido
      setGoogleEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (e) { alert('Error eliminando evento'); }
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

      {/* ---------------- SECCIÓN EVENTOS GOOGLE ---------------- */}
      <section>
        <div className="section-title" style={{justifyContent: 'space-between'}}>
           <div style={{display:'flex', gap:'8px'}}><CalendarIcon size={18} /> Eventos</div>
           {/* Botón AGREGAR EVENTO */}
           {session?.provider_token && (
             <button onClick={() => setIsAddEventOpen(true)} style={{color:'var(--color-primary)', cursor:'pointer'}} title="Crear evento">
               <Plus size={20}/>
             </button>
           )}
        </div>
        
        <div className="item-list">
          {googleError && (
             <div className="empty-msg" style={{color: '#ff6b6b'}}>
               ⚠️ Error conexión Google. Intenta reconectar.
             </div>
          )}

          {!googleError && googleEvents.length === 0 ? (
            <div className="empty-msg">- No hay eventos -</div>
          ) : (
            googleEvents.map(ev => (
              <div key={ev.id} className="item-row" style={{ alignItems: 'stretch', position:'relative', paddingRight: '40px' }}>
                
                {/* Visual del Evento */}
                <div style={{
                  display:'flex', 
                  flexDirection:'column', 
                  borderLeft: `4px solid ${ev.color || 'var(--color-primary)'}`, 
                  paddingLeft: '12px',
                  justifyContent: 'center'
                }}>
                  <div style={{display:'flex', gap:'8px', alignItems:'baseline'}}>
                    <span style={{ fontSize: '0.85rem', color: ev.color, fontWeight: 700, minWidth:'60px' }}>
                      {ev.time}
                    </span>
                  </div>
                  <span className="item-text" style={{fontWeight: 500}}>
                    {ev.title}
                  </span>
                </div>

                {/* Botón BORRAR Evento */}
                <button 
                  onClick={() => handleDeleteGoogleEvent(ev.calendarId, ev.id)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)', padding:'5px', cursor:'pointer'
                  }}
                  title="Eliminar evento"
                >
                  <Trash2 size={16}/>
                </button>

              </div>
            ))
          )}
        </div>
      </section>

      {/* ---------------- SECCIÓN RUTINAS ---------------- */}
      <section>
        <div className="section-title" style={{justifyContent: 'space-between'}}>
          <div style={{display: 'flex', gap: '8px', alignItems:'center'}}>
            <CheckSquare size={18} /> Rutinas
          </div>
          <Settings size={16} style={{cursor:'pointer'}} color="var(--color-text-muted)" onClick={() => navigate('/habits')} />
        </div>
        
        {loading ? <div className="empty-msg">Cargando...</div> : 
         isFuture ? <div className="empty-msg">⏳ No puedes completar rutinas del futuro.</div> :
         habits.length === 0 ? <div className="empty-msg">No hay rutinas hoy.</div> :
         <div className="item-list">
            {habits.map((habit, index) => {
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

      {/* ---------------- SECCIÓN TAREAS ---------------- */}
      <section>
        <div className="section-title"><ListTodo size={18} /> Tareas de Hoy</div>
        <div className="item-list">
          {tasks.map(task => (
            <div key={task.id} className="item-row" style={{justifyContent: 'space-between'}}>
              <label style={{display:'flex', gap:'10px', alignItems:'center', flex: 1, cursor:'pointer'}}>
                <input type="checkbox" className="custom-checkbox" checked={task.completed} onChange={(e) => handleToggleTask(task.id, e.target.checked)} />
                <span className={`item-text ${task.completed ? 'completed' : ''}`}>{task.title}</span>
              </label>
              <button onClick={() => handleDeleteTask(task.id)} style={{color: 'var(--color-text-muted)', padding:'5px'}}><X size={14}/></button>
            </div>
          ))}
          
          <div className="item-row" style={{background: 'transparent', paddingLeft: 0}}>
             <Plus size={18} color="var(--color-secondary)"/>
             <input 
               type="text" placeholder="Agregar nueva tarea..." value={newTaskTitle}
               onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={handleCreateTask}
               style={{border: 'none', background:'transparent', width:'100%', outline:'none', fontSize:'0.95rem'}}
             />
          </div>
        </div>
      </section>

      {/* ---------------- SECCIÓN NOTAS ---------------- */}
      <section>
        <div className="section-title" style={{justifyContent:'space-between'}}>
          <div style={{display:'flex', gap:'8px'}}><PenLine size={18} /> Notas</div>
          {isSavingNote && <span style={{fontSize:'0.7rem', color:'var(--color-secondary)'}}>Guardando...</span>}
        </div>
        <textarea 
          className="notes-area" placeholder={`Escribe algo sobre este día...`}
          value={noteContent} onChange={(e) => setNoteContent(e.target.value)} onBlur={handleSaveNote}
        />
      </section>

      {/* ---------------- MODAL AGREGAR EVENTO ---------------- */}
      <AddEventModal 
        isOpen={isAddEventOpen} 
        onClose={() => setIsAddEventOpen(false)} 
        selectedDate={selectedDate}
        onSuccess={() => {
          onDataChange(); // Actualizar grilla
          fetchData();    // Recargar lista local
        }}
      />
    </div>
  );
};