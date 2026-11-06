import React from 'react';
import { Clock, ArrowRight } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-300">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-sky-600">
            <span className="w-2 h-2 bg-pink-600 inline-block" />
            Módulo 02 · Control de Personal
          </span>
          <h1 className="text-2xl font-bold text-blue-950 mt-1">
            Asistencia y Fila Virtual de Instructores
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Haz clic sobre el bloque de cada instructor para registrar su entrada (Check-in) y ordenar la fila de asignación.
          </p>
        </div>

        {onGoToNewClass && (
          <button
            type="button"
            onClick={onGoToNewClass}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-sm bg-blue-950 hover:bg-blue-900 border-b-2 border-pink-600 text-white text-sm font-semibold transition self-start md:self-auto cursor-pointer"
          >
            Ir a Ingreso de Clase
            <ArrowRight className="w-4 h-4 text-sky-400" />
          </button>
        )}
      </div>

      {/* Bloques Rectangulares de Check-in (Diego, Jose, Vitoco, Caco, Alfred) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
            1. Panel de Check-in (Seleccionar para Activar / Desactivar)
          </h2>
          <span className="text-xs font-medium text-slate-500">
            Activos: {virtualQueue.length} / {instructors.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {instructors.map((inst) => {
            const queueItem = virtualQueue.find((q) => q.id === inst.id);
            const isCheckedIn = inst.checkedIn;
            const isFirst = queueItem?.queuePosition === 1;

            return (
              <button
                key={inst.id}
                type="button"
                onClick={() => handleToggleCheckIn(inst)}
                className={`h-24 p-4 rounded-none border text-left transition flex flex-col justify-between cursor-pointer ${
                  isCheckedIn
                    ? 'bg-blue-950 hover:bg-blue-900 text-white border-blue-950 border-b-2 border-b-pink-600'
                    : 'bg-white hover:bg-sky-50 text-blue-950 border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-lg font-bold tracking-tight">{inst.name}</span>
                  {isCheckedIn ? (
                    <span
                      className={`px-2 py-0.5 font-mono text-xs font-semibold rounded-none ${
                        isFirst
                          ? 'bg-pink-600 text-white'
                          : 'bg-sky-500 text-white'
                      }`}
                    >
                      #{queueItem?.queuePosition}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium uppercase text-slate-400">
                      Ausente
                    </span>
                  )}
                </div>

                <div
                  className={`text-xs font-mono flex items-center gap-1.5 ${
                    isCheckedIn ? 'text-sky-300' : 'text-slate-500'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {isCheckedIn ? `Check-in ${inst.checkInTime}` : 'Marcar entrada'}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Tabla Corporativa de Orden de la Fila Virtual */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
          2. Orden Vigente en Fila Virtual (Prioridad de Sugerencia)
        </h2>

        <div className="border border-slate-300 bg-white rounded-none overflow-hidden">
          {virtualQueue.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No hay instructores con Check-in activo. Selecciona a los instructores en el panel superior.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-950 text-white text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-24">Posición</th>
                  <th className="py-3 px-4">Instructor</th>
                  <th className="py-3 px-4">Hora Llegada</th>
                  <th className="py-3 px-4">Carga Horaria Hoy</th>
                  <th className="py-3 px-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {virtualQueue.map((inst) => {
                  const classesToday = getInstructorClasses(inst.id);
                  const isFirst = inst.queuePosition === 1;

                  return (
                    <tr key={inst.id} className="even:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-950">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs rounded-none ${
                            isFirst
                              ? 'bg-pink-600 text-white'
                              : 'bg-sky-100 text-blue-950 border border-sky-300'
                          }`}
                        >
                          #{inst.queuePosition}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-blue-950">
                        {inst.name}
                        {isFirst && (
                          <span className="ml-2 text-xs font-semibold text-pink-600 uppercase">
                            [Prioridad #1]
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {inst.checkInTime} hrs
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {classesToday.length === 0
                          ? 'Sin clases asignadas'
                          : `${classesToday.length} ${
                              classesToday.length === 1 ? 'clase' : 'clases'
                            } (${classesToday
                              .map((c) => `${c.startTime}–${c.endTime}`)
                              .join(', ')})`}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xs font-semibold text-sky-600 uppercase">
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
