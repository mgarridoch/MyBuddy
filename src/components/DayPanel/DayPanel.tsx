import React, { useEffect, useState } from 'react';
import { format, isAfter, startOfDay, getDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, CheckSquare, ListTodo, PenLine, Settings, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import './DayPanel.css';

// Servicios y Tipos
import { getMyHabits, getDayLogs, toggleHabitLog } from '../../services/habitService';
import { getTasks, createTask, toggleTask, deleteTask, getDayNote, saveDayNote } from '../../services/dailyService';
import type { Habit, Task } from '../../types';

interface DayPanelProps {
  selectedDate: Date;
  onDataChange: () => void; // Nueva prop para indicar cambios de datos
}

export const DayPanel: React.FC<DayPanelProps> = ({ selectedDate, onDataChange }) => {
  const navigate = useNavigate();
  const isFuture = isAfter(startOfDay(selectedDate), startOfDay(new Date()));
  
  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  
  // Hábitos
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedHabitIds, setCompletedHabitIds] = useState<number[]>([]);
  
  // Tareas
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Notas
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // --- CARGA DE DATOS ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Cargar Hábitos (Tu lógica anterior)
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

        // 2. Cargar Tareas
        setTasks(await getTasks(selectedDate));

        // 3. Cargar Nota
        setNoteContent(await getDayNote(selectedDate));

      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);


  // --- HANDLERS HÁBITOS ---
const handleToggleHabit = async (habitId: number, isChecked: boolean) => {
  // 1. Actualización optimista
  if (isChecked) {
    setCompletedHabitIds([...completedHabitIds, habitId]);
    
    // --- EFECTO CONFETI ---
    // Solo lanzamos confeti si marcamos (no al desmarcar)
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }, // Sale desde un poco más abajo del centro
      colors: ['#9381ff', '#b8b8ff', '#ffd8be'], // Tus colores
      disableForReducedMotion: true // Respetar preferencias de usuario
    });

  } else {
    setCompletedHabitIds(completedHabitIds.filter(id => id !== habitId));
  }

  // 2. Guardar en BD
  await toggleHabitLog(habitId, selectedDate, isChecked);
  onDataChange();
};


  // --- HANDLERS TAREAS ---
  const handleCreateTask = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      try {
        const newTask = await createTask(newTaskTitle, selectedDate);
        setTasks([...tasks, newTask]);
        setNewTaskTitle('');
      } catch (err) { console.error(err); }
    }
  };

  const handleToggleTask = async (taskId: number, isChecked: boolean) => {
    // Actualización optimista
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, completed: isChecked } : t);
    setTasks(updatedTasks);
    await toggleTask(taskId, isChecked);
  };

  const handleDeleteTask = async (taskId: number) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTasks);
    await deleteTask(taskId);
  };


  // --- HANDLERS NOTAS ---
  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      await saveDayNote(selectedDate, noteContent);
    } catch (err) { console.error(err); }
    finally { setIsSavingNote(false); }
  };

  return (
    <div className="panel-container">
      <div className="panel-header">
        <h2 className="panel-date-title">
          {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
        </h2>
      </div>

      {/* EVENTOS */}
      <section>
        <div className="section-title"><CalendarIcon size={18} /> Eventos</div>
        <div className="item-list"><div className="empty-msg">- No hay eventos -</div></div>
      </section>

      {/* RUTINAS */}
      <section>
        <div className="section-title" style={{justifyContent: 'space-between'}}>
          <div style={{display: 'flex', gap: '8px', alignItems:'center'}}>
            <CheckSquare size={18} /> Rutinas
          </div>
          <Settings size={16} style={{cursor:'pointer'}} color="var(--color-text-muted)" onClick={() => navigate('/habits')} />
        </div>
        
        {/* (Aquí va tu lógica de visualización de rutinas que ya tenías...) */}
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

      {/* TAREAS */}
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
          
          {/* Input Nueva Tarea */}
          <div className="item-row" style={{background: 'transparent', paddingLeft: 0}}>
             <Plus size={18} color="var(--color-secondary)"/>
             <input 
               type="text" 
               placeholder="Agregar nueva tarea..." 
               value={newTaskTitle}
               onChange={(e) => setNewTaskTitle(e.target.value)}
               onKeyDown={handleCreateTask}
               style={{border: 'none', background:'transparent', width:'100%', outline:'none', fontSize:'0.95rem'}}
             />
          </div>
        </div>
      </section>

      {/* NOTAS */}
      <section>
        <div className="section-title" style={{justifyContent:'space-between'}}>
          <div style={{display:'flex', gap:'8px'}}><PenLine size={18} /> Notas</div>
          {isSavingNote && <span style={{fontSize:'0.7rem', color:'var(--color-secondary)'}}>Guardando...</span>}
        </div>
        <textarea 
          className="notes-area" 
          placeholder={`Escribe algo sobre este día...`}
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          onBlur={handleSaveNote} // Guarda cuando quitas el click del area
        />
      </section>
    </div>
  );
};