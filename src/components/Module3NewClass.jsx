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
} from 'lucide-react';
import { useSurfSchool } from '../context/SurfSchoolContext';
import {
  calculateStudentSubtotal,
  formatCurrency,
  getInstructorConflicts,
  addMinutesToTime,
} from '../utils/calculations';

const PAYMENT_OPTIONS = [
  { id: 'Transferencia', label: 'Transferencia', icon: Smartphone },
  { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'Tarjeta', label: 'Tarjeta', icon: CreditCard },
];

const QUICK_BLOCKS = ['09:00', '10:30', '12:00', '15:00', '16:30'];

export default function Module3NewClass() {
  const {
    schoolConfig,
    instructors,
    virtualQueue,
    dailyClasses,
    addDailyClass,
    removeDailyClass,
    getSuggestedInstructorForSlot,
  } = useSurfSchool();

  // Paso 1: Naturaleza de la Clase
  const [modality, setModality] = useState('individual'); // 'individual' | 'grupal'
  const [pax, setPax] = useState(2);
  const [category, setCategory] = useState('unica'); // 'unica' | 'curso'

  // Paso 2: Finanzas y Cobro
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Transferencia');

  // Paso 3: Asignación y Agenda (Duración fija automática +1h 15m = 75 min)
  const [startTime, setStartTime] = useState('10:30');
  const endTime = useMemo(() => addMinutesToTime(startTime, 75), [startTime]);

  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [studentName, setStudentName] = useState('');

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

  // Sugerencia inteligente desde la Fila Virtual
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedInstructorId) return;

    const wasSuggested =
      suggestionInfo.suggestedInstructor?.id === selectedInstructorId && !isManualOverride;

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
    });

    const assignedInst = instructors.find((i) => i.id === created.instructorId);

    setLastSavedClass({
      studentName: created.studentName,
      instructorName: assignedInst?.name || 'Instructor',
      startTime: created.startTime,
      endTime: created.endTime,
      total: created.finalTotal,
      method: created.paymentMethod,
    });

    // Reiniciar el formulario tras guardar
    setModality('individual');
    setPax(2);
    setCategory('unica');
    setDiscount('');
    setPaymentMethod('Transferencia');
    setStudentName('');
    setIsManualOverride(false);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generador de Mensajes de WhatsApp con el formato exacto requerido
  const handleSendWhatsApp = () => {
    if (!lastSavedClass) return;

    const formattedNumber = Math.round(Number(lastSavedClass.total) || 0).toLocaleString('es-CL');
    const mensajeConfirmacion = [
      '🏄‍♂️ *Confirmación de Clase - Poisson Surf School*',
      `👤 Alumno: ${lastSavedClass.studentName}`,
      `📅 Horario: ${lastSavedClass.startTime} - ${lastSavedClass.endTime}`,
      `👨‍🏫 Instructor: ${lastSavedClass.instructorName}`,
      `💰 Total a pagar: $${formattedNumber}`,
    ].join('\n');

    const url =
      'https://wa.me/message/CWWCLIGEJSRLI1?text=' +
      encodeURIComponent(mensajeConfirmacion);

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Cabecera */}
      <div className="pb-5 border-b border-slate-300">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-sky-600">
          <span className="w-2 h-2 bg-pink-600 inline-block" />
          Módulo 03 · Registro Operativo
        </span>
        <h1 className="text-2xl font-bold text-blue-950 mt-1">
          Ingreso de Nueva Clase
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Flujo secuencial de registro. El término (+1h 15m) y la tarifa del instructor se calculan automáticamente.
        </p>
      </div>

      {/* SUCCESS BANNER CON BOTÓN DE CONFIRMACIÓN POR WHATSAPP */}
      {lastSavedClass && (
        <div className="p-5 bg-emerald-50/90 border-2 border-pink-600 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 bg-pink-600 text-white flex items-center justify-center shrink-0 rounded-none mt-0.5">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-blue-950 uppercase tracking-wide">
                Clase Registrada Exitosamente
              </div>
              <div className="text-sm text-slate-700 mt-0.5">
                Alumno: <strong className="text-blue-950">{lastSavedClass.studentName}</strong> ·
                Horario: <strong className="font-mono">{lastSavedClass.startTime} - {lastSavedClass.endTime}</strong> ·
                Instructor: <strong className="text-blue-950">{lastSavedClass.instructorName}</strong> ·
                Total: <strong className="font-mono text-pink-600">{formatCurrency(lastSavedClass.total)}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="h-11 px-5 rounded-none bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              Enviar Confirmación por WhatsApp
            </button>

            <button
              type="button"
              onClick={() => setLastSavedClass(null)}
              className="h-11 w-11 border border-slate-300 bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center rounded-none transition cursor-pointer"
              title="Cerrar alerta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FORMULARIO VERTICAL ESTRICTO (1 Sola Columna Central) */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ==========================================
            PASO 1: NATURALEZA DE LA CLASE
        ========================================== */}
        <section className="border border-slate-300 bg-white rounded-none">
          <div className="px-6 py-3.5 bg-blue-950 text-white border-b border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-4 bg-pink-500 inline-block" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Paso 01 · Naturaleza de la Clase
              </span>
            </div>
            <span className="text-xs font-mono text-sky-300">Modalidad & Categoría</span>
          </div>

          <div className="p-6 space-y-6">
            {/* Modalidad: Individual o Grupal */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-950 uppercase tracking-wide">
                1. Modalidad
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleModalitySelect('individual')}
                  className={`h-14 px-5 rounded-sm border text-base font-semibold transition flex items-center justify-between cursor-pointer ${
                    modality === 'individual'
                      ? 'bg-blue-950 text-white border-blue-950 border-b-2 border-b-pink-600'
                      : 'bg-white text-slate-800 border-slate-300 hover:bg-sky-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <User className={`w-5 h-5 ${modality === 'individual' ? 'text-sky-400' : 'text-slate-500'}`} />
                    Individual
                  </span>
                  <span className="text-xs font-mono opacity-80">1 PAX</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModalitySelect('grupal')}
                  className={`h-14 px-5 rounded-sm border text-base font-semibold transition flex items-center justify-between cursor-pointer ${
                    modality === 'grupal'
                      ? 'bg-blue-950 text-white border-blue-950 border-b-2 border-b-pink-600'
                      : 'bg-white text-slate-800 border-slate-300 hover:bg-sky-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Users className={`w-5 h-5 ${modality === 'grupal' ? 'text-sky-400' : 'text-slate-500'}`} />
                    Grupal
                  </span>
                  <span className="text-xs font-mono opacity-80">2+ PAX</span>
                </button>
              </div>
            </div>

            {/* Cantidad de Personas si es Grupal */}
            {modality === 'grupal' && (
              <div className="p-4 bg-slate-50 border border-slate-300 rounded-none space-y-2">
                <label htmlFor="pax-input" className="block text-sm font-semibold text-blue-950">
                  Cantidad de Personas en el Grupo (Mínimo 2)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPax((p) => Math.max(2, Number(p) - 1))}
                    className="h-12 w-14 rounded-sm border border-slate-300 bg-white hover:bg-sky-50 text-lg font-bold text-blue-950 transition cursor-pointer"
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
                    className="flex-1 h-12 px-4 rounded-sm border border-slate-300 bg-white text-center text-lg font-semibold text-blue-950 focus:border-blue-950 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setPax((p) => Number(p) + 1)}
                    className="h-12 w-14 rounded-sm border border-slate-300 bg-white hover:bg-sky-50 text-lg font-bold text-blue-950 transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Base 2 personas ({formatCurrency(schoolConfig.priceGroupBase)}) +{' '}
                  {formatCurrency(schoolConfig.priceGroupExtraPax)} por persona adicional.
                </p>
              </div>
            )}

            {/* Categoría: Clase Única o Curso (Pack de 8) */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-950 uppercase tracking-wide">
                2. Categoría
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCategory('unica')}
                  className={`h-14 px-5 rounded-sm border text-base font-semibold transition flex items-center justify-between cursor-pointer ${
                    category === 'unica'
                      ? 'bg-blue-950 text-white border-blue-950 border-b-2 border-b-pink-600'
                      : 'bg-white text-slate-800 border-slate-300 hover:bg-sky-50'
                  }`}
                >
                  <span>Clase Única</span>
                  <span className="text-xs font-mono opacity-80">1 SESIÓN</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('curso')}
                  className={`h-14 px-5 rounded-sm border text-base font-semibold transition flex items-center justify-between cursor-pointer ${
                    category === 'curso'
                      ? 'bg-blue-950 text-white border-blue-950 border-b-2 border-b-pink-600'
                      : 'bg-white text-slate-800 border-slate-300 hover:bg-sky-50'
                  }`}
                >
                  <span>Curso</span>
                  <span className="text-xs font-mono opacity-80">PACK 8 CLASES</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            PASO 2: FINANZAS Y COBRO
        ========================================== */}
        <section className="border border-slate-300 bg-white rounded-none">
          <div className="px-6 py-3.5 bg-blue-950 text-white border-b border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-4 bg-sky-400 inline-block" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Paso 02 · Finanzas y Cobro
              </span>
            </div>
            <span className="text-xs font-mono text-sky-300">Cálculo de Caja</span>
          </div>

          <div className="p-6 space-y-6">
            {/* Subtotal Automático */}
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                  Subtotal Automático
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Según tarifas vigentes ({category === 'curso' ? 'Curso Pack 8' : 'Clase Única'} ·{' '}
                  {modality === 'grupal' ? `${effectivePax} personas` : '1 persona'})
                </div>
              </div>
              <div className="text-2xl font-mono font-bold text-blue-950">
                {formatCurrency(subtotal)}
              </div>
            </div>

            {/* Descuento Manual */}
            <div className="space-y-1.5">
              <label htmlFor="discount-input" className="block text-sm font-semibold text-blue-950">
                Descuento Manual (Opcional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-sm font-semibold text-slate-400 select-none">
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
                  className="w-full h-12 pl-10 pr-4 rounded-sm border border-slate-300 bg-white text-base font-semibold text-blue-950 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none"
                />
              </div>
            </div>

            {/* Selector de Medio de Pago Cuadrado */}
            <div className="space-y-2">
              <span className="block text-sm font-semibold text-blue-950 uppercase tracking-wide">
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
                      className={`h-14 px-4 rounded-sm border text-sm font-semibold transition flex items-center justify-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-950 text-white border-blue-950 border-b-2 border-b-pink-600'
                          : 'bg-white text-slate-800 border-slate-300 hover:bg-sky-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Total Final (Caja) con protagonismo Azul y detalle complementario Pink-600 */}
            <div className="p-5 bg-sky-50/60 border border-blue-950 border-l-4 border-l-pink-600 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2">
                  <span>Total Final (Ingreso a Caja)</span>
                  <span className="px-2 py-0.5 bg-pink-600 text-white text-[10px] font-mono uppercase">
                    {paymentMethod}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Monto neto a registrar en caja de la escuela
                </div>
              </div>
              <div className="text-3xl font-mono font-bold text-blue-950">
                {formatCurrency(finalTotal)}
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            PASO 3: ASIGNACIÓN Y AGENDA
        ========================================== */}
        <section className="border border-slate-300 bg-white rounded-none">
          <div className="px-6 py-3.5 bg-blue-950 text-white border-b border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-4 bg-pink-500 inline-block" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Paso 03 · Asignación y Agenda
              </span>
            </div>
            <span className="text-xs font-mono text-sky-300">Duración fija 1h 15m</span>
          </div>

          <div className="p-6 space-y-6">
            {/* Horario con cálculo automático +1h 15m */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label htmlFor="start-time-input" className="block text-sm font-semibold text-blue-950 uppercase tracking-wide">
                  Horario de la Clase
                </label>
                <span className="text-xs font-mono font-semibold text-sky-600">
                  Término automático: +1 hora 15 min
                </span>
              </div>

              {/* Botones rápidos de bloque */}
              <div className="flex flex-wrap items-center gap-2">
                {QUICK_BLOCKS.map((block) => {
                  const blockEnd = addMinutesToTime(block, 75);
                  const isActive = startTime === block;
                  return (
                    <button
                      key={block}
                      type="button"
                      onClick={() => setStartTime(block)}
                      className={`h-9 px-3 rounded-sm border text-xs font-mono font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-950 text-white border-blue-950 border-b-2 border-b-pink-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-sky-50'
                      }`}
                    >
                      {block}–{blockEnd}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-11 items-center gap-3">
                <div className="sm:col-span-5">
                  <span className="block text-xs font-medium text-slate-500 mb-1">
                    Hora de Inicio
                  </span>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-sky-500 absolute left-3.5 top-4 pointer-events-none" />
                    <input
                      id="start-time-input"
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-12 pl-10 pr-4 rounded-sm border border-slate-300 bg-white text-lg font-mono font-semibold text-blue-950 focus:border-blue-950 outline-none"
                    />
                  </div>
                </div>

                <div className="hidden sm:flex sm:col-span-1 items-center justify-center pt-5">
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>

                <div className="sm:col-span-5">
                  <span className="block text-xs font-medium text-slate-500 mb-1">
                    Hora de Término (Automática +1h 15m)
                  </span>
                  <div className="h-12 px-4 rounded-sm border border-slate-300 bg-slate-100 text-blue-950 flex items-center justify-between">
                    <span className="text-lg font-mono font-bold text-blue-950">
                      {endTime} hrs
                    </span>
                    <span className="px-2 py-0.5 bg-blue-950 text-sky-300 text-[10px] font-mono uppercase">
                      +75 MIN
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Asignación de Instructor */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label htmlFor="instructor-select" className="block text-sm font-semibold text-blue-950 uppercase tracking-wide">
                  Instructor Asignado
                </label>
                {isManualOverride && suggestionInfo.suggestedInstructor && (
                  <button
                    type="button"
                    onClick={handleRestoreSuggestion}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar sugerencia de Fila Virtual
                  </button>
                )}
              </div>

              <select
                id="instructor-select"
                value={selectedInstructorId}
                onChange={handleInstructorChange}
                className="w-full h-12 px-4 rounded-sm border border-slate-300 bg-white text-base font-semibold text-blue-950 focus:border-blue-950 outline-none cursor-pointer"
              >
                {virtualQueue.length > 0 && (
                  <optgroup label="Fila Virtual (Orden de llegada)">
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

              <p className="text-xs text-slate-500">{suggestionInfo.reason}</p>

              {selectedInstructorConflicts.length > 0 && (
                <div className="p-3 border border-pink-600 bg-pink-50 text-xs font-medium text-slate-900 flex items-center gap-2 rounded-none">
                  <AlertTriangle className="w-4 h-4 text-pink-600 shrink-0" />
                  <span>
                    Conflicto de horario: este instructor registra una clase entre{' '}
                    <strong className="font-mono">
                      {selectedInstructorConflicts[0].startTime}–{selectedInstructorConflicts[0].endTime}
                    </strong>{' '}
                    ({selectedInstructorConflicts[0].studentName}).
                  </span>
                </div>
              )}
            </div>

            {/* Nombre del Alumno */}
            <div className="space-y-1.5">
              <label htmlFor="student-name" className="block text-sm font-semibold text-blue-950 uppercase tracking-wide">
                Nombre del Alumno
              </label>
              <input
                id="student-name"
                type="text"
                required
                placeholder="Ingresar nombre del alumno o responsable"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full h-12 px-4 rounded-sm border border-slate-300 bg-white text-base font-medium text-blue-950 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none"
              />
            </div>
          </div>
        </section>

        {/* Botón Final de Guardado Gigante, Rectangular con Protagonismo Azul y Acento Pink-600 */}
        <button
          type="submit"
          className="w-full h-16 px-8 rounded-none bg-blue-950 hover:bg-blue-900 border-b-4 border-pink-600 text-white text-lg font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-3"
        >
          <span>Guardar Clase ({startTime}–{endTime}) · {formatCurrency(finalTotal)}</span>
        </button>
      </form>

      {/* Tabla Corporativa de Clases Registradas en el Día */}
      <section className="pt-4 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
          Registro Operativo del Día ({dailyClasses.length})
        </h3>

        <div className="border border-slate-300 bg-white rounded-none overflow-x-auto">
          {dailyClasses.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Sin clases registradas en la jornada actual.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-950 text-white text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Horario</th>
                  <th className="py-3 px-4">Alumno</th>
                  <th className="py-3 px-4">Modalidad / Tipo</th>
                  <th className="py-3 px-4">Instructor</th>
                  <th className="py-3 px-4">Medio Pago</th>
                  <th className="py-3 px-4 text-right">Total Caja</th>
                  <th className="py-3 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {dailyClasses.map((cls) => {
                  const inst = instructors.find((i) => i.id === cls.instructorId);
                  return (
                    <tr key={cls.id} className="even:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-950">
                        {cls.startTime}–{cls.endTime}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {cls.studentName}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {cls.modality === 'grupal' ? `Grupal (${cls.pax} pax)` : 'Individual'} ·{' '}
                        {cls.category === 'curso' ? 'Curso Pack 8' : 'Única'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-blue-950">
                        {inst?.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{cls.paymentMethod}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-blue-950">
                        {formatCurrency(cls.finalTotal)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeDailyClass(cls.id)}
                          className="p-1.5 text-slate-400 hover:text-pink-600 transition cursor-pointer"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
