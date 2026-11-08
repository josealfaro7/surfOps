import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Clock,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Eye,
  X,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import { useSurfSchool } from '../context/SurfSchoolContext';
import {
  formatCurrency,
  timeToMinutes,
  addMinutesToTime,
  calculateRentalTotals,
} from '../utils/calculations';
import { compressImageFileToBase64 } from '../utils/imageUtils';

function getCurrentHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
}

/**
 * Subcomponente aislado para la Sección B (Monitor de Arriendos Activos).
 * Mantiene su propio reloj (setInterval) para no re-renderizar el formulario de la Sección A.
 */
function ActiveRentalsMonitor({
  activeRentals,
  completedRentals,
  onCompleteRental,
  onInspectPhoto,
}) {
  const [currentHHMM, setCurrentHHMM] = useState(getCurrentHHMM);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentHHMM(getCurrentHHMM());
    }, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const currentMinutes = timeToMinutes(currentHHMM);

  return (
    <div className="space-y-8">
      {/* SECCIÓN B: PANEL DE ARRIENDOS ACTIVOS (MONITOR) */}
      <section className="border border-slate-300 bg-white rounded-none">
        <div className="px-6 py-4 bg-blue-950 text-white border-b border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-4 bg-pink-500 inline-block" />
            <Clock className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Sección B · Panel de Arriendos en Curso (Monitor Activo)
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
            <span className="text-slate-300">
              Hora actual sistema: <strong className="text-white">{currentHHMM} hrs</strong>
            </span>
            <span className="px-2 py-0.5 bg-pink-600 text-white font-bold">
              Activos: {activeRentals.length}
            </span>
          </div>
        </div>

        {activeRentals.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No hay arriendos de equipamiento en curso en este momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm tabular-nums">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold uppercase tracking-wider text-blue-950">
                  <th className="py-3 px-4">Cliente / Emergencia</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4 text-center">Cant.</th>
                  <th className="py-3 px-4 text-center">Horas</th>
                  <th className="py-3 px-4">Devolución Estimada</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeRentals.map((rental) => {
                  const returnMinutes = timeToMinutes(rental.estimatedReturnTime);
                  const isOverdue = currentMinutes > returnMinutes;

                  return (
                    <tr
                      key={rental.id}
                      className={
                        isOverdue ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'
                      }
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-blue-950">{rental.customerName}</div>
                        {rental.customerEmail && (
                          <div className="text-xs text-slate-500">{rental.customerEmail}</div>
                        )}
                        {rental.emergencyContact && (
                          <div className="text-xs font-semibold text-red-600 mt-0.5">
                            🚨 Em: {rental.emergencyContact}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                        {rental.customerPhone}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-blue-950">
                          {rental.itemLabel}
                        </span>
                        <span className="block text-[11px] font-mono text-slate-500">
                          {formatCurrency(rental.unitPricePerHour)} / hr
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-blue-950">
                        {rental.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-800">
                          {rental.hours} {rental.hours === 1 ? 'hr' : 'hrs'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-500">
                          Ingreso: {rental.checkInTime} hrs
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            isOverdue ? 'text-red-600' : 'text-blue-950'
                          }`}
                        >
                          Entrega: {rental.estimatedReturnTime} hrs
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-blue-950">
                        {formatCurrency(rental.finalTotal)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white text-xs font-bold uppercase tracking-wider animate-pulse rounded-none">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Atrasado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-500 text-emerald-800 text-xs font-bold uppercase tracking-wider rounded-none">
                            En Curso
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onInspectPhoto(rental)}
                            title="Ver Foto de Carnet de Identidad"
                            className="inline-flex items-center gap-1.5 h-9 px-3 border border-slate-300 bg-white hover:bg-sky-50 text-blue-950 text-xs font-semibold transition cursor-pointer rounded-sm"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-600" />
                            Carnet
                          </button>
                          <button
                            type="button"
                            onClick={() => onCompleteRental(rental.id)}
                            className="inline-flex items-center gap-1.5 h-9 px-3 bg-blue-950 hover:bg-blue-900 border-b-2 border-pink-600 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer rounded-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                            Devolución Recibida
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* HISTORIAL DE ARRIENDOS COMPLETADOS */}
      {completedRentals.length > 0 && (
        <section className="border border-slate-300 bg-white rounded-none">
          <div className="px-6 py-3 bg-slate-100 border-b border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                Historial de Arriendos Completados Hoy ({completedRentals.length})
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              surfops_completed_rentals
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-4">Cliente</th>
                  <th className="py-2.5 px-4">Equipamiento</th>
                  <th className="py-2.5 px-4">Horario (Ingreso → Devolución Real)</th>
                  <th className="py-2.5 px-4 text-right">Total Pagado</th>
                  <th className="py-2.5 px-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {completedRentals.map((item) => (
                  <tr key={item.id} className="text-slate-700">
                    <td className="py-2.5 px-4 font-semibold text-blue-950">
                      {item.customerName}{' '}
                      <span className="text-slate-400 font-normal">
                        ({item.customerPhone})
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {item.quantity}x {item.itemLabel} ({item.hours}h)
                    </td>
                    <td className="py-2.5 px-4 font-mono">
                      {item.checkInTime} → {item.returnedAt || item.estimatedReturnTime} hrs
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-blue-950">
                      {formatCurrency(item.finalTotal)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 text-[10px] font-bold uppercase text-emerald-700">
                        Devuelto
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default function Module5Rentals() {
  const {
    rentalRates,
    activeRentals,
    completedRentals,
    rentalsTotalRevenue,
    addRental,
    completeRental,
  } = useSurfSchool();

  // Filtrar estrictamente los items habilitados desde Configuración (Módulo 01)
  const enabledItems = useMemo(
    () => rentalRates.filter((item) => Boolean(item.enabled)),
    [rentalRates]
  );

  // Estado Columna Izquierda: Datos de Arriendo
  const [selectedItemId, setSelectedItemId] = useState(
    () => enabledItems[0]?.id || ''
  );
  const [quantity, setQuantity] = useState(1);
  const [hours, setHours] = useState(1);
  const [checkInTime, setCheckInTime] = useState(getCurrentHHMM);
  const [discount, setDiscount] = useState(0);

  // Estado Columna Derecha: Datos del Cliente + Foto de Carnet
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [idPhotoBase64, setIdPhotoBase64] = useState('');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState(false);

  // Modal de inspección de foto de carnet
  const [inspectedRental, setInspectedRental] = useState(null);

  // Mantener sincronizado el ítem seleccionado si cambian los habilitados en Módulo 01
  useEffect(() => {
    if (
      enabledItems.length > 0 &&
      !enabledItems.some((item) => item.id === selectedItemId)
    ) {
      setSelectedItemId(enabledItems[0].id);
    } else if (enabledItems.length === 0) {
      setSelectedItemId('');
    }
  }, [enabledItems, selectedItemId]);

  const selectedRateItem = useMemo(
    () => enabledItems.find((item) => item.id === selectedItemId) || null,
    [enabledItems, selectedItemId]
  );

  const unitPricePerHour = Number(selectedRateItem?.pricePerHour) || 0;

  const { subtotal, discount: validDiscount, finalTotal } = useMemo(
    () => calculateRentalTotals(unitPricePerHour, quantity, hours, discount),
    [unitPricePerHour, quantity, hours, discount]
  );

  // Hora estimada de devolución usando estrictamente addMinutesToTime(checkInTime, hours * 60)
  const estimatedReturnTime = useMemo(
    () => addMinutesToTime(checkInTime, (Number(hours) || 1) * 60),
    [checkInTime, hours]
  );

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError('');
    setIsCompressingPhoto(true);
    try {
      // Compresión agresiva (maxWidth = 400, quality = 0.5) para proteger los 5MB de localStorage
      const base64 = await compressImageFileToBase64(file, 400, 0.5);
      setIdPhotoBase64(base64);
    } catch {
      setFormError('No se pudo procesar la fotografía del Carnet de Identidad.');
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedRateItem) {
      setFormError(
        'No hay equipamiento habilitado. Habilita al menos un ítem en el Módulo 01 (Configuración).'
      );
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setFormError('Completa el Nombre Completo y el Teléfono del cliente.');
      return;
    }
    if (!idPhotoBase64) {
      setFormError(
        'Debes adjuntar la Foto del Carnet de Identidad antes de registrar el arriendo.'
      );
      return;
    }

    const created = addRental({
      itemId: selectedRateItem.id,
      quantity,
      hours,
      checkInTime,
      discount: validDiscount,
      customerName,
      customerEmail,
      customerPhone,
      emergencyContact,
      idPhotoBase64,
    });

    if (created) {
      // Reiniciar campos del cliente y actualizar hora actual
      setQuantity(1);
      setHours(1);
      setCheckInTime(getCurrentHHMM());
      setDiscount(0);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setEmergencyContact('');
      setIdPhotoBase64('');
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3500);
    }
  };

  return (
    <div className="space-y-8">
      {/* Cabecera del Módulo 05 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-300">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-sky-600">
            <span className="w-2 h-2 bg-pink-600 inline-block" />
            Módulo 05 · Operaciones de Equipamiento
          </span>
          <h1 className="text-2xl font-bold text-blue-950 mt-1">
            Gestión de Arriendos y Control de Devoluciones
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Registra salidas de equipamiento con respaldo de Carnet de Identidad y monitorea los horarios de entrega.
          </p>
        </div>

        {/* Resumen rápido de caja de arriendos (rentalsTotalRevenue) */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-4 py-2 bg-white border border-slate-300 rounded-none tabular-nums">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              En Curso / Completados
            </span>
            <span className="text-sm font-bold text-blue-950">
              {activeRentals.length} activos · {completedRentals.length} devueltos
            </span>
          </div>
          <div className="px-4 py-2 bg-blue-950 text-white border-l-4 border-pink-600 rounded-none tabular-nums">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-pink-400">
              Caja Arriendos Hoy
            </span>
            <span className="text-base font-extrabold">
              {formatCurrency(rentalsTotalRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* Banner de confirmación */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-400 border-l-4 border-l-pink-600 flex items-center justify-between text-sm font-semibold text-blue-950 rounded-none">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-pink-600 shrink-0" />
            <span>
              Arriendo registrado exitosamente y agregado al monitor de arriendos en curso.
            </span>
          </div>
        </div>
      )}

      {/* SECCIÓN A: REGISTRO DE ARRIENDOS (INGRESO) */}
      <form
        onSubmit={handleSubmit}
        className="border border-slate-300 bg-white rounded-none"
      >
        <div className="px-6 py-4 bg-blue-950 text-white border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-4 bg-sky-400 inline-block" />
            <Shield className="w-4 h-4 text-pink-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Sección A · Registro de Arriendos (Ingreso)
            </h2>
          </div>
          <span className="text-xs font-mono text-sky-300">
            surfops_active_rentals
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* COLUMNA IZQUIERDA: 1. DATOS DE ARRIENDO */}
          <div className="lg:col-span-6 space-y-5">
            <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                1. Datos de Arriendo (Equipamiento y Horario)
              </h3>
              <span className="text-xs font-mono text-slate-500">
                Tarifas desde Módulo 01
              </span>
            </div>

            {enabledItems.length === 0 ? (
              <div className="p-4 border border-red-300 bg-red-50 text-xs font-semibold text-red-700">
                ⚠️ Todos los ítems de arriendo están deshabilitados en el Módulo 01 (Configuración).
              </div>
            ) : (
              <>
                {/* Selector de Item */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="rental-item-select"
                    className="block text-xs font-bold uppercase tracking-wider text-blue-950"
                  >
                    Selector de Item (Habilitados en Configuración)
                  </label>
                  <select
                    id="rental-item-select"
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full h-11 px-3 rounded-sm border border-slate-300 bg-white text-sm font-semibold text-blue-950 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none"
                  >
                    {enabledItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label} — {formatCurrency(item.pricePerHour)} / hora
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cantidad y Horas de Arriendo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="rental-quantity-input"
                      className="block text-xs font-bold uppercase tracking-wider text-blue-950"
                    >
                      Cantidad
                    </label>
                    <input
                      id="rental-quantity-input"
                      type="number"
                      min="1"
                      max="50"
                      required
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="w-full h-11 px-3 rounded-sm border border-slate-300 bg-white text-sm font-semibold text-blue-950 tabular-nums focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="rental-hours-select"
                      className="block text-xs font-bold uppercase tracking-wider text-blue-950"
                    >
                      Horas de Arriendo (1 a 12 hrs)
                    </label>
                    <select
                      id="rental-hours-select"
                      value={hours}
                      onChange={(e) => setHours(Number(e.target.value) || 1)}
                      className="w-full h-11 px-3 rounded-sm border border-slate-300 bg-white text-sm font-semibold text-blue-950 tabular-nums focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none"
                    >
                      {Array.from({ length: 12 }, (_, idx) => idx + 1).map(
                        (h) => (
                          <option key={h} value={h}>
                            {h} {h === 1 ? 'Hora' : 'Horas'}
                          </option>
                        )
                      )}
                    </select>
                    <p className="text-[11px] text-slate-500">
                      Por cada hora se cobrará la tarifa base (
                      {formatCurrency(unitPricePerHour)}).
                    </p>
                  </div>
                </div>

                {/* Hora de Ingreso y Descuento Manual */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="rental-checkin-input"
                      className="block text-xs font-bold uppercase tracking-wider text-blue-950"
                    >
                      Hora de Ingreso (Check-in)
                    </label>
                    <div className="relative">
                      <input
                        id="rental-checkin-input"
                        type="time"
                        required
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        className="w-full h-11 px-3 rounded-sm border border-slate-300 bg-white text-sm font-semibold text-blue-950 tabular-nums focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none"
                      />
                    </div>
                    <p className="text-[11px] font-semibold text-sky-700 tabular-nums">
                      Devolución estimada: {estimatedReturnTime} hrs
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="rental-discount-input"
                      className="block text-xs font-bold uppercase tracking-wider text-blue-950"
                    >
                      Descuento Opcional Manual (CLP)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm font-semibold text-slate-400">
                        $
                      </span>
                      <input
                        id="rental-discount-input"
                        type="number"
                        min="0"
                        step="500"
                        value={discount}
                        onChange={(e) =>
                          setDiscount(
                            e.target.value === ''
                              ? 0
                              : Math.max(0, Number(e.target.value))
                          )
                        }
                        className="w-full h-11 pl-7 pr-3 rounded-sm border border-slate-300 bg-white text-sm font-semibold text-blue-950 tabular-nums focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloque Visual Destacado: Cálculo del Total */}
                <div className="p-4 bg-slate-50 border border-slate-300 border-l-4 border-l-pink-600 space-y-2 tabular-nums">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Subtotal ({formatCurrency(unitPricePerHour)} × {quantity}{' '}
                      un. × {hours} {hours === 1 ? 'hr' : 'hrs'})
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Descuento Manual</span>
                    <span className="font-semibold text-pink-600">
                      - {formatCurrency(validDiscount)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-300 flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-blue-950">
                      TOTAL A PAGAR
                    </span>
                    <span className="text-xl font-extrabold text-blue-950">
                      {formatCurrency(finalTotal)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* COLUMNA DERECHA: 2. DATOS DE QUIÉN ARRIENDA (CLIENTE) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                2. Datos de Quién Arrienda (Cliente y Respaldo)
              </h3>
              <span className="text-xs font-semibold text-pink-600">
                Verificación Obligatoria
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="rental-customer-name"
                  className="block text-xs font-bold uppercase tracking-wider text-blue-950"
                >
                  Nombre Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    id="rental-customer-name"
                    type="text"
                    required
                    placeholder="Ej: Lucas Méndez"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full h-11 pl-9 pr-3 rounded-sm border border-slate-300 bg-white text-sm text-blue-950 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="rental-customer-phone"
                  className="block text-xs font-bold uppercase tracking-wider text-blue-950"
                >
                  Teléfono *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    id="rental-customer-phone"
                    type="tel"
                    required
                    placeholder="+56 9 8765 4321"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-11 pl-9 pr-3 rounded-sm border border-slate-300 bg-white text-sm text-blue-950 tabular-nums focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="rental-customer-email"
                  className="block text-xs font-bold uppercase tracking-wider text-blue-950"
                >
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    id="rental-customer-email"
                    type="email"
                    placeholder="cliente@correo.cl"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full h-11 pl-9 pr-3 rounded-sm border border-slate-300 bg-white text-sm text-blue-950 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="rental-emergency-contact"
                  className="block text-xs font-bold uppercase tracking-wider text-blue-950"
                >
                  Contacto de Emergencia
                </label>
                <input
                  id="rental-emergency-contact"
                  type="text"
                  placeholder="Nombre y Teléfono de emergencia"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full h-11 px-3 rounded-sm border border-slate-300 bg-white text-sm text-blue-950 focus:border-blue-950 focus:ring-1 focus:ring-blue-950 outline-none"
                />
              </div>
            </div>

            {/* Foto de Carnet de Identidad (Requerida por seguridad) */}
            <div className="p-4 border border-slate-300 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="rental-id-photo"
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-950"
                >
                  <Camera className="w-4 h-4 text-pink-600" />
                  Foto de Carnet de Identidad *
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  Compresión Base64 (400px / 0.5)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label
                  htmlFor="rental-id-photo"
                  className="inline-flex items-center justify-center gap-2 h-11 px-4 border border-slate-300 bg-white hover:bg-sky-50 text-blue-950 text-xs font-bold uppercase tracking-wider cursor-pointer rounded-sm transition shrink-0"
                >
                  <Camera className="w-4 h-4 text-sky-600" />
                  {isCompressingPhoto
                    ? 'Procesando imagen...'
                    : idPhotoBase64
                    ? 'Cambiar Foto de Carnet'
                    : 'Subir / Tomar Foto de Carnet'}
                </label>
                <input
                  id="rental-id-photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />

                {idPhotoBase64 && (
                  <div className="flex items-center gap-3">
                    <img
                      src={idPhotoBase64}
                      alt="Vista previa Carnet de Identidad"
                      className="w-20 h-12 object-cover border border-slate-300 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setIdPhotoBase64('')}
                      className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs font-semibold text-red-600">
                ⚠️ Requerido por seguridad para evitar pérdida de equipamiento.
              </p>
            </div>

            {formError && (
              <div className="p-3 border border-red-600 bg-red-50 text-xs font-semibold text-red-700">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={enabledItems.length === 0 || isCompressingPhoto}
              className="w-full h-12 px-6 bg-blue-950 hover:bg-blue-900 disabled:bg-slate-400 border-b-2 border-pink-600 text-white text-sm font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 rounded-sm"
            >
              <Shield className="w-4 h-4 text-sky-400" />
              Registrar Arriendo ({formatCurrency(finalTotal)})
            </button>
          </div>
        </div>
      </form>

      {/* SECCIÓN B: PANEL DE ARRIENDOS ACTIVOS (MONITOR CON RELOJ AISLADO) */}
      <ActiveRentalsMonitor
        activeRentals={activeRentals}
        completedRentals={completedRentals}
        onCompleteRental={completeRental}
        onInspectPhoto={(rental) => setInspectedRental(rental)}
      />

      {/* MODAL PARA VER LA FOTO DE CARNET AMPLIADA */}
      {inspectedRental && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white border border-slate-300 rounded-none shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-blue-950 text-white flex items-center justify-between border-b-2 border-pink-600">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Respaldo de Seguridad · Carnet de Identidad
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectedRental(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 border border-slate-200">
                <div>
                  <span className="text-slate-400 uppercase block text-[10px]">
                    Cliente
                  </span>
                  <strong className="text-blue-950">
                    {inspectedRental.customerName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 uppercase block text-[10px]">
                    Teléfono
                  </span>
                  <strong className="text-blue-950 tabular-nums">
                    {inspectedRental.customerPhone}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 uppercase block text-[10px]">
                    Equipamiento
                  </span>
                  <strong className="text-blue-950">
                    {inspectedRental.quantity}x {inspectedRental.itemLabel}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 uppercase block text-[10px]">
                    Horario
                  </span>
                  <strong className="text-blue-950 tabular-nums">
                    {inspectedRental.checkInTime} -{' '}
                    {inspectedRental.estimatedReturnTime} hrs
                  </strong>
                </div>
              </div>

              {inspectedRental.idPhotoBase64 ? (
                <div className="border border-slate-300 bg-slate-100 p-2 flex items-center justify-center">
                  <img
                    src={inspectedRental.idPhotoBase64}
                    alt={`Carnet de ${inspectedRental.customerName}`}
                    className="max-h-80 w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 border border-slate-200">
                  Sin imagen disponible en este registro.
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectedRental(null)}
                  className="h-10 px-5 bg-blue-950 text-white text-xs font-bold uppercase tracking-wider cursor-pointer rounded-sm"
                >
                  Cerrar Vista Previa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
