import React, { useState } from 'react';
import { Clock, ArrowRight, UserCheck } from 'lucide-react';
import { useSurfSchool } from '../context/SurfSchoolContext';
import { useConfirm } from './ui/Dialog';

export default function Module2Attendance({ onGoToNewClass }) {
  const {
    instructors,
    virtualQueue,
    checkInInstructor,
    checkOutInstructor,
    todayClasses,
    isLive,
  } = useSurfSchool();
  const [busyId, setBusyId] = useState(null);
  const confirm = useConfirm();
  const [error, setError] = useState('');

  const handleToggleCheckIn = async (inst) => {
    setError('');
    if (inst.checkedIn) {
      // Quitar el check-in pierde el turno: pedir confirmación para evitar clics accidentales
      const ok = await confirm({
        title: `Quitar la llegada de ${inst.name}`,
        message: 'Sale de la fila. Si vuelve a marcar, queda con la nueva hora de llegada.',
        confirmLabel: 'Quitar llegada',
        tone: 'danger',
      });
      if (!ok) return;
    }
    setBusyId(inst.id);
    try {
      if (inst.checkedIn) await checkOutInstructor(inst.id);
      else await checkInInstructor(inst.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const getInstructorClasses = (instructorId) =>
    todayClasses.filter(
      (c) => c.instructorId === instructorId && ['scheduled', 'completed'].includes(c.status)
    );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Cabecera de Módulo */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950 mt-1">
            Llegada de instructores
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed mt-1">
            Toca a cada instructor cuando llegue. La fila reparte las clases por turno: quien recibe una clase pasa al final.
          </p>
        </div>

        {onGoToNewClass && (
          <button
            type="button"
            onClick={onGoToNewClass}
            className="inline-flex items-center gap-2 h-11 px-4 bg-blue-950 hover:bg-sky-700 text-white text-sm font-semibold transition-colors self-start md:self-auto cursor-pointer"
          >
            <span>Ir a Ingreso de Clase</span>
            <ArrowRight aria-hidden="true" className="w-4 h-4 text-sky-400" />
          </button>
        )}
      </div>

      {/* Bloque 1: Panel de Check-in */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <UserCheck aria-hidden="true" className="w-5 h-5 text-sky-700" />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                ¿Quién llegó hoy?
              </h2>
            </div>
          </div>
          <span className="text-sm font-bold text-slate-600 tabular-nums">
            Activos: {virtualQueue.length} / {instructors.length}
          </span>
        </div>

        {error && (
          <div role="alert" className="p-3 border border-rose-300 bg-rose-50 text-sm text-rose-800">{error}</div>
        )}
        {isLive && instructors.length === 0 && (
          <div className="p-3 border border-amber-300 bg-amber-50 text-sm text-amber-900">
            Esta escuela aún no tiene instructores cargados en la base de datos (tabla instructors).
          </div>
        )}

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
                disabled={busyId === inst.id}
                className={`h-24 disabled:opacity-60 p-4 border text-left transition flex flex-col justify-between cursor-pointer ${
                  isCheckedIn
                    ? 'bg-blue-950 hover:bg-blue-900 text-white border-blue-950 border-t-4 border-t-sky-400'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-base font-bold tracking-tight">{inst.name}</span>
                  {isCheckedIn ? (
                    <span
                      className={`px-2 py-0.5 text-sm font-bold tabular-nums ${
                        isFirst
                          ? 'bg-sky-700 text-white'
                          : 'bg-blue-900 text-sky-200 border border-blue-800'
                      }`}
                    >
                      Turno #{queueItem?.queuePosition}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-slate-600">
                      Ausente
                    </span>
                  )}
                </div>

                <div
                  className={`text-sm tabular-nums font-medium flex items-center gap-1.5 ${
                    isCheckedIn ? 'text-sky-300' : 'text-slate-600'
                  }`}
                >
                  <Clock aria-hidden="true" className="w-3.5 h-3.5 text-sky-500" />
                  {isCheckedIn ? `Llegada ${inst.checkInTime} hrs` : 'Clic para marcar'}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Fila de turnos */}
      <section className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 space-y-4" aria-labelledby="fila-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-slate-200">
          <h2 id="fila-title" className="text-2xl font-bold text-blue-950">
            Fila de turnos
          </h2>
          <span className="text-base text-slate-700">Quien recibe una clase pasa al final</span>
        </div>

        {virtualQueue.length === 0 ? (
          <p className="p-6 text-center text-base text-slate-700">
            Nadie ha marcado su llegada hoy. Toca a cada instructor arriba cuando llegue.
          </p>
        ) : (
          <ol className="divide-y divide-slate-100">
            {virtualQueue.map((inst) => {
              const classesToday = getInstructorClasses(inst.id);
              const isFirst = inst.queuePosition === 1;
              return (
                <li key={inst.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span
                    className={`figure w-12 h-12 shrink-0 rounded-md flex items-center justify-center text-2xl ${
                      isFirst ? 'bg-blue-950 text-white' : 'bg-slate-100 text-slate-800'
                    }`}
                    aria-label={`Turno ${inst.queuePosition}`}
                  >
                    {inst.queuePosition}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold text-slate-900">
                      {inst.name}
                      {isFirst && <span className="ml-2 text-base font-semibold text-sky-700">Siguiente clase</span>}
                    </div>
                    <div className="text-base text-slate-700">
                      Llegó {inst.checkInTime} ·{' '}
                      {classesToday.length === 0
                        ? 'sin clases todavía'
                        : `${classesToday.length} ${classesToday.length === 1 ? 'clase' : 'clases'}: ${classesToday
                            .map((c) => `${c.startTime}–${c.endTime}`)
                            .join(', ')}`}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
