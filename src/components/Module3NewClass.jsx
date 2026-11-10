import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  AlertTriangle,
  RotateCcw,
  Trash2,
  User,
  Users,
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
  ArrowRight,
  MessageSquare,
  X,
  Phone,
  Mail,
  ShieldAlert,
  Calendar,
  Plus,
  Layers,
} from 'lucide-react';
import { useSurfSchool, MAX_COURSE_PACK_SESSIONS } from '../context/SurfSchoolContext';
import { addDaysToIsoDate, formatIsoToDisplayDate } from '../utils/dates';
import {
  calculateStudentSubtotal,
  formatCurrency,
  getInstructorConflicts,
  addMinutesToTime,
  timeToMinutes,
  validateClassSlot,
} from '../utils/calculations';

const PAYMENT_OPTIONS = [
  { id: 'Transferencia', label: 'Transferencia', icon: Smartphone },
  { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'Tarjeta', label: 'Tarjeta', icon: CreditCard },
];

const QUICK_BLOCKS = ['09:00', '10:30', '12:00', '15:00', '16:30', '18:00'];

const STATUS_LABELS = {
  scheduled: 'Agendada',
  pending_instructor: 'Sin instructor',
  completed: 'Realizada',
  no_show: 'No asistió',
  cancelled: 'Cancelada',
};

/**
 * Normaliza un número de teléfono para usar en https://wa.me/<numero>
 */
function normalizeWhatsAppPhone(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 9 && digits.startsWith('9')) {
    return `56${digits}`;
  }
  if (digits.length === 8) {
    return `569${digits}`;
  }
  return digits;
}

