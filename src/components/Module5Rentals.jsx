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
  AlertCircle,
} from 'lucide-react';
import { useSurfSchool } from '../context/SurfSchoolContext';
import {
  formatCurrency,
  addMinutesToTime,
  calculateRentalTotals,
  getMaxRentalHours,
  isRentalOverdue,
  PAYMENT_METHODS,
} from '../utils/calculations';
import { formatIsoToDisplayDate } from '../utils/dates';
import { compressImageFileToBase64 } from '../utils/imageUtils';

/**
 * Subcomponente para el Monitor de Arriendos Activos (reloj aislado)
 */
function ActiveRentalsMonitor({
  activeRentals,
  completedRentals,
  onCompleteRental,
  onInspectPhoto,
  currentHHMM,
  todayIso,
}) {

  return (
    <div className="space-y-8">
      {/* SECCIÓN B: MONITOR ACTIVO */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Clock aria-hidden="true" className="w-5 h-5 text-sky-700" />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Equipos en el agua
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm tabular-nums">
            <span className="text-base text-slate-700">
              {activeRentals.length} {activeRentals.length === 1 ? 'arriendo activo' : 'arriendos activos'}
            </span>
          </div>
        </div>

        {activeRentals.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600">
            No hay equipos afuera en este momento.
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {activeRentals.map((rental) => {
              const isOverdue = isRentalOverdue(rental, currentHHMM, todayIso);
              const isFromPreviousDay = rental.operationDate && rental.operationDate < todayIso;
              return (
                <li
                  key={rental.id}
                  className={`rounded-lg border p-4 space-y-3 ${
                    isOverdue ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-700">Entrega</div>
                      <div className={`figure text-3xl ${isOverdue ? 'text-rose-800' : 'text-blue-950'}`}>
                        {rental.estimatedReturnTime}
                      </div>
                      <div className="text-sm text-slate-700">
                        Salió {rental.checkInTime}
                        {isFromPreviousDay && ` del ${formatIsoToDisplayDate(rental.operationDate)}`}
                      </div>
                    </div>
                    {isOverdue ? (
                      <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-rose-700 text-white text-sm font-semibold">
                        <AlertTriangle aria-hidden="true" className="w-4 h-4" />
                        {isFromPreviousDay ? 'No devuelto' : 'Atrasado'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 h-9 rounded-md border border-emerald-400 bg-emerald-50 text-emerald-900 text-sm font-semibold">
                        En el agua
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-900 break-words">{rental.customerName}</div>
                    <div className="text-base text-slate-800">
                      {rental.quantity} × {rental.itemLabel} · {rental.hours} {rental.hours === 1 ? 'hora' : 'horas'}
                    </div>
                    <div className="text-base text-slate-700">{rental.customerPhone}</div>
                    {rental.emergencyContact && (
                      <div className="text-sm text-slate-700">Emergencia: {rental.emergencyContact}</div>
                    )}
                    <div className="text-sm text-slate-700 tabular-nums">
                      {formatCurrency(rental.finalTotal)} · {rental.paymentMethod}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onInspectPhoto(rental)}
                      className="inline-flex items-center justify-center gap-2 h-11 px-4 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-base font-semibold cursor-pointer"
                    >
                      <Eye aria-hidden="true" className="w-5 h-5 text-sky-700" />
                      Ver carnet
                    </button>
                    <button
                      type="button"
                      onClick={() => onCompleteRental(rental.id)}
                      className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 bg-blue-950 hover:bg-blue-900 text-white text-base font-semibold cursor-pointer"
                    >
                      <CheckCircle2 aria-hidden="true" className="w-5 h-5" />
                      Recibir equipo
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* HISTORIAL DE ARRIENDOS COMPLETADOS */}
      {completedRentals.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-lg font-bold tracking-tight text-blue-950">
                  Devueltos hoy ({completedRentals.length})
                </h3>
              </div>
            </div>
            <span className="text-sm text-slate-600">
              Hoy
            </span>
          </div>

          <div className="border border-slate-200 rounded-md overflow-x-auto" tabIndex={0} role="region" aria-label="Equipos devueltos hoy">
            <table className="w-full text-left border-collapse text-sm tabular-nums">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Equipamiento</th>
                  <th className="py-3 px-4">Horario (Salida → Devolución)</th>
                  <th className="py-3 px-4 text-right">Total Percibido</th>
                  <th className="py-3 px-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completedRentals.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-semibold text-blue-950">
                      {item.customerName}{' '}
                      <span className="text-slate-600 font-normal">
                        ({item.customerPhone})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {item.quantity}x {item.itemLabel} ({item.hours}h)
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.checkInTime} → {item.returnedAt || item.estimatedReturnTime} hrs
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-blue-950">
                      {formatCurrency(item.finalTotal)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-block px-2 py-0.5 bg-emerald-50 border border-emerald-300 text-sm font-semibold text-emerald-700">
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
    completedRentalsToday: completedRentals,
    rentalsTodayRevenue: rentalsTotalRevenue,
    addRental,
    completeRental,
    getIdPhotoUrl,
    schoolConfig,
    nowHHMM,
    todayIso,
    isDemoSession,
  } = useSurfSchool();
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [isSaving, setIsSaving] = useState(false);
  const [monitorError, setMonitorError] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);

  const enabledItems = useMemo(
    () => rentalRates.filter((item) => Boolean(item.enabled)),
    [rentalRates]
  );

  const [selectedItemId, setSelectedItemId] = useState(
    () => enabledItems[0]?.id || ''
  );
  const [quantity, setQuantity] = useState(1);
  const [hours, setHours] = useState(1);
  const [checkInTime, setCheckInTime] = useState(nowHHMM);
  const [discount, setDiscount] = useState(0);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [idPhotoBase64, setIdPhotoBase64] = useState('');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState(false);

  const [inspectedRental, setInspectedRental] = useState(null);

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

  const estimatedReturnTime = useMemo(
    () => addMinutesToTime(checkInTime, (Number(hours) || 1) * 60),
    [checkInTime, hours]
  );

  // Horas disponibles hasta el cierre de la escuela
  const maxHours = useMemo(
    () => getMaxRentalHours(checkInTime, schoolConfig.closeTime),
    [checkInTime, schoolConfig.closeTime]
  );
  useEffect(() => {
    if (maxHours >= 1 && hours > maxHours) setHours(maxHours);
  }, [maxHours, hours]);

  // URL del carnet: firmada (60 s) en modo real; se pide al abrir el modal
  useEffect(() => {
    let cancelled = false;
    setPhotoUrl(null);
    setPhotoError('');
    if (!inspectedRental) return undefined;
    setPhotoLoading(true);
    getIdPhotoUrl(inspectedRental)
      .then((url) => {
        if (cancelled) return;
        setPhotoUrl(url);
        if (!url) {
          setPhotoError(
            inspectedRental.idPhotoPurged
              ? 'La foto se eliminó el día siguiente a la devolución (política de privacidad).'
              : 'Este registro no tiene foto disponible.'
          );
        }
      })
      .catch(() => {
        if (!cancelled) setPhotoError('No se pudo obtener la imagen del carnet.');
      })
      .finally(() => {
        if (!cancelled) setPhotoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inspectedRental]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError('');
    setIsCompressingPhoto(true);
    try {
      const base64 = await compressImageFileToBase64(file, 800, 0.6);
      setIdPhotoBase64(base64);
    } catch {
      setFormError('No se pudo procesar la fotografía del Carnet de Identidad.');
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedRateItem) {
      setFormError('No hay equipamiento habilitado. Habilita al menos un ítem en Configuración.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setFormError('Completa el Nombre Completo y el Teléfono del cliente.');
      return;
    }
    if (!idPhotoBase64) {
      setFormError('Debes adjuntar la Foto del Carnet de Identidad antes de despachar el arriendo.');
      return;
    }

    setIsSaving(true);
    try {
      await addRental({
        itemId: selectedRateItem.id,
        quantity,
        hours,
        checkInTime,
        discount: validDiscount,
        paymentMethod,
        customerName,
        customerEmail,
        customerPhone,
        emergencyContact,
        photoDataUrl: idPhotoBase64,
      });
      setQuantity(1);
      setHours(1);
      setCheckInTime(nowHHMM);
      setDiscount(0);
      setPaymentMethod('Efectivo');
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setEmergencyContact('');
      setIdPhotoBase64('');
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3500);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteRental = async (rentalId) => {
    setMonitorError('');
    try {
      await completeRental(rentalId);
    } catch (err) {
      setMonitorError(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Cabecera del Módulo 05 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950 mt-1">
            Arriendos de equipo
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed mt-1">
            Registra cada salida con foto del carnet y revisa qué equipos siguen en el agua.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-4 py-2 bg-white border border-slate-200 tabular-nums">
            <span className="block text-sm font-bold text-slate-600">
              En Curso / Devueltos
            </span>
            <span className="text-sm font-bold text-blue-950">
              {activeRentals.length} activos · {completedRentals.length} devueltos
            </span>
          </div>
          <div className="px-4 py-2 bg-blue-950 text-white border-t-2 border-sky-400 tabular-nums">
            <span className="block text-sm font-bold text-sky-400">
              Caja Arriendos Hoy
            </span>
            <span className="text-base font-bold">
              {formatCurrency(rentalsTotalRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* Banner de confirmación */}
      {successMessage && (
        <div role="status" className="p-4 bg-emerald-50 border border-emerald-300 border-l-4 border-l-emerald-600 flex items-center justify-between text-sm font-semibold text-blue-950">
          <div className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Arriendo registrado exitosamente y agregado al monitor de arriendos en curso.
            </span>
          </div>
        </div>
      )}

      {/* SECCIÓN A: REGISTRO DE ARRIENDOS (INGRESO) */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Shield aria-hidden="true" className="w-5 h-5 text-sky-700" />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Nuevo arriendo
              </h2>
            </div>
          </div>
          <span className="text-sm text-slate-600">
            Atención {schoolConfig.openTime}–{schoolConfig.closeTime}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* COLUMNA IZQUIERDA: 1. DATOS DE ARRIENDO */}
          <div className="lg:col-span-6 space-y-5">
            <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-sky-700">
                Equipo y horario
              </span>
            </div>

            {enabledItems.length === 0 ? (
              <div className="p-4 border border-rose-300 bg-rose-50 text-sm font-semibold text-rose-700">
                Todos los ítems de arriendo están deshabilitados en Configuración.
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="rental-item-select"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Equipamiento
                  </label>
                  <select
                    id="rental-item-select"
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:border-blue-950"
                  >
                    {enabledItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label} — {formatCurrency(item.pricePerHour)} / hora
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="rental-quantity-input"
                      className="block text-sm font-semibold text-slate-700"
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
                      className="w-full h-11 px-3 border border-slate-200 bg-white text-sm font-medium text-slate-800 tabular-nums focus:border-blue-950"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="rental-hours-select"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Horas (máx. {Math.max(0, maxHours)} hasta el cierre)
                    </label>
                    <select
                      id="rental-hours-select"
                      value={hours}
                      onChange={(e) => setHours(Number(e.target.value) || 1)}
                      className="w-full h-11 px-3 border border-slate-200 bg-white text-sm font-medium text-slate-800 tabular-nums focus:border-blue-950"
                    >
                      {Array.from({ length: Math.max(1, maxHours) }, (_, idx) => idx + 1).map(
                        (h) => (
                          <option key={h} value={h}>
                            {h} {h === 1 ? 'Hora' : 'Horas'}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="rental-checkin-input"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Hora de Salida (Check-in)
                    </label>
                    <input
                      id="rental-checkin-input"
                      type="time"
                      required
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      className="w-full h-11 px-3 border border-slate-200 bg-white text-sm font-medium text-slate-800 tabular-nums focus:border-blue-950"
                    />
                    <p className={`text-sm font-medium tabular-nums ${maxHours < 1 ? 'text-rose-700' : 'text-sky-700'}`}>
                      {maxHours < 1
                        ? `Sin horas disponibles antes del cierre (${schoolConfig.closeTime}).`
                        : `Devolución estimada: ${estimatedReturnTime} hrs`}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="rental-discount-input"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Descuento Manual (CLP)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm font-medium text-slate-600 select-none">
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
                        className="w-full h-11 pl-7 pr-3 border border-slate-200 bg-white text-sm font-medium text-slate-800 tabular-nums focus:border-blue-950"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-sm font-semibold text-slate-700">Medio de Pago</span>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`h-11 border text-sm font-semibold cursor-pointer ${
                          paymentMethod === m
                            ? 'bg-blue-950 text-white border-blue-950'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 border-l-4 border-l-sky-500 space-y-2 tabular-nums">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>
                      Subtotal ({formatCurrency(unitPricePerHour)} × {quantity}{' '}
                      un. × {hours} {hours === 1 ? 'hr' : 'hrs'})
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Descuento Manual</span>
                    <span className="font-semibold text-sky-700">
                      - {formatCurrency(validDiscount)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-950">
                      Total a cobrar
                    </span>
                    <span className="text-xl font-bold text-blue-950">
                      {formatCurrency(finalTotal)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* COLUMNA DERECHA: 2. CLIENTE Y CARNET */}
          <div className="lg:col-span-6 space-y-4">
            <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-sky-700">
                Cliente y carnet
              </span>
              <span className="text-sm font-semibold text-slate-600">
                Obligatorio
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="rental-customer-name"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Nombre Completo *
                </label>
                <div className="relative">
                  <User aria-hidden="true" className="w-4 h-4 text-slate-600 absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    id="rental-customer-name"
                    type="text"
                    required
                    placeholder="Ej: Lucas Méndez"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full h-11 pl-9 pr-3 border border-slate-200 bg-white text-sm text-slate-800 focus:border-blue-950"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="rental-customer-phone"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Teléfono *
                </label>
                <div className="relative">
                  <Phone aria-hidden="true" className="w-4 h-4 text-slate-600 absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    id="rental-customer-phone"
                    type="tel"
                      inputMode="tel"
                      autoComplete="off"
                    required
                    placeholder="+56 9 8765 4321"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-11 pl-9 pr-3 border border-slate-200 bg-white text-sm text-slate-800 tabular-nums focus:border-blue-950"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="rental-customer-email"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail aria-hidden="true" className="w-4 h-4 text-slate-600 absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    id="rental-customer-email"
                    type="email"
                      spellCheck={false}
                      autoComplete="off"
                    placeholder="cliente@correo.cl"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full h-11 pl-9 pr-3 border border-slate-200 bg-white text-sm text-slate-800 focus:border-blue-950"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="rental-emergency-contact"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Contacto de Emergencia
                </label>
                <input
                  id="rental-emergency-contact"
                  type="text"
                  placeholder="Nombre y teléfono"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 bg-white text-sm text-slate-800 focus:border-blue-950"
                />
              </div>
            </div>

            {/* Foto Carnet */}
            <div className="p-4 border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="rental-id-photo"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-700"
                >
                  <Camera aria-hidden="true" className="w-4 h-4 text-sky-700" />
                  Foto de Carnet de Identidad *
                </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label
                  htmlFor="rental-id-photo"
                  className="inline-flex items-center justify-center gap-2 h-11 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-blue-950 text-sm font-semibold cursor-pointer transition shrink-0"
                >
                  <Camera aria-hidden="true" className="w-4 h-4 text-sky-700" />
                  {isCompressingPhoto
                    ? 'Procesando foto…'
                    : idPhotoBase64
                    ? 'Cambiar Fotografía'
                    : 'Subir / Capturar Carnet'}
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
                      className="w-20 h-12 object-cover border border-slate-200 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setIdPhotoBase64('')}
                      className="text-sm font-semibold text-rose-600 hover:underline cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                )}
              </div>

              <p className="text-sm text-slate-600">
                {isDemoSession
                  ? 'Modo demo: la foto queda guardada solo en este navegador. No uses documentos reales.'
                  : 'La foto se guarda en un bucket privado, solo se ve con un enlace temporal de 60 segundos y se elimina el día siguiente a la devolución.'}
              </p>
            </div>

            {formError && (
              <div role="alert" className="p-3 border border-rose-300 bg-rose-50 text-sm font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={enabledItems.length === 0 || isCompressingPhoto || isSaving || maxHours < 1}
              className="w-full h-12 bg-blue-950 hover:bg-sky-700 disabled:bg-slate-400 text-white text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Shield aria-hidden="true" className="w-4 h-4 text-sky-400" />
              {isSaving ? 'Registrando…' : `Registrar Arriendo (${formatCurrency(finalTotal)})`}
            </button>
          </div>
        </div>
      </form>

      {/* SECCIÓN B: MONITOR ACTIVO */}
      {monitorError && (
        <div role="alert" className="p-3 border border-rose-300 bg-rose-50 text-sm text-rose-800">{monitorError}</div>
      )}
      <ActiveRentalsMonitor
        activeRentals={activeRentals}
        completedRentals={completedRentals}
        onCompleteRental={handleCompleteRental}
        onInspectPhoto={(rental) => setInspectedRental(rental)}
        currentHHMM={nowHHMM}
        todayIso={todayIso}
      />

      {/* MODAL DE INSPECCIÓN DE CARNET */}
      {inspectedRental && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          style={{ overscrollBehavior: 'contain' }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setInspectedRental(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setInspectedRental(null);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="Carnet en garantía" className="max-w-lg w-full bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-blue-950 text-white flex items-center justify-between border-b-2 border-sky-400">
              <div className="flex items-center gap-2">
                <Shield aria-hidden="true" className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-bold">
                  Respaldo Carnet de Identidad
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectedRental(null)}
                aria-label="Cerrar"
                className="w-11 h-11 inline-flex items-center justify-center text-slate-200 hover:text-white cursor-pointer"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-3 border border-slate-200">
                <div>
                  <span className="text-slate-600 block text-sm">
                    Cliente
                  </span>
                  <strong className="text-blue-950">
                    {inspectedRental.customerName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-600 block text-sm">
                    Teléfono
                  </span>
                  <strong className="text-blue-950 tabular-nums">
                    {inspectedRental.customerPhone}
                  </strong>
                </div>
                <div>
                  <strong className="text-blue-950">
                    {inspectedRental.quantity}x {inspectedRental.itemLabel}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-600 block text-sm">
                    Horario
                  </span>
                  <strong className="text-blue-950 tabular-nums">
                    {inspectedRental.checkInTime} - {inspectedRental.estimatedReturnTime} hrs
                  </strong>
                </div>
              </div>

              {photoUrl ? (
                <div className="border border-slate-200 bg-slate-50 p-2 flex items-center justify-center">
                  <img
                    src={photoUrl}
                    alt={`Carnet de ${inspectedRental.customerName}`}
                    className="max-h-80 w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-slate-600 border border-slate-200">
                  {photoLoading ? 'Cargando imagen…' : photoError}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectedRental(null)}
                  className="h-11 px-4 bg-blue-950 hover:bg-sky-700 text-white text-sm font-semibold cursor-pointer transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
