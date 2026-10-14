import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, Dumbbell, ArrowLeft, Trash2, Trophy } from 'lucide-react';
import {
  getProgressHistory,
  getStrengthHistory,
  deleteProgressEntry,
} from '../../services/statsService';
import { useNavigate } from 'react-router-dom';
import { getExercises } from '../../services/sportService';
import { WeightChart } from '../../components/Stats/WeightChart';
import { DashboardLayout } from '../../components/DashboardLayout';
import { AddProgressModal } from '../../components/Stats/AddProgressModal';
import './StatsPage.css';

export const StatsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'body' | 'strength'>('body');

  const [progressData, setProgressData] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [strengthData, setStrengthData] = useState<any[]>([]);

  useEffect(() => {
    loadBodyData();
    loadExercises();
  }, []);

  const loadBodyData = async () => {
    const data = await getProgressHistory();
    setProgressData(data || []);
  };

  const loadExercises = async () => {
    const exs = await getExercises();
    setExercises(exs);
    if (exs.length > 0) setSelectedExerciseId(exs[0].id.toString());
  };

  const handleDeleteEntry = async (id: number) => {
    if (!confirm('¿Borrar este registro de peso?')) return;
    try {
      await deleteProgressEntry(id);
      loadBodyData();
    } catch (e) {
      alert('Error borrando registro');
    }
  };

  useEffect(() => {
    if (selectedExerciseId) {
      getStrengthHistory(Number(selectedExerciseId)).then((data) => {
        setStrengthData((data || []).map((d) => ({ date: d.date, value: d.weight })));
      });
    }
  }, [selectedExerciseId]);

  // KPIs de peso corporal
  const latestWeight = progressData.length > 0 ? progressData[progressData.length - 1]?.weight : null;
  const firstWeight = progressData.length > 0 ? progressData[0]?.weight : null;
  const weightDiff =
    latestWeight !== null && firstWeight !== null
      ? Number((latestWeight - firstWeight).toFixed(1))
      : null;

  const selectedExerciseObj = exercises.find((e) => String(e.id) === selectedExerciseId);
  const maxStrengthPR =
    strengthData.length > 0 ? Math.max(...strengthData.map((d) => d.value)) : 0;

  return (
    <DashboardLayout isFullWidth={true}>
      <div className="stats-page-wrapper">
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
              <h1>Mi Progreso</h1>
              <p>Evolución de tu peso corporal y tus cargas en el gimnasio</p>
            </div>
          </div>

          <div className="stats-segmented-tabs">
            <button
              type="button"
              className={`seg-tab-btn ${tab === 'body' ? 'active' : ''}`}
              onClick={() => setTab('body')}
            >
              <TrendingUp size={16} />
              <span>Peso Corporal</span>
            </button>
            <button
              type="button"
              className={`seg-tab-btn ${tab === 'strength' ? 'active' : ''}`}
              onClick={() => setTab('strength')}
            >
              <Dumbbell size={16} />
              <span>Fuerza</span>
            </button>
          </div>
        </header>

        {/* --- PESTAÑA 1: PESO CORPORAL --- */}
        {tab === 'body' && (
          <div className="stats-section-stack">
            {/* Tarjetas resumen */}
            <div className="stats-kpi-strip">
              <div className="stats-kpi-box">
                <span>Último Peso</span>
                <strong>{latestWeight ? `${latestWeight} kg` : '--'}</strong>
              </div>
              <div className="stats-kpi-box">
                <span>Cambio Total</span>
                <strong
                  style={{
                    color:
                      weightDiff && weightDiff !== 0
                        ? 'var(--color-primary)'
                        : 'var(--color-text-main)',
                  }}
                >
                  {weightDiff !== null
                    ? `${weightDiff > 0 ? '+' : ''}${weightDiff} kg`
                    : '--'}
                </strong>
              </div>
              <div className="stats-kpi-box">
                <span>Registros</span>
                <strong>{progressData.length}</strong>
              </div>
            </div>

            {/* Gráfico de Peso */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Curva de Peso Corporal</h3>
                <button
                  type="button"
                  className="habits-new-primary-btn"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={16} /> Registrar Peso
                </button>
              </div>
              <WeightChart
                data={progressData.map((d) => ({ date: d.date, value: d.weight }))}
              />
            </div>

            {/* Galería / Historial de registros */}
            <div className="stats-history-block">
              <h3>Historial y Fotos ({progressData.length})</h3>

              {progressData.length === 0 ? (
                <div className="routines-empty-state">
                  <p>Aún no tienes registros de peso corporal.</p>
                </div>
              ) : (
                <div className="photos-grid">
                  {[...progressData].reverse().map((entry) => (
                    <div
                      key={entry.id}
                      className={`photo-card ${entry.photo_url ? 'has-photo' : 'text-only'}`}
                    >
                      {entry.photo_url ? (
                        <>
                          <img src={entry.photo_url} alt="Progreso" />
                          <div className="photo-overlay">
                            <span>{entry.date}</span>
                            <strong>{entry.weight} kg</strong>
                          </div>
                        </>
                      ) : (
                        <div className="weight-only-tile">
                          <span className="tile-date">{entry.date}</span>
                          <strong className="tile-weight">{entry.weight}</strong>
                          <span className="tile-unit">kg</span>
                        </div>
                      )}

                      <button
                        type="button"
                        className="delete-entry-fab"
                        onClick={() => handleDeleteEntry(entry.id)}
                        title="Borrar registro"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- PESTAÑA 2: PROGRESO DE FUERZA --- */}
        {tab === 'strength' && (
          <div className="stats-section-stack">
            {/* Selector de Ejercicio por Chips Deslizables + Buscador */}
            <div className="strength-selector-card">
              <span className="strength-label">Selecciona un ejercicio para ver su curva:</span>
              <div className="exercise-tags-strip">
                {exercises.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    className={`tag-filter-chip ${
                      String(ex.id) === selectedExerciseId ? 'active' : ''
                    }`}
                    onClick={() => setSelectedExerciseId(String(ex.id))}
                  >
                    {ex.name} {ex.last_weight > 0 ? `(${ex.last_weight}kg)` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <h3>{selectedExerciseObj?.name || 'Progreso en Cargas'}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Evolución histórica de peso levantado
                  </span>
                </div>
                {maxStrengthPR > 0 && (
                  <span className="pr-badge-pill">
                    <Trophy size={14} /> Récord: {maxStrengthPR} kg
                  </span>
                )}
              </div>

              <WeightChart data={strengthData} color="#ff9f43" unit="kg" />
            </div>
          </div>
        )}

        <AddProgressModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadBodyData}
        />
      </div>
    </DashboardLayout>
  );
};