export default function Module3NewClass() {
  const {
    schoolBranding,
    schoolConfig,
    instructors,
    virtualQueue,
    classes,
    todayIso,
    addSingleClass,
    addCoursePack,
    addSessionToPack,
    assignInstructorToClass,
    setClassStatus,
    getClassesToRemove,
    removeClass,
    getSuggestedInstructorForSlot,
    getInstructorName,
    sunsetTime,
    sunsetIsFallback,
  } = useSurfSchool();
  const classDuration = Number(schoolConfig.classDurationMinutes) || 75;
  const [formError, setFormError] = useState('');
  const [tableError, setTableError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [logView, setLogView] = useState('today');
  const [firstSessionDate, setFirstSessionDate] = useState(todayIso);

  // Paso 1: Naturaleza de la Clase
  const [modality, setModality] = useState('individual');
  const [pax, setPax] = useState(2);
  const [category, setCategory] = useState('unica');

  // Paso 2: Finanzas y Cobro
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Transferencia');

  // Paso 3: Asignación y Agenda (+1h 15m)
  const [startTime, setStartTime] = useState('10:30');
  const endTime = useMemo(() => addMinutesToTime(startTime, classDuration), [startTime, classDuration]);
  // La clase única siempre es hoy; un curso puede partir otro día
  const sessionOneDate = category === 'curso' ? firstSessionDate || todayIso : todayIso;
  const sessionOneIsToday = sessionOneDate === todayIso;

  const [extraCourseSessions, setExtraCourseSessions] = useState([]);

  const exceedsSunset = useMemo(() => {
    if (!sunsetTime || !sessionOneIsToday) return false;
    return timeToMinutes(endTime) > timeToMinutes(sunsetTime);
  }, [endTime, sunsetTime]);

  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Datos del Alumno y Contacto de Emergencia
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  const [lastSavedClass, setLastSavedClass] = useState(null);

  const effectivePax = modality === 'grupal' ? Math.max(2, Number(pax) || 2) : 1;

  const subtotal = useMemo(() => {
    return calculateStudentSubtotal(schoolConfig, {
      modality,
      pax: effectivePax,
      category,
    });
  }, [schoolConfig, modality, effectivePax, category]);

  const numericDiscount = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const finalTotal = Math.max(0, subtotal - numericDiscount);

  const suggestionInfo = useMemo(() => {
    if (!sessionOneIsToday) {
      return {
        suggestedInstructor: null,
        skippedInstructors: [],
        reason: 'La fila de turnos aplica solo a clases de hoy: elige el instructor manualmente o déjalo por definir.',
      };
    }
    return getSuggestedInstructorForSlot(startTime, endTime);
  }, [startTime, endTime, getSuggestedInstructorForSlot, sessionOneIsToday]);

  useEffect(() => {
    if (!isManualOverride) {
      if (suggestionInfo.suggestedInstructor) {
        setSelectedInstructorId(suggestionInfo.suggestedInstructor.id);
      } else {
        // Sin sugerencia: no se preselecciona a nadie (evita doble reserva silenciosa)
        setSelectedInstructorId('');
      }
    }
  }, [suggestionInfo, isManualOverride]);

  const selectedInstructorConflicts = useMemo(() => {
    return getInstructorConflicts(selectedInstructorId, startTime, endTime, classes, sessionOneDate);
  }, [selectedInstructorId, startTime, endTime, classes, sessionOneDate]);

  const slotErrors = useMemo(
    () =>
      validateClassSlot({
        startTime,
        endTime,
        openTime: schoolConfig.openTime,
        closeTime: schoolConfig.closeTime,
        sunsetTime: sessionOneIsToday && !sunsetIsFallback ? sunsetTime : null,
      }),
    [startTime, endTime, schoolConfig.openTime, schoolConfig.closeTime, sessionOneIsToday, sunsetIsFallback, sunsetTime]
  );

  const submitBlockers = [
    ...slotErrors,
    ...(selectedInstructorConflicts.length > 0 ? ['El instructor seleccionado ya tiene clase en ese horario.'] : []),
    ...(category === 'unica' && !selectedInstructorId ? ['Selecciona un instructor libre.'] : []),
    ...(category === 'curso' && sessionOneDate < todayIso ? ['La sesión #1 no puede ser en una fecha pasada.'] : []),
  ];

  const handleModalitySelect = (value) => {
    setModality(value);
    if (value === 'individual') {
      setPax(1);
    } else if (pax < 2) {
      setPax(2);
    }
  };

  const handleCategorySelect = (nextCategory) => {
    setCategory(nextCategory);
    setFormError('');
    if (nextCategory === 'curso' && extraCourseSessions.length === 0) {
      setFirstSessionDate(todayIso);
      setExtraCourseSessions([
        {
          tempId: `ses-${Date.now()}-2`,
          operationDate: addDaysToIsoDate(todayIso, 1),
          startTime: startTime || '10:30',
          instructorId: '',
          followsMain: true,
        },
      ]);
    }
  };

  const handleAddFutureCourseSession = () => {
    if (1 + extraCourseSessions.length >= MAX_COURSE_PACK_SESSIONS) return;
    const baseDate =
      extraCourseSessions.length > 0
        ? extraCourseSessions[extraCourseSessions.length - 1].operationDate
        : sessionOneDate;

    setExtraCourseSessions((prev) => [
      ...prev,
      {
        tempId: `ses-${Date.now()}-${prev.length + 2}`,
        operationDate: addDaysToIsoDate(baseDate, 1),
        startTime: startTime || '10:30',
        instructorId: '',
      },
    ]);
  };

  const handleUpdateFutureSession = (tempId, field, value) => {
    setExtraCourseSessions((prev) =>
      prev.map((s) =>
        s.tempId === tempId
          ? { ...s, [field]: value, ...(field === 'instructorId' ? { followsMain: false } : {}) }
          : s
      )
    );
  };

  /** Las sesiones del curso son del instructor de la sesión #1, salvo que se cambien a mano */
  const sessionInstructorId = (ses) => (ses.followsMain ? selectedInstructorId : ses.instructorId);

  const handleRemoveFutureSession = (tempId) => {
    setExtraCourseSessions((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  /** Problemas de una sesión futura del pack (horario, fecha, choque de instructor) */
  const getFutureSessionIssues = (ses) => {
    const sesEnd = addMinutesToTime(ses.startTime || '10:30', classDuration);
    const issues = validateClassSlot({
      startTime: ses.startTime,
      endTime: sesEnd,
      openTime: schoolConfig.openTime,
      closeTime: schoolConfig.closeTime,
    });
    if (!ses.operationDate || ses.operationDate < todayIso) issues.push('Fecha pasada.');
    const instId = sessionInstructorId(ses);
    if (instId) {
      const c = getInstructorConflicts(instId, ses.startTime, sesEnd, classes, ses.operationDate);
      if (c.length > 0) issues.push(`${getInstructorName(instId)} ocupado ${c[0].startTime}–${c[0].endTime}.`);
    }
    return issues;
  };

  const futureSessionBlockers =
    category === 'curso'
      ? extraCourseSessions.flatMap((ses, idx) =>
          getFutureSessionIssues(ses).length > 0 ? [`Revisa la sesión #${idx + 2}.`] : []
        )
      : [];
  const allBlockers = [...submitBlockers, ...futureSessionBlockers];

  const handleInstructorChange = (e) => {
    const newId = e.target.value;
    setSelectedInstructorId(newId);
    const suggestedId = suggestionInfo.suggestedInstructor?.id;
    setIsManualOverride(newId !== suggestedId);
  };

  const handleRestoreSuggestion = () => {
    setIsManualOverride(false);
    if (suggestionInfo.suggestedInstructor) {
      setSelectedInstructorId(suggestionInfo.suggestedInstructor.id);
    }
  };

  const openStudentWhatsApp = (classData) => {
    if (!classData) return;

    const cleanPhone = normalizeWhatsAppPhone(classData.studentPhone);
    const formattedNumber = Math.round(Number(classData.total) || 0).toLocaleString('es-CL');
    const schoolName = schoolBranding?.displayName || 'Escuela de Surf';

    const lines = [
      `*Confirmación de Clase - ${schoolName}*`,
      `Alumno: ${classData.studentName}`,
      `Fecha: ${formatIsoToDisplayDate(classData.operationDate || todayIso)}`,
      `Horario: ${classData.startTime} - ${classData.endTime} hrs`,
      `Instructor: ${classData.instructorName}`,
      classData.isPaidInPack
        ? 'Pago: incluido en tu pack de curso'
        : `Total pagado: $${formattedNumber}${classData.method ? ` (${classData.method})` : ''}`,
    ];

    if (Array.isArray(classData.scheduledSessions) && classData.scheduledSessions.length > 1) {
      lines.push(`Sesiones del curso (${classData.scheduledSessions.length}/${MAX_COURSE_PACK_SESSIONS}):`);
      classData.scheduledSessions.forEach((s) => {
        lines.push(
          `  • Sesión #${s.sessionIndex}: ${formatIsoToDisplayDate(s.operationDate)} (${s.startTime}–${s.endTime}) · Inst: ${getInstructorName(s.instructorId)}`
        );
      });
    }

    const baseUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=` : 'https://wa.me/?text=';
    window.open(baseUrl + encodeURIComponent(lines.join('\n')), '_blank', 'noopener,noreferrer');
  };

  const resetForm = () => {
    setModality('individual');
    setPax(2);
    setCategory('unica');
    setExtraCourseSessions([]);
    setFirstSessionDate(todayIso);
    setDiscount('');
    setPaymentMethod('Transferencia');
    setStudentName('');
    setStudentPhone('');
    setStudentEmail('');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setIsManualOverride(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (allBlockers.length > 0) {
      setFormError(allBlockers.join(' '));
      return;
    }

    const wasSuggested =
      suggestionInfo.suggestedInstructor?.id === selectedInstructorId && !isManualOverride;
    const student = {
      studentName: studentName.trim() || 'Alumno',
      studentPhone: studentPhone.trim(),
      studentEmail: studentEmail.trim(),
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
    };

    setIsSaving(true);
    try {
      if (category === 'curso') {
        const created = await addCoursePack({
          modality,
          pax: effectivePax,
          discount: numericDiscount,
          paymentMethod,
          ...student,
          sessions: [
            {
              operationDate: sessionOneDate,
              startTime,
              instructorId: selectedInstructorId || null,
              wasSuggestedByQueue: wasSuggested,
            },
            ...extraCourseSessions.map((s) => ({
              operationDate: s.operationDate,
              startTime: s.startTime || '10:30',
              instructorId: sessionInstructorId(s) || null,
            })),
          ],
        });
        const first = created[0];
        setLastSavedClass({
          ...first,
          instructorName: getInstructorName(first.instructorId),
          total: first.finalTotal,
          method: first.paymentMethod,
          scheduledSessions: created,
        });
      } else {
        const created = await addSingleClass({
          modality,
          pax: effectivePax,
          discount: numericDiscount,
          paymentMethod,
          startTime,
          instructorId: selectedInstructorId,
          wasSuggestedByQueue: wasSuggested,
          ...student,
        });
        setLastSavedClass({
          ...created,
          instructorName: getInstructorName(created.instructorId),
          total: created.finalTotal,
          method: created.paymentMethod,
        });
      }
      resetForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------- Bitácora: acciones por fila ----------------
  const runRowAction = async (fn) => {
    setTableError('');
    try {
      await fn();
    } catch (err) {
      setTableError(err.message);
    }
  };

  const handleRemoveClass = (cls) => {
    const ids = getClassesToRemove(cls.id);
    const message =
      ids.length > 1
        ? `Esta es la sesión #1 del curso de ${cls.studentName}: contiene el pago completo del pack. Eliminarla borra las ${ids.length} sesiones del curso y su ingreso en caja. ¿Continuar?`
        : `¿Eliminar la clase de ${cls.studentName} (${cls.startTime}–${cls.endTime})?`;
    if (!window.confirm(message)) return;
    runRowAction(() => removeClass(cls.id));
  };

  const handleAddPackSession = (cls) => {
    const packSessions = classes.filter((c) => c.courseGroupId === cls.courseGroupId);
    const last = packSessions[packSessions.length - 1] || cls;
    const date = window.prompt('Fecha de la nueva sesión (AAAA-MM-DD):', addDaysToIsoDate(last.operationDate, 1));
    if (!date) return;
    const time = window.prompt('Hora de inicio (HH:MM):', last.startTime);
    if (!time) return;
    // Por defecto, el instructor dueño del curso (sesión #1); si está ocupado queda "Por definir"
    runRowAction(() =>
      addSessionToPack(cls.courseGroupId, { operationDate: date.trim(), startTime: time.trim() })
    );
  };

  const visibleClasses = useMemo(
    () =>
      logView === 'today'
        ? classes.filter((c) => c.operationDate === todayIso)
        : classes.filter((c) => c.operationDate > todayIso),
    [classes, logView, todayIso]
  );

  const totalPlannedSessions = category === 'curso' ? 1 + extraCourseSessions.length : 1;

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-inter">
      {/* Cabecera */}
      <div className="pb-6 border-b border-slate-200">
        <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
          Módulo 03 · Registro Operativo & Agenda
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-blue-950 mt-1">
          Ingreso de Nueva Clase
        </h1>
        <p className="text-sm font-light text-slate-600 leading-relaxed mt-1">
          Flujo guiado de admisión. El término (+1h 15m), la liquidación del instructor y el turno de la fila se calculan automáticamente.
        </p>
      </div>

      {/* Banner de Confirmación Exitosa */}
      {lastSavedClass && (
        <div className="bg-emerald-50 border border-emerald-300 border-l-4 border-l-emerald-600 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-blue-950 tracking-tight flex flex-wrap items-center gap-2">
                <span>
                  {lastSavedClass.scheduledSessions?.length > 1
                    ? `Curso Pack Registrado (${lastSavedClass.scheduledSessions.length} sesiones)`
                    : 'Clase Registrada Exitosamente'}
                </span>
                {lastSavedClass.courseGroupId && (
                  <span className="px-2 py-0.5 text-xs font-mono bg-blue-950 text-sky-300 uppercase">
                    Pack #{String(lastSavedClass.courseGroupId).slice(0, 8)}
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-700 font-light mt-1">
                Alumno: <strong className="font-semibold text-blue-950">{lastSavedClass.studentName}</strong>{' '}
                {lastSavedClass.studentPhone && (
                  <span className="font-mono text-xs tabular-nums text-slate-600">
                    ({lastSavedClass.studentPhone})
                  </span>
                )}{' '}
                · Horario:{' '}
                <strong className="font-mono font-medium tabular-nums text-slate-900">
                  {lastSavedClass.startTime} - {lastSavedClass.endTime} hrs
                </strong>{' '}
                · Instructor: <strong className="font-semibold text-blue-950">{lastSavedClass.instructorName}</strong> ·
                Total Caja: <strong className="font-mono font-semibold tabular-nums text-blue-950">{formatCurrency(lastSavedClass.total)}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openStudentWhatsApp(lastSavedClass)}
              className="h-10 px-4 bg-blue-950 hover:bg-sky-700 text-white text-xs font-semibold uppercase tracking-wider shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-sky-400" />
              Notificar por WhatsApp
            </button>

            <button
              type="button"
              onClick={() => setLastSavedClass(null)}
              className="h-10 w-10 border border-slate-300 bg-white hover:bg-slate-50 text-slate-500 flex items-center justify-center transition cursor-pointer shadow-sm"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Formulario Secuencial */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* PASO 1: Naturaleza de la Clase */}
        <section className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Paso 01
              </span>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Naturaleza de la Clase
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Modalidad & Categoría</span>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-sky-700">
                1. Modalidad Operativa
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleModalitySelect('individual')}
                  className={`h-14 px-5 border text-sm font-semibold transition flex items-center justify-between cursor-pointer ${
                    modality === 'individual'
                      ? 'bg-blue-950 text-white border-blue-950 border-t-4 border-t-sky-400 shadow-sm'
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <User className={`w-4 h-4 ${modality === 'individual' ? 'text-sky-400' : 'text-slate-500'}`} />
                    Individual
                  </span>
                  <span className="text-xs font-mono uppercase opacity-80">1 Pax</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModalitySelect('grupal')}
                  className={`h-14 px-5 border text-sm font-semibold transition flex items-center justify-between cursor-pointer ${
                    modality === 'grupal'
                      ? 'bg-blue-950 text-white border-blue-950 border-t-4 border-t-sky-400 shadow-sm'
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Users className={`w-4 h-4 ${modality === 'grupal' ? 'text-sky-400' : 'text-slate-500'}`} />
                    Grupal
                  </span>
                  <span className="text-xs font-mono uppercase opacity-80">2+ Pax</span>
                </button>
              </div>
            </div>

            {modality === 'grupal' && (
              <div className="p-4 bg-slate-50 border border-slate-200 space-y-2">
                <label htmlFor="pax-input" className="block text-xs font-bold uppercase tracking-widest text-sky-700">
                  Cantidad de Alumnos en el Grupo (Mínimo 2)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPax((p) => Math.max(2, Number(p) - 1))}
                    className="h-11 w-12 border border-slate-200 bg-white hover:bg-slate-50 text-base font-bold text-blue-950 transition cursor-pointer shadow-sm"
                  >
                    −
                  </button>
                  <input
                    id="pax-input"
                    type="number"
                    min="2"
                    max="25"
                    value={pax}
                    onChange={(e) => setPax(Math.max(2, Number(e.target.value) || 2))}
                    className="flex-1 h-11 px-4 border border-slate-200 bg-white text-center text-base font-semibold tabular-nums text-blue-950 focus:border-blue-950 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setPax((p) => Number(p) + 1)}
                    className="h-11 w-12 border border-slate-200 bg-white hover:bg-slate-50 text-base font-bold text-blue-950 transition cursor-pointer shadow-sm"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs font-light text-slate-500">
                  Tarifa base 2 pax: {formatCurrency(schoolConfig.priceGroupBase)} +{' '}
                  {formatCurrency(schoolConfig.priceGroupExtraPax)} por alumno adicional.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-sky-700">
                2. Categoría de Servicio
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleCategorySelect('unica')}
                  className={`h-14 px-5 border text-sm font-semibold transition flex items-center justify-between cursor-pointer ${
                    category === 'unica'
                      ? 'bg-blue-950 text-white border-blue-950 border-t-4 border-t-sky-400 shadow-sm'
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Clase Única</span>
                  <span className="text-xs font-mono uppercase opacity-80">1 Sesión</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCategorySelect('curso')}
                  className={`h-14 px-5 border text-sm font-semibold transition flex items-center justify-between cursor-pointer ${
                    category === 'curso'
                      ? 'bg-blue-950 text-white border-blue-950 border-t-4 border-t-sky-400 shadow-sm'
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Curso Formativo</span>
                  <span className="text-xs font-mono uppercase opacity-80">Pack 8 Sesiones</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* PASO 2: Finanzas y Cobro */}
        <section className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Paso 02
              </span>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Finanzas y Cobro
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Caja Operativa</span>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-sky-700">
                  Subtotal Calculado
                </div>
                <div className="text-xs font-light text-slate-500 mt-0.5">
                  Arancel base ({category === 'curso' ? 'Curso Pack 8' : 'Clase Única'} ·{' '}
                  {modality === 'grupal' ? `${effectivePax} personas` : '1 persona'})
                </div>
              </div>
              <div className="text-2xl font-mono font-bold tabular-nums text-blue-950">
                {formatCurrency(subtotal)}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="discount-input" className="block text-xs font-bold uppercase tracking-widest text-sky-700">
                Descuento Manual Especial (Opcional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-medium text-slate-400 select-none">
                  −$
                </span>
                <input
                  id="discount-input"
                  type="number"
                  min="0"
                  max={subtotal}
                  step="500"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full h-11 pl-9 pr-4 border border-slate-200 bg-white text-sm font-medium tabular-nums text-slate-800 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-sky-700">
                Medio de Pago
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup">
                {PAYMENT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = paymentMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPaymentMethod(opt.id)}
                      className={`h-12 px-4 border text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-950 text-white border-blue-950 border-t-4 border-t-sky-400 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 border-l-4 border-l-sky-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-sky-700 flex items-center gap-2">
                  <span>Total Final a Percibir</span>
                  <span className="px-2 py-0.5 bg-blue-950 text-white text-xs font-mono uppercase">
                    {paymentMethod}
                  </span>
                </div>
                <div className="text-xs font-light text-slate-600 mt-1">
                  {category === 'curso'
                    ? 'Se percibe íntegramente en la Sesión #1; las siguientes sesiones quedan registradas como pack pagado ($0).'
                    : 'Monto neto a ingresar en caja de escuela'}
                </div>
              </div>
              <div className="text-3xl font-mono font-bold tabular-nums text-blue-950">
                {formatCurrency(finalTotal)}
              </div>
            </div>
          </div>
        </section>

        {/* PASO 3: Asignación, Multi-Agendamiento y Ficha */}
        <section className="bg-white border border-slate-200 border-t-4 border-blue-950 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Paso 03
              </span>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Asignación, Agenda & Ficha del Alumno
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Duración {classDuration} min · Atención {schoolConfig.openTime}–{schoolConfig.closeTime}</span>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label htmlFor="start-time-input" className="block text-xs font-bold uppercase tracking-widest text-sky-700">
                  {category === 'curso'
                    ? 'Fecha y Horario Sesión #1 (Percibe Cobro Pack)'
                    : 'Horario de la Clase (Hoy)'}
                </label>
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  Término automático: +{classDuration} min
                </span>
              </div>

              {category === 'curso' && (
                <div className="max-w-xs">
                  <span className="block text-xs text-slate-500 mb-1">Fecha Sesión #1</span>
                  <input
                    type="date"
                    min={todayIso}
                    value={firstSessionDate}
                    onChange={(e) => setFirstSessionDate(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 bg-white text-sm font-mono text-slate-800 focus:border-blue-950 outline-none"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {QUICK_BLOCKS.map((block) => {
                  const blockEnd = addMinutesToTime(block, classDuration);
                  const isActive = startTime === block;
                  return (
                    <button
                      key={block}
                      type="button"
                      onClick={() => setStartTime(block)}
                      className={`h-8 px-3 border text-xs font-medium tabular-nums transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-950 text-white border-blue-950 font-semibold shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {block}–{blockEnd}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-11 items-center gap-3">
                <div className="sm:col-span-5">
                  <span className="block text-xs text-slate-500 mb-1">
                    Hora de Inicio
                  </span>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-sky-600 absolute left-3 top-3.5 pointer-events-none" />
                    <input
                      id="start-time-input"
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-11 pl-9 pr-4 border border-slate-200 bg-white text-base font-medium tabular-nums text-slate-800 focus:border-blue-950 outline-none"
                    />
                  </div>
                </div>

                <div className="hidden sm:flex sm:col-span-1 items-center justify-center pt-5">
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>

                <div className="sm:col-span-5">
                  <span className="block text-xs text-slate-500 mb-1">
                    Hora de Término (+{classDuration}m)
                  </span>
                  <div
                    className={`h-11 px-4 border bg-slate-50 text-slate-800 flex items-center justify-between transition ${
                      exceedsSunset
                        ? 'border-rose-400 bg-rose-50/50'
                        : 'border-slate-200'
                    }`}
                  >
                    <span
                      className={`text-base font-semibold tabular-nums ${
                        exceedsSunset ? 'text-rose-700' : 'text-blue-950'
                      }`}
                    >
                      {endTime} hrs
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-mono uppercase ${
                        exceedsSunset
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      +{classDuration} Min
                    </span>
                  </div>
                  {exceedsSunset && (
                    <p className="mt-1 text-xs font-medium text-rose-700">
                      {sunsetIsFallback
                        ? `Ojo: termina después del ocaso estimado (${sunsetTime} hrs, sin conexión al servicio solar).`
                        : `Bloqueado: la clase termina después del ocaso (${sunsetTime} hrs).`}
                    </p>
                  )}
                  {slotErrors
                    .filter((msg) => !msg.includes('ocaso'))
                    .map((msg) => (
                      <p key={msg} className="mt-1 text-xs font-medium text-rose-700">
                        {msg}
                      </p>
                    ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label htmlFor="instructor-select" className="block text-xs font-bold uppercase tracking-widest text-sky-700">
                  {category === 'curso'
                    ? 'Instructor Asignado (Sesión #1)'
                    : 'Instructor Asignado'}
                </label>
                {isManualOverride && suggestionInfo.suggestedInstructor && (
                  <button
                    type="button"
                    onClick={handleRestoreSuggestion}
                    className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-sky-700 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
                    Restaurar sugerencia de turno
                  </button>
                )}
              </div>

              <select
                id="instructor-select"
                value={selectedInstructorId}
                onChange={handleInstructorChange}
                className="w-full h-11 px-3.5 border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:border-blue-950 outline-none cursor-pointer"
              >
                <option value="">
                  {category === 'curso' ? 'Por definir (asignar el día de la clase)' : '— Selecciona un instructor —'}
                </option>
                {virtualQueue.length > 0 && (
                  <optgroup label="Fila Virtual (Orden de Llegada)">
                    {virtualQueue.map((inst) => {
                      const conflicts = getInstructorConflicts(
                        inst.id,
                        startTime,
                        endTime,
                        classes,
                        sessionOneDate
                      );
                      const isSuggested = suggestionInfo.suggestedInstructor?.id === inst.id;
                      return (
                        <option key={inst.id} value={inst.id}>
                          #{inst.queuePosition} {inst.name} (Llegada {inst.checkInTime})
                          {isSuggested ? ' — SUGERIDO' : ''}
                          {conflicts.length > 0
                            ? ` [Ocupado ${conflicts[0].startTime}–${conflicts[0].endTime}]`
                            : ' [Disponible]'}
                        </option>
                      );
                    })}
                  </optgroup>
                )}

                {instructors.some((i) => !i.checkedIn) && (
                  <optgroup label="Sin Check-in hoy (Selección manual)">
                    {instructors
                      .filter((i) => !i.checkedIn)
                      .map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} (Sin check-in)
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>

              <p className="text-xs font-light text-slate-500">{suggestionInfo.reason}</p>

              {selectedInstructorConflicts.length > 0 && (
                <div className="p-3 border border-rose-300 bg-rose-50 text-xs font-medium text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Conflicto de horario: este instructor registra una clase entre{' '}
                    <strong className="font-mono tabular-nums">
                      {selectedInstructorConflicts[0].startTime}–{selectedInstructorConflicts[0].endTime}
                    </strong>{' '}
                    ({selectedInstructorConflicts[0].studentName}).
                  </span>
                </div>
              )}
            </div>

            {/* Planificador Multi-Sesión Curso Pack */}
            {category === 'curso' && (
              <div className="p-5 bg-slate-50 border border-slate-200 border-l-4 border-l-sky-500 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-700">
                      <Layers className="w-4 h-4 text-sky-600" />
                      <span>
                        Planificador de Sesiones Futuras ({totalPlannedSessions}/
                        {MAX_COURSE_PACK_SESSIONS} agendadas)
                      </span>
                    </div>
                    <p className="text-xs font-light text-slate-600">
                      Las sesiones quedan con el instructor del curso (el de la Sesión #1) salvo que lo cambies. La Sesión #1 percibe el valor total en caja; las siguientes quedan en $0 y no mueven la fila de turnos.
                    </p>
                  </div>

                  {totalPlannedSessions < MAX_COURSE_PACK_SESSIONS && (
                    <button
                      type="button"
                      onClick={handleAddFutureCourseSession}
                      className="h-9 px-3 bg-blue-950 hover:bg-sky-700 text-white text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 text-sky-400" />
                      Agregar Sesión #{totalPlannedSessions + 1}
                    </button>
                  )}
                </div>

                <div className="p-3 bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 bg-blue-950 text-white font-mono font-bold uppercase text-xs">
                      Sesión #1
                    </span>
                    <span className="font-mono font-medium tabular-nums text-blue-950">
                      {formatIsoToDisplayDate(sessionOneDate)} · {startTime}–{endTime}
                    </span>
                    <span className="text-slate-600">
                      · Inst:{' '}
                      <strong className="text-blue-950 font-semibold">
                        {instructors.find((i) => i.id === selectedInstructorId)?.name || 'Asignado'}
                      </strong>
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-sky-100 text-sky-800 font-mono font-semibold tabular-nums uppercase self-start sm:self-auto border border-sky-300">
                    Cobro Caja: {formatCurrency(finalTotal)}
                  </span>
                </div>

                {extraCourseSessions.length === 0 ? (
                  <div className="p-4 border border-dashed border-slate-300 bg-white text-center text-xs text-slate-500">
                    Solo se registrará la Sesión #1 hoy. Presiona &ldquo;Agregar Sesión&rdquo; para proyectar las próximas fechas en el calendario operativo.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {extraCourseSessions.map((ses, index) => {
                      const sessionNumber = index + 2;
                      const sesEndTime = addMinutesToTime(ses.startTime || '10:30', classDuration);
                      const sesIssues = getFutureSessionIssues(ses);
                      return (
                        <div
                          key={ses.tempId}
                          className="p-3.5 bg-white border border-slate-200 space-y-3 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-sky-700 text-white text-xs font-mono font-bold uppercase">
                                Sesión #{sessionNumber}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-semibold uppercase">
                                Pack Pagado ($0 Caja)
                              </span>
                              <span className="text-xs font-mono text-slate-400">
                                {sessionInstructorId(ses) ? 'Agendada' : 'Sin instructor'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveFutureSession(ses.tempId)}
                              className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-rose-600 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Quitar
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Fecha Agendada
                              </label>
                              <div className="relative">
                                <Calendar className="w-3.5 h-3.5 text-sky-600 absolute left-3 top-3.5 pointer-events-none" />
                                <input
                                  type="date"
                                  required
                                  value={ses.operationDate}
                                  onChange={(e) =>
                                    handleUpdateFutureSession(
                                      ses.tempId,
                                      'operationDate',
                                      e.target.value
                                    )
                                  }
                                  className="w-full h-10 pl-8 pr-2.5 border border-slate-200 bg-white text-xs font-mono font-medium text-slate-800 focus:border-blue-950 outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Inicio (Fin {sesEndTime})
                              </label>
                              <input
                                type="time"
                                required
                                value={ses.startTime}
                                onChange={(e) =>
                                  handleUpdateFutureSession(
                                    ses.tempId,
                                    'startTime',
                                    e.target.value
                                  )
                                }
                                className="w-full h-10 px-3 border border-slate-200 bg-white text-xs font-mono font-medium tabular-nums text-slate-800 focus:border-blue-950 outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Instructor
                              </label>
                              <select
                                value={sessionInstructorId(ses) || ''}
                                onChange={(e) =>
                                  handleUpdateFutureSession(
                                    ses.tempId,
                                    'instructorId',
                                    e.target.value
                                  )
                                }
                                className="w-full h-10 px-2.5 border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-blue-950 outline-none cursor-pointer"
                              >
                                <option value="">
                                  Por definir (Asignar en día de clase)
                                </option>
                                {instructors.map((inst) => (
                                  <option key={inst.id} value={inst.id}>
                                    {inst.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {sesIssues.length > 0 && (
                            <p className="text-xs font-medium text-rose-700">{sesIssues.join(' ')}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Ficha del Alumno */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <span className="block text-xs font-bold uppercase tracking-widest text-sky-700">
                Ficha de Contacto del Alumno
              </span>

              <div className="space-y-1.5">
                <label htmlFor="student-name" className="block text-xs font-semibold uppercase text-slate-700">
                  Nombre Completo *
                </label>
                <input
                  id="student-name"
                  type="text"
                  required
                  placeholder="Ej. Matías González"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full h-11 px-4 border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="student-phone" className="block text-xs font-semibold uppercase text-slate-700">
                    Teléfono / WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-sky-600 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      id="student-phone"
                      type="tel"
                      required
                      placeholder="+56 9 8765 4321"
                      value={studentPhone}
                      onChange={(e) => setStudentPhone(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 border border-slate-200 bg-white text-sm font-mono tabular-nums text-slate-800 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="student-email" className="block text-xs font-semibold uppercase text-slate-700">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-sky-600 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      id="student-email"
                      type="email"
                      placeholder="alumno@correo.cl"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 border border-slate-200 bg-white text-sm text-slate-800 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contacto de Emergencia */}
            <div className="p-4 bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-700">
                <ShieldAlert className="w-4 h-4 text-sky-600" />
                <span>Contacto de Emergencia Obligatorio</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="emergency-name" className="block text-xs font-medium text-slate-600">
                    Nombre Contacto Emergencia *
                  </label>
                  <input
                    id="emergency-name"
                    type="text"
                    required
                    placeholder="Ej. Carolina Soto (Madre / Pareja)"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:border-blue-950 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="emergency-phone" className="block text-xs font-medium text-slate-600">
                    Teléfono Emergencia *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-sky-600 absolute left-3 top-3.5 pointer-events-none" />
                    <input
                      id="emergency-phone"
                      type="tel"
                      required
                      placeholder="+56 9 1234 5678"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      className="w-full h-10 pl-8 pr-3 border border-slate-200 bg-white text-sm font-mono tabular-nums text-slate-800 focus:border-blue-950 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Botón Principal de Envío */}
        {formError && (
          <div className="p-3 border border-rose-300 bg-rose-50 text-sm font-medium text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={isSaving || allBlockers.length > 0}
          title={allBlockers.join(' ')}
          className="w-full h-14 bg-blue-950 hover:bg-sky-700 text-white text-sm font-semibold uppercase tracking-wider shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>
            {category === 'curso'
              ? `Guardar Curso Pack (${totalPlannedSessions} ${
                  totalPlannedSessions === 1 ? 'Sesión' : 'Sesiones'
                }) · Caja: ${formatCurrency(finalTotal)}`
              : `Guardar Clase (${startTime}–${endTime}) · ${formatCurrency(finalTotal)}`}
          </span>
          <ArrowRight className="w-4 h-4 text-sky-400" />
        </button>
      </form>

      {/* Tabla Operativa de Clases Registradas */}
      <section className="pt-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-sky-700">
              Bitácora
            </span>
            <h3 className="text-lg font-bold tracking-tight text-blue-950">
              {logView === 'today'
                ? `Clases de Hoy (${visibleClasses.length})`
                : `Próximas Sesiones Agendadas (${visibleClasses.length})`}
            </h3>
          </div>
          <div className="flex border border-slate-200 bg-white">
            {[
              { id: 'today', label: 'Hoy' },
              { id: 'upcoming', label: 'Próximas' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLogView(opt.id)}
                className={`h-9 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer ${
                  logView === opt.id ? 'bg-blue-950 text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {tableError && (
          <div className="p-3 border border-rose-300 bg-rose-50 text-sm font-medium text-rose-800">{tableError}</div>
        )}

        <div className="border border-slate-200 bg-white shadow-sm overflow-x-auto">
          {visibleClasses.length === 0 ? (
            <div className="p-8 text-center text-sm font-light text-slate-500">
              {logView === 'today' ? 'No hay clases registradas hoy.' : 'No hay sesiones futuras agendadas.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-950 text-white text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha / Horario</th>
                  <th className="py-3 px-4">Alumno / Contacto</th>
                  <th className="py-3 px-4">Emergencia</th>
                  <th className="py-3 px-4">Modalidad / Pack</th>
                  <th className="py-3 px-4">Instructor</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Total Caja</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {visibleClasses.map((cls) => {
                  const packSize = cls.courseGroupId
                    ? classes.filter((c) => c.courseGroupId === cls.courseGroupId).length
                    : 0;
                  const isToday = cls.operationDate === todayIso;
                  const canMark = isToday && cls.instructorId;

                  return (
                    <tr
                      key={cls.id}
                      className={`hover:bg-slate-50/80 transition ${cls.status === 'no_show' ? 'opacity-60' : ''}`}
                    >
                      <td className="py-3 px-4 tabular-nums font-semibold text-blue-950 whitespace-nowrap">
                        <div>{cls.startTime}–{cls.endTime} hrs</div>
                        <div className="text-xs font-light text-slate-500">
                          {formatIsoToDisplayDate(cls.operationDate)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{cls.studentName}</div>
                        {cls.studentPhone && (
                          <div className="text-xs font-mono tabular-nums text-slate-500">{cls.studentPhone}</div>
                        )}
                        {cls.studentEmail && (
                          <div className="text-xs text-slate-400 font-light">{cls.studentEmail}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {cls.emergencyContactName ? (
                          <div>
                            <div className="text-xs font-medium text-slate-800">{cls.emergencyContactName}</div>
                            <div className="text-xs font-mono tabular-nums text-sky-700">
                              {cls.emergencyContactPhone}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-light">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs space-y-1">
                        <div>
                          {cls.modality === 'grupal' ? `Grupal (${cls.pax} pax)` : 'Individual'} ·{' '}
                          {cls.category === 'curso' ? 'Curso Pack' : 'Única'}
                        </div>
                        {cls.courseGroupId && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="px-1.5 py-0.5 bg-blue-950 text-white text-xs font-mono">
                              Sesión {cls.sessionIndex}/{packSize}
                            </span>
                            {packSize < MAX_COURSE_PACK_SESSIONS && (
                              <button
                                type="button"
                                onClick={() => handleAddPackSession(cls)}
                                className="px-1.5 py-0.5 border border-slate-300 text-xs font-semibold text-blue-950 hover:bg-slate-50 cursor-pointer"
                              >
                                + Sesión
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-blue-950">
                        <select
                          aria-label={`Instructor de ${cls.studentName}`}
                          value={cls.instructorId || ''}
                          onChange={(e) => runRowAction(() => assignInstructorToClass(cls.id, e.target.value))}
                          className={`h-8 px-2 border text-xs font-medium outline-none cursor-pointer ${
                            cls.instructorId
                              ? 'border-slate-200 bg-white text-blue-950'
                              : 'border-amber-300 bg-amber-50 text-amber-900'
                          }`}
                        >
                          <option value="">Por definir</option>
                          {instructors.map((itemInst) => (
                            <option key={itemInst.id} value={itemInst.id}>
                              {itemInst.name}
                            </option>
                          ))}
                          {cls.instructorId && !instructors.some((i) => i.id === cls.instructorId) && (
                            <option value={cls.instructorId}>{getInstructorName(cls.instructorId)} (inactivo)</option>
                          )}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                          {STATUS_LABELS[cls.status] || cls.status}
                        </div>
                        {canMark && (
                          <div className="flex gap-1 mt-1">
                            {cls.status !== 'completed' && cls.status !== 'no_show' && (
                              <button
                                type="button"
                                onClick={() => runRowAction(() => setClassStatus(cls.id, 'completed'))}
                                className="px-1.5 py-0.5 border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs cursor-pointer"
                              >
                                Realizada
                              </button>
                            )}
                            {cls.status !== 'no_show' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `¿Marcar que ${cls.studentName} no asistió? El instructor no cobra esta sesión; el pago del alumno se mantiene en caja.`
                                    )
                                  ) {
                                    runRowAction(() => setClassStatus(cls.id, 'no_show'));
                                  }
                                }}
                                className="px-1.5 py-0.5 border border-rose-300 bg-rose-50 text-rose-800 text-xs cursor-pointer"
                              >
                                No asistió
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => runRowAction(() => setClassStatus(cls.id, 'scheduled'))}
                                className="px-1.5 py-0.5 border border-slate-300 text-slate-700 text-xs cursor-pointer"
                              >
                                Deshacer
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold text-blue-950">
                        <div>{formatCurrency(cls.finalTotal)}</div>
                        {cls.isPaidInPack ? (
                          <span className="inline-block px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono uppercase">
                            Pack Pagado
                          </span>
                        ) : (
                          <div className="text-xs font-normal text-slate-400">{cls.paymentMethod}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              openStudentWhatsApp({
                                ...cls,
                                instructorName: getInstructorName(cls.instructorId),
                                total: cls.finalTotal,
                                method: cls.paymentMethod,
                              })
                            }
                            className="p-1.5 text-sky-700 hover:text-blue-950 transition cursor-pointer"
                            title="Enviar confirmación por WhatsApp al alumno"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveClass(cls)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
