import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, ArrowLeft, Dumbbell, PlayCircle, AlignLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getExercises } from '../../services/sportService';
import type { Exercise } from '../../types';
import { DashboardLayout } from '../../components/DashboardLayout';
import { CreateExerciseModal } from '../../components/Sports/CreateExerciseModal';
import { ExerciseDetailModal } from '../../components/Sports/ExerciseDetailModal';
import './ExercisesPage.css';

export const ExercisesPage: React.FC = () => {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getExercises();
      setExercises(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Extraer todos los tags únicos para crear los chips de filtro rápido
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    exercises.forEach((ex) => {
      (ex.tags || []).forEach((t) => {
        if (t.trim()) tagSet.add(t.trim());
      });
    });
    return Array.from(tagSet).sort();
  }, [exercises]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return exercises.filter((ex) => {
      const matchesTag =
        selectedTag === 'all' ||
        (ex.tags || []).some((t) => t.toLowerCase() === selectedTag.toLowerCase());
      const matchesSearch =
        !term ||
        ex.name.toLowerCase().includes(term) ||
        (ex.tags || []).some((t) => t.toLowerCase().includes(term));
      return matchesTag && matchesSearch;
    });
  }, [exercises, search, selectedTag]);

  return (
    <DashboardLayout isFullWidth={true}>
      <div className="exercises-page-wrapper">
        {/* HEADER */}
        <header className="routines-header-card">
          <div className="routines-header-left">
            <button
              type="button"
              className="habits-back-btn"
              onClick={() => navigate('/sports')}
              title="Volver a Deporte"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1>Biblioteca de Ejercicios</h1>
              <p>{exercises.length} ejercicios registrados con sus cargas y técnica</p>
            </div>
          </div>

          <button
            type="button"
            className="habits-new-primary-btn"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={18} />
            <span>Nuevo Ejercicio</span>
          </button>
        </header>

        {/* BARRA DE BÚSQUEDA + CHIPS DE TAGS */}
        <div className="exercises-filter-bar">
          <div className="search-input-box">
            <Search size={18} className="search-icon-inline" />
            <input
              type="text"
              placeholder="Buscar por nombre o músculo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {allTags.length > 0 && (
            <div className="exercise-tags-strip">
              <button
                type="button"
                className={`tag-filter-chip ${selectedTag === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedTag('all')}
              >
                Todos ({exercises.length})
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-filter-chip ${selectedTag === tag ? 'active' : ''}`}
                  onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GRILLA DE EJERCICIOS */}
        {loading ? (
          <div className="routines-empty-state">Cargando biblioteca...</div>
        ) : filtered.length === 0 ? (
          <div className="routines-empty-state">
            <Dumbbell size={40} strokeWidth={1.5} />
            <p>No se encontraron ejercicios con ese filtro</p>
            <button
              type="button"
              className="habits-new-primary-btn"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus size={18} /> Crear ejercicio
            </button>
          </div>
        ) : (
          <div className="exercises-modern-grid">
            {filtered.map((ex) => (
              <div
                key={ex.id}
                className="exercise-modern-card"
                onClick={() => setSelectedExercise(ex)}
              >
                <div className="ex-card-top">
                  <h3 className="ex-card-title">{ex.name}</h3>
                  <span
                    className={`ex-weight-pill ${ex.last_weight > 0 ? 'has-weight' : ''}`}
                  >
                    {ex.last_weight > 0 ? `${ex.last_weight} kg` : 'Sin peso'}
                  </span>
                </div>

                <div className="ex-card-bottom">
                  <div className="ex-tags-row">
                    {(ex.tags || []).slice(0, 3).map((t) => (
                      <span key={t} className="ex-mini-tag">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="ex-indicators">
                    {ex.notes && (
                      <span className="ex-media-badge" title="Tiene notas de técnica">
                        <AlignLeft size={13} />
                      </span>
                    )}
                    {ex.video_url && (
                      <span className="ex-media-badge video" title="Tiene video">
                        <PlayCircle size={14} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <CreateExerciseModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={loadData}
        />

        <ExerciseDetailModal
          isOpen={!!selectedExercise}
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
          onUpdate={() => {
            loadData();
            setSelectedExercise(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
};