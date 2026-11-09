import React from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { useSurfSchool } from '../context/SurfSchoolContext';
import ModuleHeader from './ui/ModuleHeader';

export default function Module2Attendance({ onGoToNewClass }) {
  const {
    instructors,
    virtualQueue,
    checkInInstructor,
    checkOutInstructor,
    dailyClasses,
  } = useSurfSchool();

  const handleToggleCheckIn = (inst) => {
    if (inst.checkedIn) {
      checkOutInstructor(inst.id);
    } else {
      checkInInstructor(inst.id);
    }
  };

  const getInstructorClasses = (instructorId) =>
    dailyClasses.filter((c) => c.instructorId === instructorId);

  return (
    <div className="ed-stack">
      {/* Cabecera Two-Column Feature con BauhausArt */}
      <ModuleHeader
        eyebrow="Módulo 02 · Control de Personal"
        title="Fila de Asistencia"
        accent="e Instructores"
        description="Registra la llegada de cada instructor (Check-in) para activar la cola rotativa FIFO y balancear equitativamente la carga de clases."
        art="attendance"
        actions={
          onGoToNewClass ? (
            <button
              type="button"
              onClick={onGoToNewClass}
              className="ed-btn"
            >
              <span>Ir a Ingreso de Clase</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          ) : null
        }
        aside={
          <div className="ed-card p-4 sm:p-5 text-right w-full sm:w-auto">
            <span className="ed-caption ed-muted block">En turno hoy</span>
            <span className="font-display font-bold text-heading-xs text-signal-blue ed-num">
              {virtualQueue.length} <span className="text-midnight-ink font-usual text-subheading">/ {instructors.length}</span>
            </span>
          </div>
        }
      />

      {/* Bloques de Check-in */}
      <section className="ed-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-midnight-ink">
          <div>
            <span className="ed-eyebrow">Registro de Entrada</span>
            <h2 className="ed-h2 mt-1">
              1. Selección de Instructores Disponibles
            </h2>
          </div>
          <span className="ed-caption ed-muted">
            Haz clic en un recuadro para alternar entrada / salida
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {instructors.map((inst) => {
            const queueItem = virtualQueue.find((q) => q.id === inst.id);
            const isCheckedIn = inst.checkedIn;
            const isFirst = queueItem?.queuePosition === 1;

            return (
              <button
                key={inst.id}
                type="button"
                onClick={() => handleToggleCheckIn(inst)}
                className={`p-6 border text-left transition-colors flex flex-col justify-between cursor-pointer min-h-[140px] ${
                  isCheckedIn
                    ? 'bg-midnight-ink text-cream-paper border-midnight-ink'
                    : 'bg-cream-paper hover:bg-midnight-ink/5 text-midnight-ink border-midnight-ink'
                }`}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <span className="font-display font-bold text-subheading">
                    {inst.name}
                  </span>
                  {isCheckedIn ? (
                    <span
                      className={`ed-tag ${
                        isFirst
                          ? 'ed-tag-blue bg-signal-blue text-cream-paper border-signal-blue'
                          : 'border-cream-paper text-cream-paper'
                      }`}
                    >
                      #{queueItem?.queuePosition}
                    </span>
                  ) : (
                    <span className="ed-tag ed-muted border-midnight-ink/30">
                      Ausente
                    </span>
                  )}
                </div>

                <div
                  className={`ed-caption ed-num flex items-center gap-2 mt-4 ${
                    isCheckedIn ? 'text-cream-paper/80' : 'text-midnight-ink/60'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    {isCheckedIn ? `Llegada: ${inst.checkInTime} hrs` : 'Marcar llegada'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Tabla del Orden de la Fila Virtual */}
      <section className="ed-card space-y-6">
        <div className="pb-4 border-b border-midnight-ink">
          <span className="ed-eyebrow">Algoritmo FIFO</span>
          <h2 className="ed-h2 mt-1">
            2. Orden Vigente en Fila Virtual (Prioridad Operativa)
          </h2>
        </div>

        <div className="overflow-x-auto border border-midnight-ink">
          {virtualQueue.length === 0 ? (
            <div className="p-8 text-center ed-body ed-muted">
              No hay instructores activos en turno. Marca el check-in de al menos un instructor arriba.
            </div>
          ) : (
            <table className="ed-table">
              <thead>
                <tr>
                  <th className="w-24">Turno</th>
                  <th>Instructor</th>
                  <th>Hora Llegada</th>
                  <th>Carga Asignada Hoy</th>
                  <th className="text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {virtualQueue.map((inst) => {
                  const classesToday = getInstructorClasses(inst.id);
                  const isFirst = inst.queuePosition === 1;

                  return (
                    <tr key={inst.id}>
                      <td>
                        <span
                          className={`ed-tag ${
                            isFirst ? 'ed-tag-blue font-bold' : ''
                          }`}
                        >
                          #{inst.queuePosition}
                        </span>
                      </td>
                      <td>
                        <span className="font-bold text-midnight-ink">
                          {inst.name}
                        </span>
                        {isFirst && (
                          <span className="ml-3 ed-tag ed-tag-blue">
                            Siguiente en cola
                          </span>
                        )}
                      </td>
                      <td className="ed-num">
                        {inst.checkInTime} hrs
                      </td>
                      <td className="ed-num">
                        {classesToday.length === 0
                          ? 'Sin clases aún'
                          : `${classesToday.length} ${
                              classesToday.length === 1 ? 'sesión' : 'sesiones'
                            } (${classesToday
                              .map((c) => `${c.startTime}–${c.endTime}`)
                              .join(', ')})`}
                      </td>
                      <td className="text-right">
                        <span className="ed-tag ed-tag-ink">
                          En Turno
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
