import React from 'react';
import { Clock, ArrowRight, UserCheck, Users } from 'lucide-react';
import { useSurfSchool } from '../context/SurfSchoolContext';

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
    <div className="max-w-5xl mx-auto space-y-8 font-inter">
      {/* Cabecera de Módulo */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
            Módulo 02 · Control de Personal & Rotación
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950 mt-1">
            Asistencia y Fila Virtual de Instructores
          </h1>
          <p className="text-sm font-light text-slate-600 leading-relaxed mt-1">
            Haz clic sobre la tarjeta de cada instructor para registrar su ingreso (Check-in) y mantener la cola FIFO de asignación equitativa.
          </p>
        </div>

        {onGoToNewClass && (
          <button
            type="button"
            onClick={onGoToNewClass}
            className="inline-flex items-center gap-2 h-10 px-4 bg-blue-950 hover:bg-sky-700 text-white text-xs font-semibold uppercase tracking-wider shadow-sm transition-colors self-start md:self-auto cursor-pointer"
          >
            <span>Ir a Ingreso de Clase</span>
            <ArrowRight className="w-4 h-4 text-sky-400" />
          </button>
        )}
      </div>

      {/* Bloque 1: Panel de Check-in */}
      <section className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-sky-600" />
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Paso 01
              </span>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Registro de Entrada Diario
              </h2>
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500 tabular-nums">
            Activos: {virtualQueue.length} / {instructors.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {instructors.map((inst) => {
            const queueItem = virtualQueue.find((q) => q.id === inst.id);
            const isCheckedIn = inst.checkedIn;
            const isFirst = queueItem?.queuePosition === 1;

            return (
              <button
                key={inst.id}
                type="button"
                onClick={() => handleToggleCheckIn(inst)}
                className={`h-24 p-4 border text-left transition flex flex-col justify-between cursor-pointer shadow-sm ${
                  isCheckedIn
                    ? 'bg-blue-950 hover:bg-blue-900 text-white border-blue-950 border-t-4 border-t-sky-400'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-base font-bold tracking-tight">{inst.name}</span>
                  {isCheckedIn ? (
                    <span
                      className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider tabular-nums ${
                        isFirst
                          ? 'bg-sky-500 text-white'
                          : 'bg-blue-900 text-sky-200 border border-blue-800'
                      }`}
                    >
                      Turno #{queueItem?.queuePosition}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Ausente
                    </span>
                  )}
                </div>

                <div
                  className={`text-xs tabular-nums font-medium flex items-center gap-1.5 ${
                    isCheckedIn ? 'text-sky-300' : 'text-slate-500 font-light'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  {isCheckedIn ? `Llegada ${inst.checkInTime} hrs` : 'Clic para marcar'}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Bloque 2: Orden de Fila Virtual */}
      <section className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Paso 02
              </span>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Orden Vigente en Fila Virtual (FIFO)
              </h2>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Regla: Equidad en Rotación
          </span>
        </div>

        <div className="border border-slate-200 overflow-hidden shadow-sm">
          {virtualQueue.length === 0 ? (
            <div className="p-8 text-center text-sm font-light text-slate-500">
              No hay instructores con Check-in activo hoy. Marca el ingreso arriba para inicializar la fila.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-blue-950 text-white text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 w-28">Posición</th>
                    <th className="py-3 px-4">Instructor</th>
                    <th className="py-3 px-4">Hora Entrada</th>
                    <th className="py-3 px-4">Carga Horaria Hoy</th>
                    <th className="py-3 px-4 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {virtualQueue.map((inst) => {
                    const classesToday = getInstructorClasses(inst.id);
                    const isFirst = inst.queuePosition === 1;

                    return (
                      <tr key={inst.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 tabular-nums font-bold text-blue-950">
                          <span
                            className={`inline-block px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                              isFirst
                                ? 'bg-blue-950 text-white border-l-4 border-sky-400'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            Turno #{inst.queuePosition}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-blue-950">
                          {inst.name}
                          {isFirst && (
                            <span className="ml-2 text-xs font-bold uppercase tracking-wider text-sky-700">
                              (Siguiente a Asignar)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 tabular-nums font-medium text-slate-700">
                          {inst.checkInTime} hrs
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-light text-sm">
                          {classesToday.length === 0 ? (
                            <span className="text-slate-400">Sin clases asignadas</span>
                          ) : (
                            <span className="tabular-nums font-medium text-slate-800">
                              {classesToday.length} {classesToday.length === 1 ? 'clase' : 'clases'}
                              <span className="text-slate-500 font-light ml-1.5">
                                ({classesToday.map((c) => `${c.startTime}–${c.endTime}`).join(', ')})
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300">
                            En Turno
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
