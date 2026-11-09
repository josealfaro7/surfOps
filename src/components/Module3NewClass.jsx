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
import {
  useSurfSchool,
  getTodayIsoDate,
  addDaysToIsoDate,
  formatIsoToDisplayDate,
} from '../context/SurfSchoolContext';
import {
  calculateStudentSubtotal,
  formatCurrency,
  getInstructorConflicts,
  addMinutesToTime,
  timeToMinutes,
} from '../utils/calculations';
import ModuleHeader from './ui/ModuleHeader';

const PAYMENT_OPTIONS = [
  { id: 'Transferencia', label: 'Transferencia', icon: Smartphone },
  { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'Tarjeta', label: 'Tarjeta', icon: CreditCard },
];

const QUICK_BLOCKS = ['09:00', '10:30', '12:00', '15:00', '16:30'];
const MAX_COURSE_PACK_SESSIONS = 8;

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
    schoolConfig,
    instructors,
    virtualQueue,
    dailyClasses,
    addDailyClass,
    addCoursePackClasses,
    assignInstructorToClass,
    removeDailyClass,
    getSuggestedInstructorForSlot,
    sunsetTime,
  } = useSurfSchool();

  // Paso 1: Naturaleza de la Clase
  const [modality, setModality] = useState('individual'); // 'individual' | 'grupal'
  const [pax, setPax] = useState(2);
  const [category, setCategory] = useState('unica'); // 'unica' | 'curso'

  // Paso 2: Finanzas y Cobro
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Transferencia');

  // Paso 3: Asignación y Agenda (Duración fija automática +1h 15m = 75 min) — Sesión Principal (#1)
  const [startTime, setStartTime] = useState('10:30');
  const endTime = useMemo(() => addMinutesToTime(startTime, 75), [startTime]);

  // Sesiones futuras adicionales cuando category === 'curso' (Sesiones #2..#8)
  const [extraCourseSessions, setExtraCourseSessions] = useState([]);

  // Validación de seguridad contra la hora del ocaso
  const exceedsSunset = useMemo(() => {
    if (!sunsetTime) return false;
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

  // Confirmación de registro para el Success Banner y WhatsApp
  const [lastSavedClass, setLastSavedClass] = useState(null);

  const effectivePax = modality === 'grupal' ? Math.max(2, Number(pax) || 2) : 1;

  // Subtotal Automático según SchoolConfig
  const subtotal = useMemo(() => {
    return calculateStudentSubtotal(schoolConfig, {
      modality,
      pax: effectivePax,
      category,
    });
  }, [schoolConfig, modality, effectivePax, category]);

  const numericDiscount = Math.max(0, Number(discount) || 0);
  const finalTotal = Math.max(0, subtotal - numericDiscount);

  // Sugerencia inteligente desde la Fila Virtual para la Sesión #1
  const suggestionInfo = useMemo(() => {
    return getSuggestedInstructorForSlot(startTime, endTime);
  }, [startTime, endTime, virtualQueue, dailyClasses]);

  useEffect(() => {
    if (!isManualOverride) {
      if (suggestionInfo.suggestedInstructor) {
        setSelectedInstructorId(suggestionInfo.suggestedInstructor.id);
      } else if (instructors.length > 0 && !selectedInstructorId) {
        setSelectedInstructorId(instructors[0].id);
      }
    }
  }, [suggestionInfo, isManualOverride, instructors]);

  const selectedInstructorConflicts = useMemo(() => {
    return getInstructorConflicts(selectedInstructorId, startTime, endTime, dailyClasses);
  }, [selectedInstructorId, startTime, endTime, dailyClasses]);

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
    if (nextCategory === 'curso' && extraCourseSessions.length === 0) {
      const todayIso = getTodayIsoDate();
      setExtraCourseSessions([
        {
          tempId: `ses-${Date.now()}-2`,
          operationDate: addDaysToIsoDate(todayIso, 1),
          startTime: startTime || '10:30',
          instructorId: '', // Por definir (nullable en Supabase)
        },
      ]);
    }
  };

  const handleAddFutureCourseSession = () => {
    if (1 + extraCourseSessions.length >= MAX_COURSE_PACK_SESSIONS) return;
    const baseDate =
      extraCourseSessions.length > 0
        ? extraCourseSessions[extraCourseSessions.length - 1].operationDate
        : getTodayIsoDate();

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
      prev.map((s) => (s.tempId === tempId ? { ...s, [field]: value } : s))
    );
  };

  const handleRemoveFutureSession = (tempId) => {
    setExtraCourseSessions((prev) => prev.filter((s) => s.tempId !== tempId));
  };

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

    const lines = [
      '*Confirmación de Clase - Poisson Surf School*',
      `Alumno: ${classData.studentName}`,
      `Horario: ${classData.startTime} - ${classData.endTime}`,
      `Instructor: ${classData.instructorName}`,
      `Total a pagar: $${formattedNumber}`,
    ];

    if (Array.isArray(classData.scheduledSessions) && classData.scheduledSessions.length > 1) {
      lines.push(
        `Sesiones agendadas del Curso (${classData.scheduledSessions.length}/${MAX_COURSE_PACK_SESSIONS}):`
      );
      classData.scheduledSessions.forEach((s, idx) => {
        const instObj = instructors.find((i) => i.id === s.instructorId);
        const instLabel = instObj ? instObj.name : 'Por definir';
        lines.push(
          `  • Sesión #${idx + 1}: ${s.date} (${s.startTime}–${s.endTime}) · Inst: ${instLabel}`
        );
      });
    }

    const mensajeConfirmacion = lines.join('\n');

    const baseUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=`
      : 'https://wa.me/?text=';

    const url = baseUrl + encodeURIComponent(mensajeConfirmacion);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedInstructorId) return;

    const wasSuggested =
      suggestionInfo.suggestedInstructor?.id === selectedInstructorId && !isManualOverride;

    const assignedInst = instructors.find((i) => i.id === selectedInstructorId);

    if (category === 'curso') {
      const todayIso = getTodayIsoDate();
      const courseGroupId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `cg-${Date.now()}`;

      const allSessionsPayload = [
        {
          operationDate: todayIso,
          startTime,
          endTime,
          instructorId: selectedInstructorId,
          wasSuggestedByQueue: wasSuggested,
          status: 'scheduled',
        },
        ...extraCourseSessions.map((s) => ({
          operationDate: s.operationDate || todayIso,
          startTime: s.startTime || '10:30',
          endTime: addMinutesToTime(s.startTime || '10:30', 75),
          instructorId: s.instructorId || null,
          wasSuggestedByQueue: false,
          status: s.instructorId ? 'scheduled' : 'pending_instructor',
        })),
      ];

      const createdSessions = addCoursePackClasses({
        courseGroupId,
        modality,
        pax: effectivePax,
        subtotal,
        discount: numericDiscount,
        paymentMethod,
        studentName: studentName.trim() || 'Alumno',
        studentPhone: studentPhone.trim(),
        studentEmail: studentEmail.trim(),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        sessions: allSessionsPayload,
      });

      const firstCreated = createdSessions[0];
      setLastSavedClass({
        studentName: firstCreated.studentName,
        studentPhone: firstCreated.studentPhone,
        studentEmail: firstCreated.studentEmail,
        emergencyContactName: firstCreated.emergencyContactName,
        emergencyContactPhone: firstCreated.emergencyContactPhone,
        instructorName: assignedInst?.name || 'Instructor',
        startTime: firstCreated.startTime,
        endTime: firstCreated.endTime,
        total: firstCreated.finalTotal,
        method: firstCreated.paymentMethod,
        courseGroupId,
        scheduledSessions: createdSessions,
      });
    } else {
      const created = addDailyClass({
        modality,
        pax: effectivePax,
        category,
        subtotal,
        discount: numericDiscount,
        paymentMethod,
        finalTotal,
        startTime,
        endTime,
        instructorId: selectedInstructorId,
        wasSuggestedByQueue: wasSuggested,
        studentName: studentName.trim() || 'Alumno',
        studentPhone: studentPhone.trim(),
        studentEmail: studentEmail.trim(),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
      });

      setLastSavedClass({
        studentName: created.studentName,
        studentPhone: created.studentPhone,
        studentEmail: created.studentEmail,
        emergencyContactName: created.emergencyContactName,
        emergencyContactPhone: created.emergencyContactPhone,
        instructorName: assignedInst?.name || 'Instructor',
        startTime: created.startTime,
        endTime: created.endTime,
        total: created.finalTotal,
        method: created.paymentMethod,
      });
    }

    setModality('individual');
    setPax(2);
    setCategory('unica');
    setExtraCourseSessions([]);
    setDiscount('');
    setPaymentMethod('Transferencia');
    setStudentName('');
    setStudentPhone('');
    setStudentEmail('');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setIsManualOverride(false);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPlannedSessions = category === 'curso' ? 1 + extraCourseSessions.length : 1;

  return (
    <div className="ed-stack">
      {/* Cabecera Two-Column Feature con BauhausArt */}
      <ModuleHeader
        eyebrow="Módulo 03 · Registro Operativo"
        title="Ingreso de"
        accent="Clases"
        description="Flujo de registro para recepción: duración fija (+1h 15m), sugerencia inteligente de instructor por fila virtual y soporte para packs multi-sesión."
        art="newclass"
      />

      {/* Banner de confirmación con acción WhatsApp */}
      {lastSavedClass && (
        <div className="ed-card border-2 border-midnight-ink flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-midnight-ink text-cream-paper flex items-center justify-center shrink-0">
              <Check className="w-6 h-6 text-signal-blue" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display font-bold text-subheading text-midnight-ink">
                  {lastSavedClass.scheduledSessions?.length > 1
                    ? `Curso Pack Agendado (${lastSavedClass.scheduledSessions.length} sesiones)`
                    : 'Clase Registrada Exitosamente'}
                </span>
                {lastSavedClass.courseGroupId && (
                  <span className="ed-tag ed-tag-blue">
                    Grupo #{String(lastSavedClass.courseGroupId).slice(0, 8)}
                  </span>
                )}
              </div>
              <div className="ed-body ed-muted mt-2">
                Alumno: <strong className="text-midnight-ink">{lastSavedClass.studentName}</strong>{' '}
                {lastSavedClass.studentPhone && (
                  <span className="ed-num">({lastSavedClass.studentPhone})</span>
                )}{' '}
                · Horario:{' '}
                <strong className="text-midnight-ink ed-num">
                  {lastSavedClass.startTime}–{lastSavedClass.endTime}
                </strong>{' '}
                · Instructor: <strong className="text-signal-blue">{lastSavedClass.instructorName}</strong> ·
                Total Caja: <strong className="text-midnight-ink ed-num">{formatCurrency(lastSavedClass.total)}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => openStudentWhatsApp(lastSavedClass)}
              className="ed-btn ed-btn-active"
            >
              <MessageSquare className="w-4 h-4 mr-2 text-signal-blue" />
              <span>Confirmar vía WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => setLastSavedClass(null)}
              className="p-2 cursor-pointer hover:text-signal-blue"
              title="Cerrar aviso"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* FORMULARIO SECUENCIAL */}
      <form onSubmit={handleSubmit} className="space-y-12">
        {/* PASO 1: NATURALEZA DE LA CLASE */}
        <section className="ed-card space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-midnight-ink">
            <div>
              <span className="ed-eyebrow">Modalidad y Formato</span>
              <h2 className="ed-h2 mt-1">
                Paso 01 · Naturaleza de la Clase
              </h2>
            </div>
            <span className="font-display font-bold text-heading-xs text-signal-blue ed-num">
              01
            </span>
          </div>

          <div className="space-y-6">
            {/* Modalidad */}
            <div>
              <label className="ed-label">
                Modalidad del Servicio
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleModalitySelect('individual')}
                  className={`ed-btn justify-between h-14 ${
                    modality === 'individual' ? 'ed-btn-active' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <User className="w-5 h-5 text-signal-blue" />
                    <span>Individual</span>
                  </span>
                  <span className="ed-tag font-normal">1 Alumno</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModalitySelect('grupal')}
                  className={`ed-btn justify-between h-14 ${
                    modality === 'grupal' ? 'ed-btn-active' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-signal-blue" />
                    <span>Grupal</span>
                  </span>
                  <span className="ed-tag font-normal">2+ Alumnos</span>
                </button>
              </div>
            </div>

            {/* Cantidad de personas si es grupal */}
            {modality === 'grupal' && (
              <div className="p-6 border border-midnight-ink bg-cream-paper space-y-3">
                <label htmlFor="pax-input" className="ed-label">
                  Integrantes del Grupo (Mínimo 2)
                </label>
                <div className="flex items-center gap-3 max-w-xs">
                  <button
                    type="button"
                    onClick={() => setPax((p) => Math.max(2, Number(p) - 1))}
                    className="ed-btn ed-btn-sm h-12 w-14 text-subheading"
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
                    className="ed-input text-center text-subheading ed-num font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setPax((p) => Number(p) + 1)}
                    className="ed-btn ed-btn-sm h-12 w-14 text-subheading"
                  >
                    +
                  </button>
                </div>
                <p className="ed-caption ed-muted ed-num">
                  Base 2 personas: {formatCurrency(schoolConfig.priceGroupBase)} +{' '}
                  {formatCurrency(schoolConfig.priceGroupExtraPax)} por alumno adicional.
                </p>
              </div>
            )}

            {/* Categoría: Clase Única o Curso Pack */}
            <div>
              <label className="ed-label">
                Tipo de Contratación
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleCategorySelect('unica')}
                  className={`ed-btn justify-between h-14 ${
                    category === 'unica' ? 'ed-btn-active' : ''
                  }`}
                >
                  <span>Clase Única</span>
                  <span className="ed-tag font-normal">1 Sesión</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCategorySelect('curso')}
                  className={`ed-btn justify-between h-14 ${
                    category === 'curso' ? 'ed-btn-active' : ''
                  }`}
                >
                  <span>Curso Pack</span>
                  <span className="ed-tag font-normal">Pack de 8 Clases</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* PASO 2: FINANZAS Y COBRO */}
        <section className="ed-card space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-midnight-ink">
            <div>
              <span className="ed-eyebrow">Tarifación y Pago</span>
              <h2 className="ed-h2 mt-1">
                Paso 02 · Finanzas y Cobro
              </h2>
            </div>
            <span className="font-display font-bold text-heading-xs text-signal-blue ed-num">
              02
            </span>
          </div>

          <div className="space-y-6">
            {/* Subtotal Automático */}
            <div className="p-6 border border-midnight-ink bg-cream-paper flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="ed-eyebrow">Tarifa Base del Sistema</span>
                <div className="ed-caption ed-muted mt-1">
                  {category === 'curso' ? 'Programa Curso Pack 8' : 'Clase Única'} ({modality === 'grupal' ? `${effectivePax} personas` : '1 persona'})
                </div>
              </div>
              <div className="font-display font-bold text-heading-xs text-midnight-ink ed-num">
                {formatCurrency(subtotal)}
              </div>
            </div>

            {/* Descuento Manual */}
            <div>
              <label htmlFor="discount-input" className="ed-label">
                Descuento Manual en Pesos (Opcional)
              </label>
              <div className="relative max-w-sm">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center font-bold text-caption text-midnight-ink select-none">
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
                  className="ed-input pl-10 ed-num"
                />
              </div>
            </div>

            {/* Selector de Medio de Pago */}
            <div>
              <label className="ed-label">
                Medio de Pago en Caja
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="radiogroup">
                {PAYMENT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = paymentMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPaymentMethod(opt.id)}
                      className={`ed-btn h-14 ${isSelected ? 'ed-btn-active' : ''}`}
                    >
                      <Icon className="w-5 h-5 mr-1 text-signal-blue" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Total Final en Caja */}
            <div className="ed-card-ink p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-caption uppercase text-saffron-yellow tracking-[0.05em]">
                    Total a Recaudar en Caja
                  </span>
                  <span className="ed-tag border-cream-paper text-cream-paper">
                    {paymentMethod}
                  </span>
                </div>
                <div className="ed-caption text-cream-paper/70 mt-1">
                  {category === 'curso'
                    ? 'Se carga íntegramente a la Sesión #1. Las próximas 7 sesiones quedan agendadas con costo $0.'
                    : 'Ingreso directo a caja diaria'}
                </div>
              </div>
              <div className="font-display font-bold text-heading-xs text-cream-paper ed-num">
                {formatCurrency(finalTotal)}
              </div>
            </div>
          </div>
        </section>

        {/* PASO 3: ASIGNACIÓN Y AGENDA */}
        <section className="ed-card space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-midnight-ink">
            <div>
              <span className="ed-eyebrow">Programación y Alumno</span>
              <h2 className="ed-h2 mt-1">
                Paso 03 · Asignación, Calendario y Datos de Contacto
              </h2>
            </div>
            <span className="font-display font-bold text-heading-xs text-signal-blue ed-num">
              03
            </span>
          </div>

          <div className="space-y-6">
            {/* Horario y Bloques Rápidos */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label htmlFor="start-time-input" className="ed-label mb-0">
                  {category === 'curso' ? 'Horario Sesión #1 (Hoy)' : 'Horario de la Clase'}
                </label>
                <span className="ed-caption ed-muted">
                  Duración fija: 1 hora 15 minutos (+75 min)
                </span>
              </div>

              {/* Botones de bloque */}
              <div className="flex flex-wrap items-center gap-2">
                {QUICK_BLOCKS.map((block) => {
                  const blockEnd = addMinutesToTime(block, 75);
                  const isActive = startTime === block;
                  return (
                    <button
                      key={block}
                      type="button"
                      onClick={() => setStartTime(block)}
                      className={`ed-btn ed-btn-sm ${isActive ? 'ed-btn-active' : ''}`}
                    >
                      {block} a {blockEnd}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-11 items-center gap-4 pt-2">
                <div className="sm:col-span-5">
                  <span className="ed-caption font-bold text-midnight-ink block mb-2">
                    Hora de Inicio
                  </span>
                  <div className="relative">
                    <Clock className="w-5 h-5 text-signal-blue absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      id="start-time-input"
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="ed-input pl-11 ed-num"
                    />
                  </div>
                </div>

                <div className="hidden sm:flex sm:col-span-1 items-center justify-center pt-6">
                  <ArrowRight className="w-5 h-5 text-signal-blue" />
                </div>

                <div className="sm:col-span-5">
                  <span className="ed-caption font-bold text-midnight-ink block mb-2">
                    Hora de Término (+75m automático)
                  </span>
                  <div className="h-12 px-4 border border-midnight-ink bg-cream-paper flex items-center justify-between">
                    <span className="font-bold text-caption text-midnight-ink ed-num">
                      {endTime} hrs
                    </span>
                    <span className="ed-tag ed-tag-blue font-bold">
                      +75 MIN
                    </span>
                  </div>
                  {exceedsSunset && (
                    <p className="mt-2 ed-caption font-bold text-ember-red">
                      Atención: El horario sobrepasa la puesta de sol estimada ({sunsetTime}).
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Asignación de Instructor */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label htmlFor="instructor-select" className="ed-label mb-0">
                  {category === 'curso' ? 'Instructor Sesión #1' : 'Instructor de la Sesión'}
                </label>
                {isManualOverride && suggestionInfo.suggestedInstructor && (
                  <button
                    type="button"
                    onClick={handleRestoreSuggestion}
                    className="ed-link text-signal-blue"
                  >
                    Restaurar sugerencia FIFO
                  </button>
                )}
              </div>

              <select
                id="instructor-select"
                value={selectedInstructorId}
                onChange={handleInstructorChange}
                className="ed-input"
              >
                {virtualQueue.length > 0 && (
                  <optgroup label="Fila Virtual (Orden de Llegada)">
                    {virtualQueue.map((inst) => {
                      const conflicts = getInstructorConflicts(
                        inst.id,
                        startTime,
                        endTime,
                        dailyClasses
                      );
                      const isSuggested = suggestionInfo.suggestedInstructor?.id === inst.id;
                      return (
                        <option key={inst.id} value={inst.id}>
                          #{inst.queuePosition} {inst.name} (Llegada: {inst.checkInTime})
                          {isSuggested ? ' — RECOMENDADO POR FILA' : ''}
                          {conflicts.length > 0
                            ? ` [Ocupado ${conflicts[0].startTime}–${conflicts[0].endTime}]`
                            : ' [Libre]'}
                        </option>
                      );
                    })}
                  </optgroup>
                )}

                {instructors.some((i) => !i.checkedIn) && (
                  <optgroup label="Instructores sin Check-in">
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

              <p className="ed-caption ed-muted">
                {suggestionInfo.reason}
              </p>

              {selectedInstructorConflicts.length > 0 && (
                <div className="ed-notice ed-notice-alert">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>
                    Conflicto de horario: Este instructor ya tiene una clase registrada entre{' '}
                    <strong className="ed-num">
                      {selectedInstructorConflicts[0].startTime}–{selectedInstructorConflicts[0].endTime}
                    </strong>{' '}
                    ({selectedInstructorConflicts[0].studentName}).
                  </span>
                </div>
              )}
            </div>

            {/* PLANIFICADOR MULTI-SESIÓN PARA CURSO PACK */}
            {category === 'curso' && (
              <div className="p-6 border-2 border-signal-blue bg-cream-paper space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-midnight-ink">
                  <div>
                    <span className="ed-eyebrow">Multi-Agendamiento de Curso</span>
                    <h3 className="ed-h3 mt-1 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-signal-blue" />
                      <span>Sesiones Agendadas ({totalPlannedSessions}/{MAX_COURSE_PACK_SESSIONS})</span>
                    </h3>
                    <p className="ed-caption ed-muted mt-1">
                      Solo la Sesión #1 carga el monto total a caja. Las siguientes sesiones quedan con costo $0 (pagadas en pack) y el instructor puede asignarse hoy o dejarse por definir.
                    </p>
                  </div>

                  {totalPlannedSessions < MAX_COURSE_PACK_SESSIONS && (
                    <button
                      type="button"
                      onClick={handleAddFutureCourseSession}
                      className="ed-btn ed-btn-sm"
                    >
                      <Plus className="w-4 h-4 mr-1 text-signal-blue" />
                      <span>Agregar Sesión #{totalPlannedSessions + 1}</span>
                    </button>
                  )}
                </div>

                {/* Sesión #1 fija */}
                <div className="p-4 border border-midnight-ink bg-cream-paper flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-caption">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="ed-tag ed-tag-ink font-bold">
                      Sesión #1
                    </span>
                    <span className="ed-num font-bold text-midnight-ink">
                      {formatIsoToDisplayDate(getTodayIsoDate())} · {startTime}–{endTime}
                    </span>
                    <span className="ed-muted">
                      Instructor: <strong className="text-signal-blue">{instructors.find((i) => i.id === selectedInstructorId)?.name || 'Asignado'}</strong>
                    </span>
                  </div>
                  <span className="ed-tag ed-tag-blue font-bold ed-num">
                    Cargo a Caja: {formatCurrency(finalTotal)}
                  </span>
                </div>

                {/* Sesiones adicionales */}
                {extraCourseSessions.map((ses, index) => {
                  const sessionNumber = index + 2;
                  const sesEndTime = addMinutesToTime(ses.startTime || '10:30', 75);
                  return (
                    <div
                      key={ses.tempId}
                      className="p-5 border border-midnight-ink bg-cream-paper space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="ed-tag">
                            Sesión #{sessionNumber}
                          </span>
                          <span className="ed-tag ed-tag-blue">
                            Pagado en Pack ($0)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFutureSession(ses.tempId)}
                          className="ed-link text-ember-red"
                        >
                          Quitar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="ed-label mb-1">
                            Fecha en Calendario
                          </label>
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
                            className="ed-input ed-num"
                          />
                        </div>

                        <div>
                          <label className="ed-label mb-1">
                            Inicio (Término {sesEndTime})
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
                            className="ed-input ed-num"
                          />
                        </div>

                        <div>
                          <label className="ed-label mb-1">
                            Instructor (Opcional)
                          </label>
                          <select
                            value={ses.instructorId}
                            onChange={(e) =>
                              handleUpdateFutureSession(
                                ses.tempId,
                                'instructorId',
                                e.target.value
                              )
                            }
                            className="ed-input"
                          >
                            <option value="">Por definir (Asignar en recepción)</option>
                            {instructors.map((inst) => (
                              <option key={inst.id} value={inst.id}>
                                {inst.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ficha del Alumno */}
            <div className="pt-6 border-t border-midnight-ink/15 space-y-4">
              <span className="ed-eyebrow">Datos del Alumno</span>
              <h3 className="ed-h3">
                Información de Registro
              </h3>

              <div>
                <label htmlFor="student-name" className="ed-label">
                  Nombre Completo *
                </label>
                <input
                  id="student-name"
                  type="text"
                  required
                  placeholder="Ej. Matías González"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="ed-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="student-phone" className="ed-label">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    id="student-phone"
                    type="tel"
                    required
                    placeholder="+56 9 8765 4321"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    className="ed-input ed-num"
                  />
                </div>

                <div>
                  <label htmlFor="student-email" className="ed-label">
                    Correo Electrónico
                  </label>
                  <input
                    id="student-email"
                    type="email"
                    placeholder="alumno@correo.cl"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    className="ed-input"
                  />
                </div>
              </div>

              {/* Contacto de Emergencia */}
              <div className="p-6 border border-midnight-ink bg-cream-paper space-y-4">
                <span className="font-bold text-caption text-midnight-ink flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-signal-blue" />
                  <span>Contacto de Emergencia *</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="emergency-name" className="ed-label">
                      Nombre de Contacto *
                    </label>
                    <input
                      id="emergency-name"
                      type="text"
                      required
                      placeholder="Ej. Carolina Soto (Madre / Pareja)"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      className="ed-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="emergency-phone" className="ed-label">
                      Teléfono de Emergencia *
                    </label>
                    <input
                      id="emergency-phone"
                      type="tel"
                      required
                      placeholder="+56 9 1234 5678"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      className="ed-input ed-num"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Botón de Guardado */}
        <button
          type="submit"
          className="ed-btn ed-btn-block py-5 text-body"
        >
          <span>
            {category === 'curso'
              ? `Guardar Curso Pack (${totalPlannedSessions} ${
                  totalPlannedSessions === 1 ? 'Sesión' : 'Sesiones'
                }) · Caja: ${formatCurrency(finalTotal)}`
              : `Guardar Clase (${startTime} a ${endTime}) · Total: ${formatCurrency(finalTotal)}`}
          </span>
        </button>
      </form>

      {/* Bitácora de Clases Registradas */}
      <section className="ed-card space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-midnight-ink">
          <div>
            <span className="ed-eyebrow">Bitácora Operativa</span>
            <h3 className="ed-h3 mt-1">
              Registro del Día y Sesiones de Curso ({dailyClasses.length})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto border border-midnight-ink">
          {dailyClasses.length === 0 ? (
            <div className="p-8 text-center ed-body ed-muted">
              No hay clases registradas en el día de hoy.
            </div>
          ) : (
            <table className="ed-table">
              <thead>
                <tr>
                  <th>Fecha / Horario</th>
                  <th>Alumno / Contacto</th>
                  <th>Emergencia</th>
                  <th>Modalidad / Pack</th>
                  <th>Instructor</th>
                  <th className="text-right">Total Caja</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {dailyClasses.map((cls) => {
                  const inst = instructors.find((i) => i.id === cls.instructorId);
                  const isPaidPackSession =
                    cls.isPaidInPack ||
                    (cls.category === 'curso' && Number(cls.finalTotal) === 0);

                  return (
                    <tr key={cls.id}>
                      <td className="ed-num">
                        <div className="font-bold text-midnight-ink">{cls.startTime}–{cls.endTime}</div>
                        {cls.date && (
                          <div className="ed-caption ed-muted">
                            {cls.date}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="font-bold text-midnight-ink">{cls.studentName}</div>
                        {cls.studentPhone && (
                          <div className="ed-caption ed-num">{cls.studentPhone}</div>
                        )}
                        {cls.studentEmail && (
                          <div className="ed-caption ed-muted">{cls.studentEmail}</div>
                        )}
                      </td>
                      <td>
                        {cls.emergencyContactName ? (
                          <div>
                            <div className="font-bold text-midnight-ink">
                              {cls.emergencyContactName}
                            </div>
                            <div className="ed-caption ed-num text-signal-blue">
                              {cls.emergencyContactPhone}
                            </div>
                          </div>
                        ) : (
                          <span className="ed-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="font-bold text-midnight-ink">
                          {cls.modality === 'grupal' ? `Grupal (${cls.pax} pax)` : 'Individual'} ·{' '}
                          {cls.category === 'curso' ? 'Curso Pack' : 'Única'}
                        </div>
                        {cls.courseGroupId && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="ed-tag ed-tag-blue font-bold ed-num">
                              Sesión {cls.sessionIndex || 1}/{cls.totalSessions || 8}
                            </span>
                            <span className="ed-caption ed-muted ed-num">
                              #{String(cls.courseGroupId).slice(0, 6)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        {inst ? (
                          <span className="font-bold text-midnight-ink">{inst.name}</span>
                        ) : (
                          <select
                            aria-label={`Asignar instructor a ${cls.studentName}`}
                            value={cls.instructorId || ''}
                            onChange={(e) => assignInstructorToClass(cls.id, e.target.value)}
                            className="ed-input h-10 text-caption font-bold"
                          >
                            <option value="">Por definir</option>
                            {instructors.map((itemInst) => (
                              <option key={itemInst.id} value={itemInst.id}>
                                Asignar: {itemInst.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="text-right ed-num font-bold">
                        <div>{formatCurrency(cls.finalTotal)}</div>
                        {isPaidPackSession ? (
                          <span className="ed-tag ed-tag-blue font-normal mt-1">
                            Pagado en Pack
                          </span>
                        ) : (
                          <div className="ed-caption ed-muted font-normal">
                            {cls.paymentMethod}
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openStudentWhatsApp({
                                studentName: cls.studentName,
                                studentPhone: cls.studentPhone,
                                instructorName: inst?.name || 'Por definir',
                                startTime: cls.startTime,
                                endTime: cls.endTime,
                                total: cls.finalTotal,
                              })
                            }
                            className="p-1 cursor-pointer hover:text-signal-blue"
                            title="Confirmación WhatsApp"
                          >
                            <MessageSquare className="w-5 h-5 text-signal-blue" />
                          </button>

                          <button
                            type="button"
                            onClick={() => removeDailyClass(cls.id)}
                            className="p-1 cursor-pointer hover:text-ember-red text-midnight-ink/40"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
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
