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
import { useConfirm, Dialog, DialogButton } from './ui/Dialog';
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
  const confirm = useConfirm();
  // Diálogo para agregar una sesión a un curso existente
  const [packDialog, setPackDialog] = useState(null); // { cls, date, time }
  const [firstSessionDate, setFirstSessionDate] = useState(todayIso);

  // Paso 1: Tipo de clase
  const [modality, setModality] = useState('individual');
  const [pax, setPax] = useState(2);
  const [category, setCategory] = useState('unica');

  // Paso 2: Cobro
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

  const handleRemoveClass = async (cls) => {
    const ids = getClassesToRemove(cls.id);
    const isWholePack = ids.length > 1;
    const ok = await confirm(
      isWholePack
        ? {
            title: `Eliminar el curso de ${cls.studentName}`,
            message: `Esta sesión tiene el pago completo del curso. Se eliminan las ${ids.length} sesiones y su ingreso en caja.`,
            confirmLabel: `Eliminar ${ids.length} sesiones`,
            tone: 'danger',
          }
        : {
            title: 'Eliminar clase',
            message: `${cls.studentName}, ${formatIsoToDisplayDate(cls.operationDate)} de ${cls.startTime} a ${cls.endTime}.`,
            confirmLabel: 'Eliminar clase',
            tone: 'danger',
          }
    );
    if (ok) runRowAction(() => removeClass(cls.id));
  };

  const handleNoShow = async (cls) => {
    const ok = await confirm({
      title: `${cls.studentName} no asistió`,
      message: 'El instructor no cobra esta sesión. El pago del alumno se mantiene en caja.',
      confirmLabel: 'Marcar inasistencia',
      tone: 'danger',
    });
    if (ok) runRowAction(() => setClassStatus(cls.id, 'no_show'));
  };

  const handleAddPackSession = (cls) => {
    const packSessions = classes.filter((c) => c.courseGroupId === cls.courseGroupId);
    const last = packSessions[packSessions.length - 1] || cls;
    setPackDialog({ cls, date: addDaysToIsoDate(last.operationDate, 1), time: last.startTime });
  };

  const submitPackSession = () => {
    const { cls, date, time } = packDialog;
    setPackDialog(null);
    // Por defecto, el instructor dueño del curso (sesión #1); si está ocupado queda "Por definir"
    runRowAction(() => addSessionToPack(cls.courseGroupId, { operationDate: date, startTime: time }));
  };

  const describeClass = (cls) => {
    const kind = cls.modality === 'grupal' ? `Grupal, ${cls.pax} personas` : 'Individual';
    if (!cls.courseGroupId) return `${kind} · clase única`;
    const packSize = classes.filter((c) => c.courseGroupId === cls.courseGroupId).length;
    return `${kind} · curso, sesión ${cls.sessionIndex} de ${packSize}`;
  };

  const renderInstructorSelect = (cls) => (
    <label className="block">
      <span className="sr-only">Instructor de {cls.studentName}</span>
      <select
        value={cls.instructorId || ''}
        onChange={(e) => runRowAction(() => assignInstructorToClass(cls.id, e.target.value))}
        className={`w-full xl:w-auto h-11 px-3 border text-base cursor-pointer ${
          cls.instructorId ? 'border-slate-300 bg-white text-slate-900' : 'border-amber-400 bg-amber-50 text-amber-950'
        }`}
      >
        <option value="">Instructor por definir</option>
        {instructors.map((itemInst) => (
          <option key={itemInst.id} value={itemInst.id}>
            {itemInst.name}
          </option>
        ))}
        {cls.instructorId && !instructors.some((i) => i.id === cls.instructorId) && (
          <option value={cls.instructorId}>{getInstructorName(cls.instructorId)} (inactivo)</option>
        )}
      </select>
    </label>
  );

  const renderStatusActions = (cls) => {
    if (cls.operationDate !== todayIso || !cls.instructorId) return null;
    return (
      <>
        {cls.status !== 'completed' && cls.status !== 'no_show' && (
          <button
            type="button"
            onClick={() => runRowAction(() => setClassStatus(cls.id, 'completed'))}
            className="h-11 px-4 border border-emerald-400 bg-emerald-50 text-emerald-900 text-sm font-semibold cursor-pointer hover:bg-emerald-100"
          >
            Realizada
          </button>
        )}
        {cls.status !== 'no_show' ? (
          <button
            type="button"
            onClick={() => handleNoShow(cls)}
            className="h-11 px-4 border border-rose-300 bg-white text-rose-800 text-sm font-semibold cursor-pointer hover:bg-rose-50"
          >
            No asistió
          </button>
        ) : (
          <button
            type="button"
            onClick={() => runRowAction(() => setClassStatus(cls.id, 'scheduled'))}
            className="h-11 px-4 border border-slate-300 bg-white text-slate-800 text-sm font-semibold cursor-pointer hover:bg-slate-50"
          >
            Deshacer inasistencia
          </button>
        )}
      </>
    );
  };

  const renderRowActions = (cls, compact = false) => {
    const packSize = cls.courseGroupId ? classes.filter((c) => c.courseGroupId === cls.courseGroupId).length : 0;
    return (
      <>
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
          className="h-11 px-3 inline-flex items-center gap-2 border border-slate-300 bg-white text-slate-800 text-sm font-semibold cursor-pointer hover:bg-slate-50"
          aria-label={`Enviar confirmación por WhatsApp a ${cls.studentName}`}
        >
          <MessageSquare className="w-5 h-5 text-sky-700" aria-hidden="true" />
          {!compact && 'WhatsApp'}
        </button>
        {cls.courseGroupId && packSize < MAX_COURSE_PACK_SESSIONS && (
          <button
            type="button"
            onClick={() => handleAddPackSession(cls)}
            className="h-11 px-3 inline-flex items-center gap-2 border border-slate-300 bg-white text-slate-800 text-sm font-semibold cursor-pointer hover:bg-slate-50"
            aria-label={`Agregar sesión al curso de ${cls.studentName}`}
          >
            <Plus className="w-5 h-5 text-sky-700" aria-hidden="true" />
            {!compact && 'Sesión'}
          </button>
        )}
        <button
          type="button"
          onClick={() => handleRemoveClass(cls)}
          className={`h-11 px-3 inline-flex items-center gap-2 border border-slate-300 bg-white text-rose-800 text-sm font-semibold cursor-pointer hover:bg-rose-50 ${
            compact ? 'ml-2' : 'ml-auto'
          }`}
          aria-label={`Eliminar la clase de ${cls.studentName}`}
        >
          <Trash2 className="w-5 h-5" aria-hidden="true" />
          {!compact && 'Eliminar'}
        </button>
      </>
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Cabecera */}
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-blue-950 mt-1">
          Nueva clase
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed mt-1">
          La hora de término, el pago del instructor y el turno de la fila se calculan solos.
        </p>
      </div>

      {/* Banner de Confirmación Exitosa */}
      {lastSavedClass && (
        <div role="status" className="bg-emerald-50 border border-emerald-300 border-l-4 border-l-emerald-600 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-11 bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Check aria-hidden="true" className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-blue-950 tracking-tight flex flex-wrap items-center gap-2">
                <span>
                  {lastSavedClass.scheduledSessions?.length > 1
                    ? `Curso Pack Registrado (${lastSavedClass.scheduledSessions.length} sesiones)`
                    : 'Clase Registrada Exitosamente'}
                </span>
                {lastSavedClass.courseGroupId && (
                  <span className="px-2 py-0.5 text-sm bg-blue-950 text-sky-300">
                    Pack #{String(lastSavedClass.courseGroupId).slice(0, 8)}
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-700 mt-1">
                Alumno: <strong className="font-semibold text-blue-950">{lastSavedClass.studentName}</strong>{' '}
                {lastSavedClass.studentPhone && (
                  <span className="text-sm tabular-nums text-slate-600">
                    ({lastSavedClass.studentPhone})
                  </span>
                )}{' '}
                · Horario:{' '}
                <strong className="font-medium tabular-nums text-slate-900">
                  {lastSavedClass.startTime} - {lastSavedClass.endTime} hrs
                </strong>{' '}
                · Instructor: <strong className="font-semibold text-blue-950">{lastSavedClass.instructorName}</strong> ·
                Total Caja: <strong className="font-semibold tabular-nums text-blue-950">{formatCurrency(lastSavedClass.total)}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openStudentWhatsApp(lastSavedClass)}
              className="h-11 px-4 bg-blue-950 hover:bg-sky-700 text-white text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare aria-hidden="true" className="w-4 h-4 text-sky-400" />
              Notificar por WhatsApp
            </button>

            <button
              type="button"
              onClick={() => setLastSavedClass(null)}
              className="h-11 w-10 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition cursor-pointer"
              title="Cerrar notificación"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Formulario Secuencial */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* PASO 1: Tipo de clase */}
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <span className="text-sm font-bold text-sky-700">
                Paso 1 de 3
              </span>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Tipo de clase
              </h2>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-sky-700">
                Modalidad
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleModalitySelect('individual')}
                  className={`h-14 px-5 border text-sm font-semibold transition flex items-center justify-between cursor-pointer ${
                    modality === 'individual'
                      ? 'bg-blue-950 text-white border-blue-950 border-t-4 border-t-sky-400'
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <User aria-hidden="true" className={`w-4 h-4 ${modality === 'individual' ? 'text-sky-400' : 'text-slate-500'}`} />
                    Individual
                  </span>
                  <span className="text-sm opacity-80">1 Pax</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModalitySelect('grupal')}
                  className={`h-14 px-5 border text-sm font-semibold transition flex items-center justify-between cursor-pointer ${
                    modality === 'grupal'
                      ? 'bg-blue-950 text-white border-blue-950 border-t-4 border-t-sky-400'
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Users aria-hidden="true" className={`w-4 h-4 ${modality === 'grupal' ? 'text-sky-400' : 'text-slate-500'}`} />
                    Grupal
                  </span>
                  <span className="text-sm opacity-80">2+ Pax</span>
                </button>
              </div>
            </div>

            {modality === 'grupal' && (
              <div className="p-4 bg-slate-50 border border-slate-200 space-y-2">
                <label htmlFor="pax-input" className="block text-sm font-bold text-sky-700">
                  Cantidad de Alumnos en el Grupo (Mínimo 2)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPax((p) => Math.max(2, Number(p) - 1))}
                    className="h-11 w-12 border border-slate-200 bg-white hover:bg-slate-50 text-base font-bold text-blue-950 transition cursor-pointer"
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
                    className="flex-1 h-11 px-4 border border-slate-200 bg-white text-center text-base font-semibold tabular-nums text-blue-950 focus:border-blue-950"
                  />
                  <button
                    type="button"
                    onClick={() => setPax((p) => Number(p) + 1)}
                    className="h-11 w-12 border border-slate-200 bg-white hover:bg-slate-50 text-base font-bold text-blue-950 transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm text-slate-600">
                  Tarifa base 2 pax: {formatCurrency(schoolConfig.priceGroupBase)} +{' '}
                  {formatCurrency(schoolConfig.priceGroupExtraPax)} por alumno adicional.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-bold text-sky-700">
                Categoría
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleCategorySelect('unica')}
                  className={`h-14 px-5 border text-sm font-semibold transition flex items-center justify-between cursor-pointer ${
                    category === 'unica'
                      ? 'bg-blue-950 text-white border-blue-950 border-t-4 border-t-sky-400'
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Clase Única</span>
                  <span className="text-sm opacity-80">1 Sesión</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCategorySelect('curso')}
                  className={`h-14 px-5 border text-sm font-semibold transition flex items-center justify-between cursor-pointer ${
                    category === 'curso'
                      ? 'bg-blue-950 text-white border-blue-950 border-t-4 border-t-sky-400'
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Curso</span>
                  <span className="text-sm opacity-80">Pack 8 Sesiones</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* PASO 2: Cobro */}
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <span className="text-sm font-bold text-sky-700">
                Paso 2 de 3
              </span>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Cobro
              </h2>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-sky-700">
                  Subtotal
                </div>
                <div className="text-sm text-slate-600 mt-0.5">
                  {category === 'curso' ? 'Curso completo' : 'Clase única'} ·{' '}
                  {modality === 'grupal' ? `${effectivePax} personas` : '1 persona'})
                </div>
              </div>
              <div className="text-2xl font-bold tabular-nums text-blue-950">
                {formatCurrency(subtotal)}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="discount-input" className="block text-sm font-bold text-sky-700">
                Descuento (opcional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-medium text-slate-600 select-none">
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
                  className="w-full h-11 pl-9 pr-4 border border-slate-200 bg-white text-sm font-medium tabular-nums text-slate-800 focus:border-blue-950"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-bold text-sky-700">
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
                      className={`h-12 px-4 border text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-950 text-white border-blue-950 border-t-4 border-t-sky-400'
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
                <div className="text-sm font-bold text-sky-700 flex items-center gap-2">
                  <span>Total a cobrar</span>
                  <span className="px-2 py-0.5 bg-blue-950 text-white text-sm">
                    {paymentMethod}
                  </span>
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  {category === 'curso'
                    ? 'Se cobra completo en la sesión 1; las demás sesiones quedan como pagadas ($0).'
                    : 'Lo que entra a la caja de la escuela'}
                </div>
              </div>
              <div className="text-3xl font-bold tabular-nums text-blue-950">
                {formatCurrency(finalTotal)}
              </div>
            </div>
          </div>
        </section>

        {/* PASO 3: Asignación, Multi-Agendamiento y Ficha */}
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <span className="text-sm font-bold text-sky-700">
                Paso 3 de 3
              </span>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Horario, instructor y alumno
              </h2>
            </div>
            <span className="text-sm text-slate-600">Duración {classDuration} min · Atención {schoolConfig.openTime}–{schoolConfig.closeTime}</span>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label htmlFor="start-time-input" className="block text-sm font-bold text-sky-700">
                  {category === 'curso'
                    ? 'Fecha y Horario Sesión #1 (Percibe Cobro Pack)'
                    : 'Horario de la Clase (Hoy)'}
                </label>
                <span className="text-sm font-medium text-slate-600 tabular-nums">
                  Término automático: +{classDuration} min
                </span>
              </div>

              {category === 'curso' && (
                <div className="max-w-xs">
                  <span className="block text-sm text-slate-600 mb-1">Fecha Sesión #1</span>
                  <input
                    type="date"
                    min={todayIso}
                    value={firstSessionDate}
                    onChange={(e) => setFirstSessionDate(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 bg-white text-sm text-slate-800 focus:border-blue-950"
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
                      className={`h-11 px-3 border text-sm font-medium tabular-nums transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-950 text-white border-blue-950 font-semibold'
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
                  <span className="block text-sm text-slate-600 mb-1">
                    Hora de Inicio
                  </span>
                  <div className="relative">
                    <Clock aria-hidden="true" className="w-4 h-4 text-sky-700 absolute left-3 top-3.5 pointer-events-none" />
                    <input
                      id="start-time-input"
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-11 pl-9 pr-4 border border-slate-200 bg-white text-base font-medium tabular-nums text-slate-800 focus:border-blue-950"
                    />
                  </div>
                </div>

                <div className="hidden sm:flex sm:col-span-1 items-center justify-center pt-5">
                  <ArrowRight aria-hidden="true" className="w-4 h-4 text-slate-600" />
                </div>

                <div className="sm:col-span-5">
                  <span className="block text-sm text-slate-600 mb-1">
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
                      className={`px-2 py-0.5 text-sm ${
                        exceedsSunset
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      +{classDuration} Min
                    </span>
                  </div>
                  {exceedsSunset && (
                    <p className="mt-1 text-sm font-medium text-rose-700">
                      {sunsetIsFallback
                        ? `Ojo: termina después del ocaso estimado (${sunsetTime} hrs, sin conexión al servicio solar).`
                        : `Bloqueado: la clase termina después del ocaso (${sunsetTime} hrs).`}
                    </p>
                  )}
                  {slotErrors
                    .filter((msg) => !msg.includes('ocaso'))
                    .map((msg) => (
                      <p key={msg} className="mt-1 text-sm font-medium text-rose-700">
                        {msg}
                      </p>
                    ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label htmlFor="instructor-select" className="block text-sm font-bold text-sky-700">
                  {category === 'curso'
                    ? 'Instructor Asignado (Sesión #1)'
                    : 'Instructor Asignado'}
                </label>
                {isManualOverride && suggestionInfo.suggestedInstructor && (
                  <button
                    type="button"
                    onClick={handleRestoreSuggestion}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:underline cursor-pointer"
                  >
                    <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 text-sky-700" />
                    Restaurar sugerencia de turno
                  </button>
                )}
              </div>

              <select
                id="instructor-select"
                value={selectedInstructorId}
                onChange={handleInstructorChange}
                className="w-full h-11 px-3.5 border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:border-blue-950 cursor-pointer"
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

              <p className="text-sm text-slate-600">{suggestionInfo.reason}</p>

              {selectedInstructorConflicts.length > 0 && (
                <div role="alert" className="p-3 border border-rose-300 bg-rose-50 text-sm font-medium text-rose-800 flex items-center gap-2">
                  <AlertTriangle aria-hidden="true" className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Conflicto de horario: este instructor registra una clase entre{' '}
                    <strong className="tabular-nums">
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
                    <div className="flex items-center gap-2 text-sm font-bold text-sky-700">
                      <Layers aria-hidden="true" className="w-4 h-4 text-sky-700" />
                      <span>
                        Próximas sesiones del curso ({totalPlannedSessions}/
                        {MAX_COURSE_PACK_SESSIONS} agendadas)
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Todas las sesiones quedan con el instructor del curso, salvo que lo cambies. El curso se cobra completo en la sesión 1; las demás quedan en $0 y no mueven la fila de turnos.
                    </p>
                  </div>

                  {totalPlannedSessions < MAX_COURSE_PACK_SESSIONS && (
                    <button
                      type="button"
                      onClick={handleAddFutureCourseSession}
                      className="h-11 px-3 bg-blue-950 hover:bg-sky-700 text-white text-sm font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Plus aria-hidden="true" className="w-3.5 h-3.5 text-sky-400" />
                      Agregar Sesión #{totalPlannedSessions + 1}
                    </button>
                  )}
                </div>

                <div className="p-3 bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 bg-blue-950 text-white font-bold text-sm">
                      Sesión #1
                    </span>
                    <span className="font-medium tabular-nums text-blue-950">
                      {formatIsoToDisplayDate(sessionOneDate)} · {startTime}–{endTime}
                    </span>
                    <span className="text-slate-600">
                      · Inst:{' '}
                      <strong className="text-blue-950 font-semibold">
                        {instructors.find((i) => i.id === selectedInstructorId)?.name || 'Asignado'}
                      </strong>
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-sky-100 text-sky-800 font-semibold tabular-nums self-start sm:self-auto border border-sky-300">
                    Cobro Caja: {formatCurrency(finalTotal)}
                  </span>
                </div>

                {extraCourseSessions.length === 0 ? (
                  <div className="p-4 border border-dashed border-slate-300 bg-white text-center text-sm text-slate-600">
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
                          className="p-3.5 bg-white border border-slate-200 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-sky-700 text-white text-sm font-bold">
                                Sesión #{sessionNumber}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold">
                                Pack Pagado ($0 Caja)
                              </span>
                              <span className="text-sm text-slate-600">
                                {sessionInstructorId(ses) ? 'Agendada' : 'Sin instructor'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveFutureSession(ses.tempId)}
                              className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-rose-600 transition cursor-pointer"
                            >
                              <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                              Quitar
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-slate-600 mb-1">
                                Fecha Agendada
                              </label>
                              <div className="relative">
                                <Calendar aria-hidden="true" className="w-3.5 h-3.5 text-sky-700 absolute left-3 top-3.5 pointer-events-none" />
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
                                  className="w-full h-11 pl-8 pr-2.5 border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:border-blue-950"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-600 mb-1">
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
                                className="w-full h-11 px-3 border border-slate-200 bg-white text-sm font-medium tabular-nums text-slate-800 focus:border-blue-950"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-600 mb-1">
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
                                className="w-full h-11 px-2.5 border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:border-blue-950 cursor-pointer"
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
                            <p className="text-sm font-medium text-rose-700">{sesIssues.join(' ')}</p>
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
              <span className="block text-sm font-bold text-sky-700">
                Datos del alumno
              </span>

              <div className="space-y-1.5">
                <label htmlFor="student-name" className="block text-sm font-semibold text-slate-700">
                  Nombre Completo *
                </label>
                <input
                  id="student-name"
                  type="text"
                  required
                  placeholder="Ej. Matías González"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full h-11 px-4 border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:border-blue-950"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="student-phone" className="block text-sm font-semibold text-slate-700">
                    Teléfono / WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone aria-hidden="true" className="w-4 h-4 text-sky-700 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      id="student-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="off"
                      required
                      placeholder="+56 9 8765 4321"
                      value={studentPhone}
                      onChange={(e) => setStudentPhone(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 border border-slate-200 bg-white text-sm tabular-nums text-slate-800 focus:border-blue-950"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="student-email" className="block text-sm font-semibold text-slate-700">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail aria-hidden="true" className="w-4 h-4 text-sky-700 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      id="student-email"
                      type="email"
                      spellCheck={false}
                      autoComplete="off"
                      placeholder="alumno@correo.cl"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 border border-slate-200 bg-white text-sm text-slate-800 focus:border-blue-950"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contacto de Emergencia */}
            <div className="p-4 bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-sky-700">
                <ShieldAlert aria-hidden="true" className="w-4 h-4 text-sky-700" />
                <span>Contacto de emergencia</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="emergency-name" className="block text-sm font-medium text-slate-600">
                    Nombre Contacto Emergencia *
                  </label>
                  <input
                    id="emergency-name"
                    type="text"
                    required
                    placeholder="Ej. Carolina Soto (Madre / Pareja)"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:border-blue-950"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="emergency-phone" className="block text-sm font-medium text-slate-600">
                    Teléfono Emergencia *
                  </label>
                  <div className="relative">
                    <Phone aria-hidden="true" className="w-3.5 h-3.5 text-sky-700 absolute left-3 top-3.5 pointer-events-none" />
                    <input
                      id="emergency-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="off"
                      required
                      placeholder="+56 9 1234 5678"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      className="w-full h-11 pl-8 pr-3 border border-slate-200 bg-white text-sm tabular-nums text-slate-800 focus:border-blue-950"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Botón Principal de Envío */}
        {formError && (
          <div role="alert" className="p-3 border border-rose-300 bg-rose-50 text-sm font-medium text-rose-800 flex items-center gap-2">
            <AlertTriangle aria-hidden="true" className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={isSaving || allBlockers.length > 0}
          title={allBlockers.join(' ')}
          className="w-full h-14 bg-blue-950 hover:bg-sky-700 text-white text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>
            {category === 'curso'
              ? `Guardar Curso Pack (${totalPlannedSessions} ${
                  totalPlannedSessions === 1 ? 'Sesión' : 'Sesiones'
                }) · Caja: ${formatCurrency(finalTotal)}`
              : `Guardar Clase (${startTime}–${endTime}) · ${formatCurrency(finalTotal)}`}
          </span>
          <ArrowRight aria-hidden="true" className="w-4 h-4 text-sky-400" />
        </button>
      </form>

      {/* Bitácora: clases de hoy y próximas sesiones */}
      <section className="pt-2 space-y-4" aria-labelledby="bitacora-title">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 id="bitacora-title" className="text-2xl font-bold text-blue-950">
            {logView === 'today' ? 'Clases de hoy' : 'Próximas sesiones'}{' '}
            <span className="text-slate-600 font-normal tabular-nums">({visibleClasses.length})</span>
          </h2>
          <div className="inline-flex border border-slate-300 rounded-md overflow-hidden self-start" role="group" aria-label="Qué clases ver">
            {[
              { id: 'today', label: 'Hoy' },
              { id: 'upcoming', label: 'Próximas' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={logView === opt.id}
                onClick={() => setLogView(opt.id)}
                className={`h-11 px-5 text-base font-semibold rounded-none cursor-pointer ${
                  logView === opt.id ? 'bg-blue-950 text-white' : 'bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div aria-live="polite">
          {tableError && (
            <div role="alert" className="p-3 border border-rose-300 bg-rose-50 text-base text-rose-900 rounded-md">
              {tableError}
            </div>
          )}
        </div>

        {visibleClasses.length === 0 ? (
          <div className="p-8 text-center text-base text-slate-600 bg-white border border-slate-200 rounded-lg">
            {logView === 'today' ? 'Todavía no hay clases hoy. Registra la primera arriba.' : 'No hay sesiones futuras agendadas.'}
          </div>
        ) : (
          <>
            {/* Tarjetas: celular y tablet vertical */}
            <ul className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleClasses.map((cls) => (
                <li
                  key={cls.id}
                  className={`bg-white border border-slate-200 rounded-lg p-4 space-y-3 ${cls.status === 'no_show' ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="figure text-2xl text-blue-950">
                        {cls.startTime}–{cls.endTime}
                      </div>
                      <div className="text-sm text-slate-600">{formatIsoToDisplayDate(cls.operationDate)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="figure text-xl text-blue-950">{formatCurrency(cls.finalTotal)}</div>
                      <div className="text-sm text-slate-600">{cls.isPaidInPack ? 'Pack pagado' : cls.paymentMethod}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-900 break-words">{cls.studentName}</div>
                    <div className="text-sm text-slate-700">
                      {describeClass(cls)}
                      {cls.studentPhone ? ` · ${cls.studentPhone}` : ''}
                    </div>
                    {cls.emergencyContactName && (
                      <div className="text-sm text-slate-700">
                        Emergencia: {cls.emergencyContactName} {cls.emergencyContactPhone}
                      </div>
                    )}
                  </div>
                  {renderInstructorSelect(cls)}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 mr-1">{STATUS_LABELS[cls.status] || cls.status}</span>
                    {renderStatusActions(cls)}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">{renderRowActions(cls)}</div>
                </li>
              ))}
            </ul>

            {/* Tabla: pantallas anchas */}
            <div className="hidden xl:block border border-slate-200 bg-white rounded-lg overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de clases">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 text-sm font-semibold border-b border-slate-200">
                    <th scope="col" className="py-3 px-4">Horario</th>
                    <th scope="col" className="py-3 px-4">Alumno</th>
                    <th scope="col" className="py-3 px-4">Clase</th>
                    <th scope="col" className="py-3 px-4">Instructor</th>
                    <th scope="col" className="py-3 px-4">Estado</th>
                    <th scope="col" className="py-3 px-4 text-right">Caja</th>
                    <th scope="col" className="py-3 px-3 text-right">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-base">
                  {visibleClasses.map((cls) => (
                    <tr key={cls.id} className={`align-top ${cls.status === 'no_show' ? 'opacity-70' : ''}`}>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="figure text-xl text-blue-950">
                          {cls.startTime}–{cls.endTime}
                        </div>
                        <div className="text-sm text-slate-600">{formatIsoToDisplayDate(cls.operationDate)}</div>
                      </td>
                      <td className="py-3 px-4 max-w-[16rem]">
                        <div className="font-semibold text-slate-900 break-words">{cls.studentName}</div>
                        {cls.studentPhone && <div className="text-sm text-slate-700">{cls.studentPhone}</div>}
                        {cls.emergencyContactName && (
                          <div className="text-sm text-slate-600">
                            Emergencia: {cls.emergencyContactName} {cls.emergencyContactPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">{describeClass(cls)}</td>
                      <td className="py-3 px-4">{renderInstructorSelect(cls)}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-semibold text-slate-800 mb-1">{STATUS_LABELS[cls.status] || cls.status}</div>
                        <div className="flex flex-wrap gap-2">{renderStatusActions(cls)}</div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="figure text-lg text-blue-950">{formatCurrency(cls.finalTotal)}</div>
                        <div className="text-sm text-slate-600">{cls.isPaidInPack ? 'Pack pagado' : cls.paymentMethod}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex justify-end gap-2">{renderRowActions(cls, true)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <Dialog
        open={Boolean(packDialog)}
        title="Agregar sesión al curso"
        labelledBy="pack-dialog-title"
        onClose={() => setPackDialog(null)}
        footer={
          <>
            <DialogButton onClick={() => setPackDialog(null)}>Cancelar</DialogButton>
            <DialogButton tone="primary" onClick={submitPackSession} disabled={!packDialog?.date || !packDialog?.time}>
              Agregar sesión
            </DialogButton>
          </>
        }
      >
        {packDialog && (
          <>
            <p>
              Curso de <strong>{packDialog.cls.studentName}</strong>. Queda con el instructor del curso si está libre; si no,
              queda por definir.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm font-semibold text-slate-800">
                Fecha
                <input
                  type="date"
                  min={todayIso}
                  data-autofocus
                  value={packDialog.date}
                  onChange={(e) => setPackDialog((d) => ({ ...d, date: e.target.value }))}
                  className="w-full h-11 px-3 border border-slate-300 bg-white text-base font-normal"
                />
              </label>
              <label className="space-y-1 text-sm font-semibold text-slate-800">
                Hora de inicio
                <input
                  type="time"
                  value={packDialog.time}
                  onChange={(e) => setPackDialog((d) => ({ ...d, time: e.target.value }))}
                  className="w-full h-11 px-3 border border-slate-300 bg-white text-base font-normal"
                />
              </label>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
